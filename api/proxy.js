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

  // ── Route: ?path=openrouter/* ────────────
  if (path.startsWith("openrouter/")) {
    const target = "https://openrouter.ai/api/v1/" + path.replace("openrouter/", "");

    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": corsOrigin,
        "X-Title": "StudyStack"
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

  // ── Route: ?path=groq/* ────────────
  if (path.startsWith("groq/")) {
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