# StudyQ third-party services

| Provider/service | Use in code | Information shared | Location, retention, contractual role |
|---|---|---|---|
| Vercel | Static hosting, edge `/api/proxy`, practice-test function, `/stats/` rewrite | API bodies, form data, request metadata | Deployment region, logs, retention, DPA and role require dashboard verification |
| Groq | Study planner chat, practice-test generation, audio transcription (`whisper-large-v3`) | Prompt/context, extracted study text, audio recording | Region, retention, training setting, DPA/role unverified |
| OpenRouter | Open-answer grading; model forced in server proxy to `liquid/lfm-3-1.7b:free` | Grading questions, answers, marking criteria | Region, retention, model route/provider, training and role unverified |
| Web3Forms | Contact message delivery direct browser submission | Topic, optional name/email, message, request metadata | Recipient/configuration and retention unverified; public access key is embedded in the contact form as required by Web3Forms |
| Umami Cloud | Analytics script at `/stats/script.js` via Vercel rewrite; automatically loaded on configured pages | Page view and tracker metadata according to deployed config | Account region/retention and production behavior unverified |
| Google Fonts | Typeface stylesheet/font files | Browser request metadata | External request; can self-host later to reduce third-party requests |
| Cloudflare CDN | PDF.js assets | Browser asset request metadata; PDF data processed in browser | Source pins PDF.js 4.10.38; no user PDF upload to CDN intended |
| jsDelivr | Tesseract.js/Tesseract core/worker | Browser asset request metadata; OCR is in-browser | Source pins Tesseract.js/core 7.0.0; user text not sent to CDN intentionally |
| User-selected calendar provider | Direct browser iCalendar fetch | Calendar URL/request metadata and calendar response | Provider varies; URL can function like a secret; no service guarantee verifiable |

No Cloudflare Worker/AI, Moondream, or direct OpenAI API implementation was found. External provider behavior is not inferred from package/code presence; only active source references are listed. No package manifest/lockfile is present, so transitive dependency audit cannot be completed.
