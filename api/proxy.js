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

  // ── Route: OpenRouter chat completions ───────────────────
  if (path === "openrouter/chat/completions") {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: { message: "Method not allowed." } }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (!process.env.OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ error: { message: "OpenRouter API key is not configured." } }), {
        status: 503,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    let body;
    try { body = await req.json(); }
    catch {
      return new Response(JSON.stringify({ error: { message: "Invalid JSON request." } }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (body?.model !== "dots-studio/dots-3-note-preview:free" || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: { message: "This proxy only allows the configured free model." } }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://studyq-nu.vercel.app",
        "X-Title": "StudyQ Practice Test"
      },
      body: JSON.stringify(body)
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

  return new Response(
    JSON.stringify({ status: "ok", message: "StudyStack Vercel proxy is running." }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}
