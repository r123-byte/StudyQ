export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  
  // Get the origin of the incoming request
  const requestOrigin = req.headers.get("origin") || "";
  
  // Read allowed origins from Vercel environment variables
  const allowedOriginsStr = process.env.ALLOWED_ORIGIN || "*";
  const allowedOrigins = allowedOriginsStr.split(",").map(o => o.trim());
  
  // Determine if this origin is allowed
  let corsOrigin = "*";
  if (allowedOriginsStr !== "*") {
    if (allowedOrigins.includes(requestOrigin)) {
      corsOrigin = requestOrigin; 
    }
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const path = url.searchParams.get("path") || "";

  // Cloudflare's unified chat-completions API is used by third-party models
  // such as Particle-1 (which do not use the /ai/run/{@cf-model} route).
  if (path === "cloudflare/ai/v1/chat/completions") {
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
      return new Response(JSON.stringify({ error: { message: "Cloudflare Workers AI is not configured on the server." } }), {
        status: 503, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    const target = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`;
    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") || "application/json",
        "Authorization": `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
      },
      body: req.body
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json", ...corsHeaders }
    });
  }

  // ── Route: ?path=groq/* ────────────
  if (path.startsWith("groq/")) {
    if (!process.env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: { message: "Groq API key is not configured." } }), {
        status: 503,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    const target = "https://api.groq.com/openai/v1/" + path.replace("groq/", "");

    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") || "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: req.body
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        ...corsHeaders
      }
    });
  }

  // Cloudflare Workers AI route used by Practice Test. Credentials stay in Vercel.
  if (path.startsWith("cloudflare/ai/run/")) {
    const model = path.slice("cloudflare/ai/run/".length);
    if (!/^@cf\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(model)) {
      return new Response(JSON.stringify({ error: { message: "Invalid Cloudflare model path." } }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
      return new Response(JSON.stringify({ error: { message: "Cloudflare Workers AI is not configured on the server." } }), {
        status: 503, headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    const target = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;
    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") || "application/json",
        "Authorization": `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
      },
      body: req.body
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json", ...corsHeaders }
    });
  }

  return new Response(
    JSON.stringify({ status: "ok", message: "StudyStack Vercel proxy is running." }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}
