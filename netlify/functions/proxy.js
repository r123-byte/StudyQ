export default async (req, context) => {
  const url = new URL(req.url);

  // ── CORS headers ──────────────────────────────────────────────
  // IMPORTANT: replace this with your actual GitHub Pages URL later.
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

  const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const path = url.searchParams.get("path") || "";

  // ── Route: ?path=openrouter/* → openrouter.ai/api/v1/* ────────
  if (path.startsWith("openrouter/")) {
    const target = "https://openrouter.ai/api/v1/" +
      path.replace("openrouter/", "");

    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": ALLOWED_ORIGIN,
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

  // ── Route: ?path=groq/* → api.groq.com/openai/v1/* ────────────
  if (path.startsWith("groq/")) {
    const target = "https://api.groq.com/openai/v1/" +
      path.replace("groq/", "");

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

  // Health check
  return new Response(
    JSON.stringify({ status: "ok", message: "StudyStack proxy is running." }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
};
