# Project Handover – Aetheria (formerly NeuralDesk)

---

## 1️⃣ Overview
Aetheria is an **ambient compute intelligence** built on top of **Next.js 16 (TurboPack)** with a rich UI powered by **Framer Motion**, **Tailwind‑style glass‑morphism**, and **React‑based AI agents**. It can:
- Interact via voice (​`VoiceOrb`), chat (`ChatPanel`), and gestures.
- Show real‑time maps, calendar, email, WhatsApp, Drive, YouTube, news, finance, etc.
- React to custom XML‑style protocols (`<show_map>`, `<get_directions>`, `<send_email>`, …) emitted by the AI route.
- Leverage browser sensors (geolocation, ambient audio, gaze detection) for context‑aware UI.

The project has recently been **rebranded** to Aetheria and now includes:
- **MapsModule** – Google Maps integration with live‑location routing.
- **VisionCore** – MediaPipe gaze detection overlay.
- **AmbientSensor** – Web‑Audio level detection.
- **AI routing** – `src/app/api/ai/route.ts` parses user requests and emits XML tags for actions.
- **Dashboard UI** – Modular layout with a left sidebar, right HUD, and mobile bottom nav.

---

## 2️⃣ Repository Structure (key folders)
```
NeuralDesk/               (root of the repo)
│
├─ src/                  # All Next.js source files
│   ├─ app/               # Route handlers and pages
│   │   ├─ api/          # Backend API routes (ai, calendar, gmail, …)
│   │   └─ dashboard/    # Main dashboard page (page.tsx)
│   ├─ components/        # React components
│   │   └─ aetheria/      # Core UI components
│   │       ├─ VoiceOrb.tsx
│   │       ├─ ChatPanel.tsx
│   │       ├─ MapsModule.tsx
│   │       ├─ VisionCore.tsx
│   │       ├─ AmbientSensor.tsx
│   │       └─ … (EmailModule, DriveModule, …)
│   └─ lib/               # Utility libraries
│       ├─ vector-store.ts   # (future) vector DB wrapper
│       └─ connectors/       # (future) SaaS connector stubs
│
├─ .env.local            # Local env vars (not committed)
├─ next.config.js         # Next.js config (TurboPack enabled)
├─ tailwind.config.js     # Tailwind CSS (used for utility classes)
└─ README.md             # Project description (high‑level)
```

---

## 3️⃣ Core Concepts & Files
| Area | File | Purpose |
|------|------|---------|
| **AI Prompt & Routing** | `src/app/api/ai/route.ts` | Generates system prompt, appends XML protocol tags, selects LLM provider, streams response. |
| **Map UI** | `src/components/aetheria/MapsModule.tsx` | Loads Google Maps SDK, handles search, locate‑me, and `<get_directions>` with live GPS fallback. |
| **Vision UI** | `src/components/aetheria/VisionCore.tsx` | Loads MediaPipe face‑mesh via CDN, emits `aetheria-gaze-state` events, UI overlay. |
| **Ambient Audio** | `src/components/aetheria/AmbientSensor.tsx` | Uses Web Audio API to capture dB level, sends custom events for UI reaction. |
| **Dashboard Layout** | `src/app/dashboard/page.tsx` | Top‑level container, sidebar navigation, module mounting, global event listeners (show‑map, get-directions, etc.). |
| **Chat** | `src/components/aetheria/ChatPanel.tsx` | Parses AI messages, extracts XML tags, triggers appropriate browser events. |
| **Voice** | `src/components/aetheria/VoiceOrb.tsx` | Visual orb that toggles listening/speaking, triggers UI closing. |

---

## 4️⃣ Environment Variables (must be set in **.env.local** or Vercel dashboard)
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key
# (future) VECTOR_DB_URL, VECTOR_DB_KEY
# (future) SLACK_BOT_TOKEN, GMAIL_OAUTH_CLIENT_ID, NOTION_API_KEY, etc.
```
> **Important:** Never commit these values. They are required for the Maps SDK, AI routing, and future connectors.

---

## 5️⃣ Local Development Workflow
```bash
# 1️⃣ Install dependencies
npm install

# 2️⃣ Run dev server (hot‑reloading)
npm run dev   # defaults to http://localhost:3000
```
- The app expects a Chrome/Edge/Chromium browser for MediaPipe.
- When you open the dashboard, the voice orb auto‑connects and the UI loads all modules lazily.

### Build / Production
```bash
npm run build   # creates an optimized Vercel production build
npm run start   # runs the built server locally (if needed)
```
- Vercel automatically runs `npm run build` on push to `main`.
- The build logs are in the Vercel dashboard; any errors will appear there.

---

## 6️⃣ Deployment (Vercel)
1. Connect the GitHub repo (`github.com/Orsted10/NeuralDesk`).
2. In Vercel project settings:
   - Set **Framework Preset** to *Next.js*.
   - Add all required env vars (see Section 4).
   - Enable *Automatic Deployments* on `main`.
3. After each push, Vercel runs the Turbopack build and deploys to a unique URL.
4. **Custom Domains**: Add your domain in Vercel → Domains → Add Domain.

---

## 7️⃣ Future Roadmap (Enterprise Knowledge Graph)
- **Phase 1** – Vector store (`pgvector` on Supabase) and embedding pipeline.
- **Phase 2** – Connectors for Slack, Gmail, Notion, Google Drive, Linear, GitHub, HubSpot, Calendar.
- **Phase 3** – RAG integration in `ai/route.ts` to fetch contextual snippets before answering.
- **Phase 4** – UI for visual graph and knowledge‑base management.

All of this is detailed in the **Enterprise Knowledge Graph** implementation plan artifact you already have (`implementation_plan.md`).

---

## 8️⃣ Testing & Quality Assurance
- **Unit Tests**: Located under `src/__tests__/`. Run with `npm test` (Jest configured).
- **End‑to‑End**: Use Playwright scripts in `e2e/` (currently covering navigation, map search, voice‑orb interaction).
- **Linting**: `npm run lint` (ESLint + Prettier). CI runs on GitHub Actions.

---

## 9️⃣ Known Limitations & Gotchas
- The Maps SDK is loaded lazily; first‑time searches may take ~1 s.
- VisionCore relies on MediaPipe CDN; if the user blocks third‑party scripts, gaze detection will be disabled.
- `get_directions` works only when the Maps module is mounted; the recent patch ensures pending directions are handled when the module opens.
- Environment variable changes require a rebuild/re‑deploy.

---

## 🔟 Contact & Ownership
- **Primary Maintainer**: `ankank` (GitHub: @Orsted10)
- **Design Lead**: *Aetheria UI/UX* – premium glass‑morphism, dark/light mode.
- **AI Engineer**: *OpenAI & Groq integration* – system prompt, protocol handling.
- **Future Owner**: When handing over, point to the `README.md` for high‑level description and this `PROJECT_HANDOVER.md` for operational details.

---

*End of handover document.*
