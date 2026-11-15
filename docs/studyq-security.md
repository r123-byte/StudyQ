# StudyQ security architecture and deployment controls

## Implemented in this repository

- AI provider credentials are referenced only through server environment variables in `/api/proxy`.
- `/api/proxy` now accepts only exact chat, audio transcription, and OpenRouter grading route identifiers; rejects duplicate/unexpected query parameters and unsupported methods; validates JSON schemas/model IDs; limits JSON and audio sizes; applies a 55-second upstream timeout; blocks redirects; caps upstream response bodies; uses generic upstream errors; and does not forward provider error bodies.
- CORS no longer defaults to `*`. It uses `ALLOWED_ORIGIN` (comma-separated exact origins) or production `https://studyq-nu.vercel.app` when unset. Configure exact required staging origins in deployment settings.
- Contact form submits directly to Web3Forms. Its access key is a public client-side identifier by design; it is not an API secret.
- Vercel config adds baseline security headers and CSP Report-Only to observe compatibility before enforcement.

## Manual Vercel configuration required

1. Set `ALLOWED_ORIGIN` to the exact production origin and any explicitly needed staging origins. Do not use `*`.
3. Configure Vercel Firewall/WAF rate limits for `/api/proxy`, with per-IP limits and separate stricter rules for AI/audio routes. The code has no durable shared rate-limit store; in-memory limits would not be reliable across serverless instances. Verify 429 behavior after configuring the firewall.
4. Review CSP Report-Only violations across all routes before considering enforcement. Policy currently permits inline scripts/styles because the site uses them; do not enable enforcement until all pages/tools are tested and hashes/nonces or a compatible policy are planned.
5. Verify HTTPS and HSTS behavior for production and any custom domains. HSTS is configured with a one-year max-age and intentionally does not include subdomains.
6. Configure log access/retention and ensure request bodies are not captured.

## Unresolved security work

- Durable rate limiting/abuse controls are infrastructure-dependent and not implemented in source.
- Calendar import needs HTTPS URL validation, timeout and response-size limits in browser; do not add a general fetch proxy.
- Full taint analysis of `innerHTML` sinks remains required. Never render AI/calendar/user content without escaping or safe DOM construction.
- Contact form should add low-friction spam controls and rate limits; no CAPTCHA introduced.
- Full dependency/SRI review requires dependency/version inventory and browser testing.
- CSP remains report-only, not an enforced security boundary.

## Vercel Firewall rule status from user screenshot

The screenshot shows a draft rule form with Request Path `Equals /api/proxy`, Fixed Window `60 seconds`, `10` requests, key `IP Address`, and `Too Many Requests (429)`. It is still displayed as **New Rule**; adding/reviewing/publishing is not evidenced. Do not treat it as active until published and verified in Firewall Rules/traffic. If enabled, this rule limits all AI routes sharing `/api/proxy` together, rather than applying separate chat/audio/grading budgets.

## Calendar import update

The browser importer now accepts HTTPS (and converts `webcal:` to HTTPS for fetching), rejects credentials, localhost/local/internal names, nonstandard ports, IPv6 literals, and common private/reserved IPv4 ranges; it omits credentials, rejects redirects, checks a 12-second timeout, validates plausible calendar content types, and caps the response at 2 MiB. Uploaded `.ics` files are capped at 5 MiB. Because this remains a browser fetch, hostname DNS resolution to private addresses cannot be reliably screened by page code; no backend fetch proxy was added. Some calendar services that redirect or omit CORS access may no longer import; verify representative providers in browser.

## User data controls update

The privacy page offers a confirmation-based limited study-data clear and an all StudyQ key clear. The full clear only removes keys beginning `StudyQ-` from this origin's localStorage/sessionStorage. The limited clear removes the enumerated study keys and retains preferences. Local mock tests cover cancellation, scope, and preservation of unrelated keys.

## Analytics loading

Umami loads automatically through `/stats/script.js` on pages configured for analytics. Query strings and URL fragments are excluded and Do Not Track is enabled in the script attributes. Production network behavior and Umami account settings still require verification.
