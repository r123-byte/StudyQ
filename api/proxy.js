export const config = { runtime: 'edge' };

const MAX_JSON_BYTES = 120_000;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const MAX_OUTPUT_TOKENS = 8192;
const CHAT_MODELS = new Set(['openai/gpt-oss-120b']);
const GRADING_MODEL = 'liquid/lfm-3-1.7b:free';
const CHAT_PATH = 'groq/chat/completions';
const AUDIO_PATH = 'groq/audio/transcriptions';
const OPENROUTER_PATH = 'openrouter/chat/completions';
const RATE_WINDOW_MS = 60 * 60 * 1000;
const FEATURE_LIMITS = {
  planner: { env: 'STUDYQ_AI_PLANNER_LIMIT_PER_HOUR', fallback: 20 },
  transcription: { env: 'STUDYQ_VOICE_LIMIT_PER_HOUR', fallback: 10 },
  grading: { env: 'STUDYQ_GRADING_LIMIT_PER_HOUR', fallback: 30 }
};

const RESERVE_RATE_SCRIPT = `
local now = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local member = ARGV[3]
local window = tonumber(ARGV[4])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now)
if redis.call('ZSCORE', KEYS[2], member) then return {2, 0, now} end
local count = redis.call('ZCARD', KEYS[1]) + redis.call('ZCARD', KEYS[2])
if count >= limit then
  local success = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  local pending = redis.call('ZRANGE', KEYS[2], 0, 0, 'WITHSCORES')
  local reset = now + window
  if success[2] then reset = tonumber(success[2]) + window end
  if pending[2] and tonumber(pending[2]) < reset then reset = tonumber(pending[2]) end
  return {0, 0, reset}
end
redis.call('ZADD', KEYS[2], now + window, member)
redis.call('PEXPIRE', KEYS[1], window + 60000)
redis.call('PEXPIRE', KEYS[2], window + 60000)
return {1, limit - count - 1, now + window}
`;

const COMPLETE_RATE_SCRIPT = `
local now = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local member = ARGV[3]
local window = tonumber(ARGV[4])
redis.call('ZREM', KEYS[2], member)
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now)
redis.call('ZADD', KEYS[1], now, member)
redis.call('PEXPIRE', KEYS[1], window + 60000)
redis.call('PEXPIRE', KEYS[2], window + 60000)
local count = redis.call('ZCARD', KEYS[1]) + redis.call('ZCARD', KEYS[2])
local first = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
local pending = redis.call('ZRANGE', KEYS[2], 0, 0, 'WITHSCORES')
local reset = now + window
if first[2] then reset = tonumber(first[2]) + window end
if pending[2] and tonumber(pending[2]) < reset then reset = tonumber(pending[2]) end
return {math.max(0, limit - count), reset}
`;

const RELEASE_RATE_SCRIPT = `
local now = tonumber(ARGV[1])
local member = ARGV[2]
local window = tonumber(ARGV[3])
redis.call('ZREM', KEYS[2], member)
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now)
return {redis.call('ZCARD', KEYS[1]) + redis.call('ZCARD', KEYS[2])}
`;

function json(data, status, cors = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors }
  });
}

function allowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGIN || 'https://studyq-nu.vercel.app')
    .split(',').map(value => value.trim()).filter(Boolean);
  return new Set(configured);
}

function corsFor(request) {
  const origin = request.headers.get('origin');
  if (!origin) return {};
  if (!allowedOrigins().has(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function fail(status, code, cors) {
  return json({ error: { code } }, status, cors || {});
}

function rateLimitConfig(feature) {
  // Vercel's Upstash integration exposes KV_REST_API_* names. Prefer the
  // explicit names when present, otherwise use that integration's REST pair.
  const hasExplicitUpstashConfig = Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_TOKEN);
  const url = hasExplicitUpstashConfig ? process.env.UPSTASH_REDIS_REST_URL : process.env.KV_REST_API_URL;
  const token = hasExplicitUpstashConfig ? process.env.UPSTASH_REDIS_REST_TOKEN : process.env.KV_REST_API_TOKEN;
  const secret = process.env.STUDYQ_RATE_LIMIT_HMAC_SECRET;
  const limitSetting = FEATURE_LIMITS[feature];
  if (!url || !token || !secret || secret.length < 32 || !limitSetting) return null;
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
  const configuredLimit = process.env[limitSetting.env];
  const limit = configuredLimit === undefined || configuredLimit === '' ? limitSetting.fallback : Number(configuredLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) return null;
  return { url: url.replace(/\/$/, ''), token, secret, limit };
}

function publicClientIp(request) {
  const value = request.headers.get('x-forwarded-for') || '';
  // Vercel documents that it overwrites x-forwarded-for with the public IP.
  const ip = value.split(',')[0].trim();
  return ip && ip.length <= 64 && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : '';
}

async function hmacDigest(secret, value) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function rateLimitEval(config, script, keys, args) {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['EVAL', script, String(keys.length), ...keys, ...args.map(String)]),
    signal: AbortSignal.timeout(3000),
    redirect: 'error'
  });
  if (!response.ok) throw new Error('RATE_LIMIT_STORE_UNAVAILABLE');
  const payload = await response.json();
  if (payload.error || !Array.isArray(payload.result)) throw new Error('RATE_LIMIT_STORE_UNAVAILABLE');
  return payload.result;
}

async function withFeatureRateLimit(request, feature, operation, cors) {
  const config = rateLimitConfig(feature);
  const ip = publicClientIp(request);
  if (!config || !ip) return fail(503, 'RATE_LIMIT_SERVICE_UNAVAILABLE', cors);
  let digest;
  try { digest = await hmacDigest(config.secret, `${feature}\n${ip}`); }
  catch { return fail(503, 'RATE_LIMIT_SERVICE_UNAVAILABLE', cors); }
  // Redis Cluster-compatible hash tag keeps the two Lua keys in one slot.
  const base = `studyq:ai:${feature}:v1:{${digest}}`;
  const keys = [`${base}:success`, `${base}:pending`];
  const id = crypto.randomUUID();
  const now = Date.now();
  let reservation;
  try {
    reservation = await rateLimitEval(config, RESERVE_RATE_SCRIPT, keys, [now, config.limit, id, RATE_WINDOW_MS]);
  } catch {
    return fail(503, 'RATE_LIMIT_SERVICE_UNAVAILABLE', cors);
  }
  if (Number(reservation[0]) !== 1) {
    const resetAt = Number(reservation[2]) || now + RATE_WINDOW_MS;
    return json({ error: { code: 'FEATURE_RATE_LIMIT', feature } }, 429, {
      ...(cors || {}),
      'Retry-After': String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))),
      'X-RateLimit-Limit': String(config.limit),
      'X-RateLimit-Remaining': '0',
      'Cache-Control': 'no-store'
    });
  }

  let response;
  try { response = await operation(); }
  catch { response = fail(502, 'UPSTREAM_UNAVAILABLE', cors); }

  if (!response.ok) {
    await rateLimitEval(config, RELEASE_RATE_SCRIPT, keys, [Date.now(), id, RATE_WINDOW_MS]).catch(() => {});
    return response;
  }
  try {
    const [remaining] = await rateLimitEval(config, COMPLETE_RATE_SCRIPT, keys, [Date.now(), config.limit, id, RATE_WINDOW_MS]);
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Limit', String(config.limit));
    headers.set('X-RateLimit-Remaining', String(remaining));
    headers.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch {
    // Leave the atomic reservation in Redis for the whole window. The upstream
    // succeeded, so expiring it early could grant an uncounted retry.
    return json({ error: { code: 'RATE_LIMIT_SERVICE_UNAVAILABLE' } }, 503, {
      ...(cors || {}), 'Retry-After': String(Math.ceil(RATE_WINDOW_MS / 1000)),
      'X-RateLimit-Limit': String(config.limit), 'X-RateLimit-Remaining': '0'
    });
  }
}

function validMessages(messages, maxMessages = 24, maxChars = 90_000) {
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > maxMessages) return false;
  let total = 0;
  for (const message of messages) {
    if (!message || typeof message !== 'object' || Array.isArray(message)) return false;
    if (!['system', 'user', 'assistant'].includes(message.role)) return false;
    if (typeof message.content !== 'string' || !message.content.trim() || message.content.length > 60_000) return false;
    total += message.content.length;
    if (total > maxChars) return false;
    for (const key of Object.keys(message)) if (!['role', 'content'].includes(key)) return false;
  }
  return true;
}

async function readJsonBody(request, cors) {
  const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') return { response: fail(415, 'UNSUPPORTED_MEDIA_TYPE', cors) };
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_JSON_BYTES) return { response: fail(413, 'REQUEST_TOO_LARGE', cors) };
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) return { response: fail(413, 'REQUEST_TOO_LARGE', cors) };
  let body;
  try { body = JSON.parse(text); } catch { return { response: fail(400, 'INVALID_JSON', cors) }; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { response: fail(400, 'INVALID_BODY', cors) };
  return { body };
}

function validateChat(body, grading = false) {
  const allowed = grading
    ? new Set(['model', 'messages', 'max_tokens', 'temperature'])
    : new Set(['model', 'messages', 'stream', 'max_tokens', 'max_completion_tokens', 'reasoning_effort', 'response_format']);
  if (Object.keys(body).some(key => !allowed.has(key))) return false;
  if (!validMessages(body.messages, grading ? 4 : 24, grading ? 45_000 : 90_000)) return false;
  if (grading) {
    if (body.model !== GRADING_MODEL) return false;
    if (!Number.isInteger(body.max_tokens) || body.max_tokens < 1 || body.max_tokens > 2400) return false;
    if (typeof body.temperature !== 'number' || body.temperature < 0 || body.temperature > 1) return false;
  } else {
    if (!CHAT_MODELS.has(body.model)) return false;
    if (body.stream !== undefined && typeof body.stream !== 'boolean') return false;
    if (body.reasoning_effort !== undefined && !['low', 'medium', 'high'].includes(body.reasoning_effort)) return false;
    const tokens = body.max_tokens ?? body.max_completion_tokens;
    if (tokens !== undefined && (!Number.isInteger(tokens) || tokens < 1 || tokens > MAX_OUTPUT_TOKENS)) return false;
    if (body.max_tokens !== undefined && body.max_completion_tokens !== undefined) return false;
    if (body.response_format !== undefined && (body.response_format?.type !== 'json_object' || Object.keys(body.response_format).some(k => k !== 'type'))) return false;
  }
  return true;
}

async function boundedFetch(url, init, cors) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const upstream = await fetch(url, { ...init, signal: controller.signal, redirect: 'error' });
    const headers = new Headers(cors || {});
    const contentType = upstream.headers.get('content-type') || 'application/json';
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'no-store');
    for (const name of ['retry-after', 'x-ratelimit-limit-requests', 'x-ratelimit-limit-tokens', 'x-ratelimit-remaining-requests', 'x-ratelimit-remaining-tokens', 'x-ratelimit-reset-requests', 'x-ratelimit-reset-tokens']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (!upstream.ok) {
      try { await upstream.body?.cancel(); } catch {}
      const status = upstream.status === 429 ? 429 : upstream.status >= 500 ? 502 : upstream.status;
      return json({ error: { code: status === 429 ? 'UPSTREAM_RATE_LIMIT' : 'UPSTREAM_REQUEST_FAILED' } }, status, Object.fromEntries(headers));
    }
    if (!upstream.body) return json({ error: { code: 'EMPTY_UPSTREAM_RESPONSE' } }, 502, Object.fromEntries(headers));
    const reader = upstream.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) {
        await reader.cancel();
        return json({ error: { code: 'UPSTREAM_RESPONSE_TOO_LARGE' } }, 502, Object.fromEntries(headers));
      }
      chunks.push(value);
    }
    const output = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(output, { status: upstream.status, headers });
  } catch (error) {
    return json({ error: { code: error?.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE' } }, error?.name === 'AbortError' ? 504 : 502, cors || {});
  } finally { clearTimeout(timeout); }
}

function validateAudioForm(form) {
  const allowedFields = new Set(['file', 'model', 'response_format', 'temperature', 'language', 'prompt']);
  for (const key of form.keys()) if (!allowedFields.has(key)) return null;
  const file = form.get('file');
  const model = form.get('model');
  const responseFormat = form.get('response_format');
  const language = form.get('language');
  const temperature = form.get('temperature');
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_AUDIO_BYTES) return null;
  if (!['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-wav'].includes(file.type)) return null;
  if (model !== 'whisper-large-v3' || responseFormat !== 'json' || !['en', 'nl'].includes(language) || temperature !== '0') return null;
  const prompt = form.get('prompt');
  if (prompt !== null && (typeof prompt !== 'string' || prompt.length > 1000)) return null;
  return { file, model, responseFormat, language, temperature, prompt };
}

export default async function handler(req) {
  const cors = corsFor(req);
  if (cors === null) return fail(403, 'ORIGIN_NOT_ALLOWED');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors || {} });
  if (req.method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', cors);

  const url = new URL(req.url);
  if ([...url.searchParams.keys()].some(key => key !== 'path') || url.searchParams.getAll('path').length !== 1) return fail(400, 'INVALID_QUERY', cors);
  const path = url.searchParams.get('path');

  if (path === CHAT_PATH || path === OPENROUTER_PATH) {
    const parsed = await readJsonBody(req, cors);
    if (parsed.response) return parsed.response;
    const grading = path === OPENROUTER_PATH;
    if (!validateChat(parsed.body, grading)) return fail(400, 'INVALID_REQUEST', cors);
    if (grading) {
      if (!process.env.OPENROUTER_API_KEY) return fail(503, 'SERVICE_UNAVAILABLE', cors);
      parsed.body.model = GRADING_MODEL;
      return withFeatureRateLimit(req, 'grading', () => boundedFetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }, body: JSON.stringify(parsed.body)
      }, cors), cors);
    }
    if (!process.env.GROQ_API_KEY) return fail(503, 'SERVICE_UNAVAILABLE', cors);
    return withFeatureRateLimit(req, 'planner', () => boundedFetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify(parsed.body)
    }, cors), cors);
  }

  if (path === AUDIO_PATH) {
    const type = (req.headers.get('content-type') || '').toLowerCase();
    if (!type.startsWith('multipart/form-data;')) return fail(415, 'UNSUPPORTED_MEDIA_TYPE', cors);
    const declared = Number(req.headers.get('content-length') || 0);
    if (declared > MAX_AUDIO_BYTES + 32_000) return fail(413, 'REQUEST_TOO_LARGE', cors);
    let form;
    try { form = await req.formData(); } catch { return fail(400, 'INVALID_FORM', cors); }
    const audio = validateAudioForm(form);
    if (!audio) return fail(400, 'INVALID_AUDIO_REQUEST', cors);
    if (!process.env.GROQ_API_KEY) return fail(503, 'SERVICE_UNAVAILABLE', cors);
    const upstreamForm = new FormData();
    upstreamForm.append('file', audio.file, audio.file.name || 'voice.webm');
    upstreamForm.append('model', audio.model);
    upstreamForm.append('response_format', audio.responseFormat);
    upstreamForm.append('temperature', audio.temperature);
    upstreamForm.append('language', audio.language);
    if (audio.prompt) upstreamForm.append('prompt', audio.prompt);
    return withFeatureRateLimit(req, 'transcription', () => boundedFetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: upstreamForm
    }, cors), cors);
  }

  return fail(404, 'NOT_FOUND', cors);
}
