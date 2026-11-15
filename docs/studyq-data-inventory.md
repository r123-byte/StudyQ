# StudyQ data inventory

Source-based inventory. Browser persistence has no automatic expiry unless stated. Provider retention, server logs, and geographic location are unverified and must be confirmed in provider accounts/contracts.

| Data/key | Purpose and contents | Location/recipients | Persistence/deletion | Status |
|---|---|---|---|---|
| `StudyQ-language` | Interface language | Browser localStorage | Until cleared; user can clear site data | Confirmed |
| `StudyQ-sidebar-collapsed` | Sidebar preference | Browser localStorage | Until cleared | Confirmed |
| `StudyQ-flashcards` | User decks, cards, learning state | Browser localStorage; may be included in AI only when planner feature submits relevant context | Until cleared; feature-level delete behavior varies | Confirmed |
| `StudyQ-vocab-session` | Word trainer session/snapshot | Browser localStorage | Completion removes key in some paths; otherwise persists | Confirmed |
| `StudyQ-practice-test-history-v1` | Saved practice tests and answers (source material excluded from persisted test records in save helper) | Browser localStorage | Up to 25 records in code; feature delete/browser clear | Confirmed |
| `StudyQ-planner-tests`, `StudyQ-planner-homework` | Subjects, test dates, homework/task details | Browser localStorage; selected context may be sent to Groq when AI planning is invoked | Until feature delete/browser clear | Confirmed |
| `StudyQ-planner-history`, `StudyQ-planner-ai-output`, `StudyQ-planner-ai-timetable`, `StudyQ-planner-ai-focus`, `StudyQ-planner-active-ai-block`, `StudyQ-planner-completed-progress` | Planner history/output/schedule/progress | Browser localStorage; selected context and conversation can be sent to Groq | Varies by key; explicit clear exists for some | Confirmed; cleanup affordances differ |
| `StudyQ-planner-conversation-history` | Recent AI conversation | Browser localStorage; limited to 12 turns/6,000 chars, pruned at 12h in planner module | Age-based prune when read/write code runs; manual clear available | Confirmed |
| `StudyQ-ambient`, `StudyQ-planner-ambient`, `StudyQ-planner-sound` | Audio preferences | Browser localStorage | Until cleared | Confirmed |
| `StudyQ-tools` | Cross-tool bridge data | Browser localStorage | Expiry/deletion behavior varies | Needs payload-level review |
| Navigation return keys | Scroll position and navigation origin | Browser sessionStorage | Session-scoped; cleared by homepage flow | Confirmed |
| Contact name, email, topic, message | Answer contact requests | Browser → Web3Forms → configured recipient | No app database; provider/recipient retention unknown | Confirmed; access key is public by provider design |
| AI planner text/context | Generate study plans | Browser → StudyQ `/api/proxy` → Groq | No app DB evident; Vercel/Groq logs and retention unknown | Confirmed |
| Audio recording | User-initiated transcription | Browser MediaRecorder → StudyQ proxy → Groq | No app DB; external retention unknown; max recording duration 120 sec | Confirmed |
| PDF and extracted text | Practice-test generation | PDF/OCR in browser; extracted text/settings → Vercel `/api/practice-test` → Groq | PDF itself not sent; generated test history in localStorage. Separate quota record stores only keyed IP digest, timestamps and random request ID in Upstash Redis after configuration; records expire within the rolling window | Implemented in source; durable configuration pending |
| Grading answers | Automated grading | Browser → StudyQ proxy → OpenRouter | No app DB evident; provider retention unknown | Confirmed |
| Calendar feed URL/events | Import tests/schedules | Browser fetches supplied HTTPS URL with credentials omitted; returned events processed locally | URL handling in browser; server retention none evident; remote feed host sees request | Confirmed; validate HTTPS and size/time controls still require implementation |
| Analytics events/technical data | Site usage measurement | Configured pages load Umami via browser → `/stats/` rewrite → Umami Cloud | Account retention unknown | Automatic loading; query/fragment exclusion and Do Not Track configured; production behavior/settings unverified |
| Font/page asset requests | Render site | Browser → Google Fonts and CDN sources | Provider request logs unknown | Confirmed external dependencies |

## Browser storage mechanisms

- Cookies: no first-party cookie API use found in source; production browser inspection is still required.
- `localStorage`: keys above; survives browser restarts until removed.
- `sessionStorage`: temporary homepage return state; generally cleared at tab/session end.
- IndexedDB, Cache Storage, service worker: no code use found.
- No account or server-side student profile database found in repository.

## Rights/deletion path

There is no account deletion because accounts are not implemented. Users can clear local StudyQ data via browser site-data settings; this also removes saved work. A privacy request for information sent to providers can be emailed to `hello.studyq@gmail.com`; clearing local storage does not recall external submissions. Self-service export and unified clear-all controls remain unimplemented.

## Privacy controls added

The Privacy Policy now offers two confirmed deletion scopes: study content/history (explicit StudyQ study keys) and all StudyQ-prefixed localStorage/sessionStorage data. The latter preserves keys belonging to other applications on the same origin. Clearing local browser data does not delete third-party submissions or AI requests. Limited deletion retains language, ambient sound and sidebar preferences.
