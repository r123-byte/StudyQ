# Practice Test generation rate limit

**Status: IMPLEMENTED IN SOURCE; durable deployment configuration and production verification pending.**

## Rule and request path

- Maximum: five successfully generated Practice Tests per public client IP in a rolling 60-minute window.
- The browser sends one generation request to the dedicated Vercel route `/api/practice-test`. That route validates the request, reserves capacity, calls Groq, validates the complete test, and commits one successful-use record. Practice Test generation no longer calls the shared `/api/proxy` route directly.
- The Vercel endpoint is a Node function (60-second configured maximum) because it needs Node's HMAC support and a longer request window for multi-batch generation.
- Planner, transcription and grading use `/api/proxy` with independent Redis quotas and feature-specific key prefixes. They reuse the same Upstash credentials and HMAC secret, and do not count against the five Practice Test generations. A Vercel Firewall rule is a separate layer and does not replace these application limits.
- Invalid requests are rejected before reserving. The route reserves capacity atomically before calling Groq. A concurrent request sees the reservation, preventing more than five simultaneous generations from being admitted. A successful reservation is moved to the completed set only after every generated batch has passed server-side validation. Provider errors, timeouts and invalid model output release the reservation.
- A random `Idempotency-Key` prevents the same request identifier from being admitted twice while pending or after success. It is not persisted in the browser. The UI retains it only in memory when the browser sees an ambiguous network failure, so a retry with the same key cannot invoke another generation.
- A sixth request receives HTTP 429, a friendly hourly-limit message, `Retry-After`, and the earliest expected reset time. The page queries the allowance at load and refreshes it after a successful generation or rejection.

## Durable storage and privacy

The implementation is wired to Upstash Redis REST `EVAL` Lua scripts. The reserve/count/update steps run atomically in Redis. This was selected because its REST interface works from Vercel functions without adding a client dependency and supports server-side Lua scripts. Vercel also offers other Marketplace stores, but a different store would need a different implementation; do not connect an arbitrary Redis/Postgres product to these Upstash REST settings. Storage is required; missing or unavailable configuration returns HTTP 503 (fail closed), never an in-memory fallback.

Redis records contain only a keyed HMAC-SHA-256 digest of Vercel's `x-forwarded-for` client IP, timestamps, and random idempotency identifiers. Raw IP addresses, prompts, extracted PDF text, PDF files, settings and generated tests are not placed in the rate-limit store. Completed records expire after 60 minutes. Ordinary failures release pending reservations immediately when Redis is reachable. If Redis is unavailable during release, a request terminates before cleanup, or an upstream success cannot be committed, the reservation remains counted for at most the one-hour quota window. This prevents a retry from receiving uncounted provider work, but can temporarily reduce allowance after an interrupted request.

The HMAC digest is pseudonymous data, so it still needs to be treated as personal data. Vercel receives the request IP as part of normal hosting; Upstash receives the Vercel function's connection metadata and stores the digest. Check both providers' applicable privacy terms, region and retention settings before production use. The HMAC secret must be kept in Vercel environment settings and must not be committed or shared in chat.

## Vercel setup required

1. In the StudyQ Vercel project, open **Storage / Marketplace** and install **Upstash Redis** (or Redis with compatible REST `EVAL` support), choose a region and billing plan, and connect it to the project. Vercel Marketplace integrations provision storage and inject credentials into project environment variables ([Vercel Marketplace storage setup](https://vercel.com/docs/marketplace-storage)).
2. The API accepts either `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or Vercel's Upstash integration pair `KV_REST_API_URL` + `KV_REST_API_TOKEN`. It requires the writable REST token; `KV_REST_API_READ_ONLY_TOKEN` is not suitable. Do not paste credential values into source control or chat.
3. Create a secret, for example with `openssl rand -hex 32` (the endpoints require at least 32 characters), and add it as `STUDYQ_RATE_LIMIT_HMAC_SECRET` to the same Vercel environments. Keep the existing `GROQ_API_KEY` available to the new route.
4. Optionally set `STUDYQ_AI_PLANNER_LIMIT_PER_HOUR`, `STUDYQ_VOICE_LIMIT_PER_HOUR`, and `STUDYQ_GRADING_LIMIT_PER_HOUR`. Source defaults are 20, 10 and 30 respectively; each accepts an integer from 1 to 1000. Planner's 20/hour allows an ongoing study-planning chat; 10/hour limits comparatively expensive audio uploads; 30/hour allows multiple whole-test grading requests. These are initial guardrails chosen for a student workflow, not values calibrated from traffic history. Tune only after reviewing legitimate usage and provider spend.
5. Redeploy. Verify `/api/practice-test` GET returns a usage object (not 503), then smoke-test each `/api/proxy` feature. The implementation uses Upstash Redis REST Lua `EVAL`, which Upstash documents for server-side scripts and REST access ([Upstash REST API](https://upstash.com/docs/redis/features/restapi), [EVAL](https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval)).

## Verification record

| Check | Current result |
|---|---|
| API modules and inline page scripts parse | Passed: all 13 external `.js` files and 9 inline JavaScript blocks were parsed by the available JavaScript module runtime; browser scripts stopped at expected missing-DOM runtime references. |
| Handler behavior with an in-memory Upstash REST and Groq stub | Passed this sprint: first five accepted and sixth 429, duplicate 409, failed upstream releases reservation, fake-clock rolling expiry restores five, eight concurrent submissions produce five 200 and three 429, missing config returns 503, and forced completion-write failure returns 503 while the reservation remains pending. This validates handler flow only; the mock does not execute Lua. |
| Vercel Node request adapter | Not rerun in this sprint. |
| Generations 1–5 accepted / 6th rejected | Not run against a durable store yet. |
| Failed provider generation releases reservation | Implemented; not verified against a live Upstash Redis instance and Groq. |
| Rolling 60-minute reset | Implemented with sorted-set timestamps; not verified against a live store. |
| Concurrent requests cannot exceed five | Atomic Lua reservation script is in source; not executed against Redis yet. The mocked concurrency result above is not proof of Redis atomicity. |
| Other AI features unaffected | Source path inspection confirms they remain on `/api/proxy`; not production smoke-tested. |
| UI allowance / refresh / browser-storage bypass | UI reads the server count and does not use browser storage for enforcement; browser and production tests pending. |
| Vercel deployment and firewall interaction | Pending deployment. Firewall rules are an additional layer and do not replace the server-side quotas. |
| Shared AI proxy quotas | Mock-tested this sprint: Planner 20/21, grading 30/31, transcription 10/11, concurrent Planner 20/25, provider failure then successful retry, missing Redis 503 before upstream, and 429 Retry-After. The mock does not execute Lua. |
| Upstream success then Redis commit failure | Reservation stays counted until its one-hour expiry for both Practice Test and shared AI proxy. This avoids undercounting; live Redis outage behavior remains untested. |

**Do not mark this feature complete yet.** Durable Redis configuration, deployment, and live tests for the listed cases are required before claiming the limit is enforced in production.
