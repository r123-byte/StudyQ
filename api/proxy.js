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
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "Retry-After, X-RateLimit-Limit-Requests, X-RateLimit-Limit-Tokens, X-RateLimit-Remaining-Requests, X-RateLimit-Remaining-Tokens, X-RateLimit-Reset-Requests, X-RateLimit-Reset-Tokens"
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const path = url.searchParams.get("path") || "";

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

    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set("Content-Type", upstream.headers.get("Content-Type") || "application/json");
    ["retry-after", "x-ratelimit-limit-requests", "x-ratelimit-limit-tokens", "x-ratelimit-remaining-requests", "x-ratelimit-remaining-tokens", "x-ratelimit-reset-requests", "x-ratelimit-reset-tokens"].forEach(name => {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders
    });
  }

  return new Response(
    JSON.stringify({ status: "ok", message: "StudyStack Vercel proxy is running." }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}
