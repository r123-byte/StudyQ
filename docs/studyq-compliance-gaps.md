# StudyQ compliance and remediation gaps

Status vocabulary: FIXED means implemented and verified by a relevant test; PARTIALLY FIXED means code is improved but needs further validation; REQUIRES MANUAL CONFIGURATION, REQUIRES LEGAL REVIEW, UNRESOLVED, NOT APPLICABLE.

| Finding | Status | Follow-up |
|---|---|---|
| Open Groq proxy accepted broad paths | PARTIALLY FIXED | Exact endpoints and schemas are now constrained; run deployed integration tests and configure durable rate limits. |
| Wildcard CORS default | PARTIALLY FIXED | Source default is exact production origin; set `ALLOWED_ORIGIN` for actual deployment/staging domains and test. |
| Durable per-IP/route rate limits | REQUIRES MANUAL CONFIGURATION | Configure Vercel Firewall/WAF on AI and contact routes; verify 429. |
| Proxy request validation/timeouts/response cap | PARTIALLY FIXED | Source protections added; audio body limit without Content-Length still relies on platform request limits; integration test streaming and upstream formats. |
| OpenRouter arbitrary model/route | PARTIALLY FIXED | Exact route/model validated; test grading through deployment. |
| Web3Forms public access key | NOT A SECRET | Web3Forms access keys are public client-side identifiers by design; do not store or document them as secrets. Apply spam controls through provider settings/WAF as appropriate. |
| Contact spam protection | REQUIRES MANUAL CONFIGURATION | Add WAF rate limits; consider honeypot after usability review. |
| Security headers | PARTIALLY FIXED | Baseline headers and CSP Report-Only added; verify delivery and CSP reports on all pages. |
| Calendar HTTPS/response limits/timeouts | UNRESOLVED | Add client URL protocol validation, AbortController timeout, streamed response-size cap and safe calendar event rendering. |
| Dynamic HTML/XSS audit | UNRESOLVED | Complete sink-by-sink review and tests for planner, calendar, AI, vocab and PiP. |
| Analytics legal basis and transparency | REQUIRES LEGAL REVIEW | Confirm the applicable Dutch ePrivacy/GDPR requirements for the current automatic Umami configuration and provide any required user information or controls. |
| Provider region/retention/training/transfer terms | REQUIRES MANUAL CONFIGURATION | Retrieve current contracts/settings from Vercel, Groq, OpenRouter, Web3Forms and Umami. |
| Controller legal identity/address | REQUIRES LEGAL REVIEW | Owner must confirm legal identity and any required contact/address particulars. |
| Feature-by-feature lawful basis and children safeguards | REQUIRES LEGAL REVIEW | Document purposes, bases, legitimate interest assessments, child-facing language and whether DPIA screening is needed. |
| Storage clear-all/export controls | UNRESOLVED | Add user-visible inventory/control after validating all current keys and migration impacts. Never clear user data silently. |
| Cookie/local storage production inventory | REQUIRES MANUAL CONFIGURATION | Inspect browser storage/network on production and across providers. Source found no first-party cookie API. |
| Terms/Cookie/AI pages | PARTIALLY FIXED | Technical AI/provider docs created in repository; publish accessible, owner-reviewed legal pages and link them site-wide. |
| Dependency/SRI audit | UNRESOLVED | No package manifest/lockfile; inventory pinned CDN libraries and assess SRI/self-hosting without breaking workers. |
| Cloudflare Worker/AI, Moondream | NOT APPLICABLE | No implementation found in repository. |
| Account deletion/SQL database | NOT APPLICABLE | No accounts or SQL database evident in source. |

This table is not a certification or legal conclusion. Production behavior and contractual facts must be verified separately.

## Re-audit note — 15 November 2026

The Vercel screenshot shows the proposed AI limit as `/api/proxy`, fixed 60-second window, 10 requests per IP, action 429. It is in the New Rule form and is not confirmed published. Status remains REQUIRES MANUAL CONFIGURATION until it appears as an active rule and traffic/429 behavior is verified. This shared route limit does not distinguish Groq, audio and OpenRouter operations.

## Final hardening update — 15 November 2026

- User reports the Vercel Firewall rule was saved. Dashboard access is unavailable here; mark **IMPLEMENTED, DEPLOYMENT VERIFICATION PENDING** until the published rule is visible and an authorized test confirms 429. Expected rule: `/api/proxy`, 10 requests per IP per 60 seconds. It is shared across AI features.
- Calendar importer now has browser-side HTTPS/host checks, timeout, redirect rejection, content-type check, 2 MiB response cap and 5 MiB `.ics` file cap. **PARTIALLY FIXED**; DNS-to-private-host checks are not reliable in browser code, and provider compatibility requires browser regression tests.
- Privacy page now provides confirmation-based limited and full StudyQ storage clearing. Local mock tests passed for cancel, limited clear, full clear and unrelated-key preservation. **FIXED AND LOCALLY TESTED**; real browser/storage regression remains.
- Dynamic rendering sinks were reviewed in key AI/calendar/study flows: AI Markdown formatter escapes source text before adding its limited formatting tags; planner tile/task/calendar preview fields are escaped or assigned as text; vocab feedback escapes dynamic strings; flashcard fields are escaped; print export escapes generated content; Pomodoro PiP strings come from static translations/state and timer values. **PARTIALLY FIXED / REVIEWED**; a repository-wide browser-based hostile-input test across every sink remains outstanding.
- CSP remains report-only until browser coverage is available. **IMPLEMENTED, DEPLOYMENT VERIFICATION PENDING**.
- Analytics legal basis, provider agreements/settings and other processing legal bases remain **REQUIRES LEGAL REVIEW / MANUAL VERIFICATION**.

### Analytics tracking update

Umami loads automatically through the existing `/stats/script.js` integration on configured pages. The consent prompt and accept/reject controls were removed at the owner's request. Query strings and fragments remain excluded and Do Not Track remains enabled in the script configuration. Production network behavior and the applicable legal basis remain to be confirmed.
