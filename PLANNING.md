# 🧠 Personal AI Website — Master Planning Document
> **Role:** Senior Product Owner  
> **Stack:** React 18 + TypeScript + Vite · FastAPI · llama.cpp · SQLite → PostgreSQL · Docker  
> **Target:** Production-Ready Personal AI Hub

---

## Table of Contents
1. [Super Detail Todo-List (0 → Production)](#1-super-detail-todo-list)
2. [System Folder Structure Tree](#2-system-folder-structure-tree)
3. [File-by-File Detail (What to Code)](#3-file-by-file-detail)
4. [Environment Preparation](#4-environment-preparation)
5. [Database Structure](#5-database-structure)

---

# 1. Super Detail Todo-List

> ✅ = Done · 🔲 = Not Started · 🏗️ = In Progress  
> All tasks are ordered. Do not skip phases — each phase depends on the last.

---

## 📦 PHASE 0 — Project Scaffolding & Tooling (Week 1)

### 0.1 Repository & Monorepo Setup
- [ ] Create GitHub repository `personal-ai-website`
- [ ] Initialize root folder with `README.md`, `.gitignore`, `LICENSE`
- [ ] Create monorepo folder structure: `frontend/`, `backend/`, `ai_server/`, `docker/`, `docs/`
- [ ] Add root `.gitignore` (ignore `node_modules/`, `__pycache__/`, `.env`, `*.gguf`, `*.db`, `dist/`)
- [ ] Set up GitHub branch strategy: `main` (protected), `dev`, `feature/*`
- [ ] Write root `README.md` with setup instructions

### 0.2 Frontend Scaffolding (Vite + React + TypeScript)
- [ ] Run `npm create vite@latest frontend -- --template react-ts`
- [ ] Install core dependencies:
  - [ ] `react-router-dom@6` — routing
  - [ ] `zustand` — global state
  - [ ] `axios` — HTTP client
  - [ ] `tailwindcss postcss autoprefixer` — styling
  - [ ] `framer-motion` — animations
  - [ ] `react-query` (@tanstack/react-query) — server state, caching
  - [ ] `react-hot-toast` — notifications
  - [ ] `lucide-react` — icons
  - [ ] `clsx tailwind-merge` — conditional class utilities
- [ ] Install dev dependencies:
  - [ ] `@types/node`, `eslint`, `prettier`, `@typescript-eslint/*`
- [ ] Configure `tailwind.config.ts` with custom colors/fonts
- [ ] Configure `tsconfig.json` with path aliases (`@/` → `src/`)
- [ ] Configure `vite.config.ts` with path aliases and proxy to backend
- [ ] Set up ESLint + Prettier config files (`.eslintrc.cjs`, `.prettierrc`)
- [ ] Configure `src/index.css` with Tailwind base directives
- [ ] Verify dev server runs: `npm run dev`

### 0.3 Backend Scaffolding (FastAPI)
- [ ] Create `backend/` Python project with `pyproject.toml` or `requirements.txt`
- [ ] Set up Python virtual environment: `python -m venv venv`
- [ ] Install backend dependencies:
  - [ ] `fastapi` — web framework
  - [ ] `uvicorn[standard]` — ASGI server
  - [ ] `sqlalchemy` — ORM
  - [ ] `alembic` — database migrations
  - [ ] `python-jose[cryptography]` — JWT tokens
  - [ ] `passlib[bcrypt]` — password hashing
  - [ ] `python-multipart` — file uploads
  - [ ] `python-dotenv` — env variables
  - [ ] `aiofiles` — async file I/O
  - [ ] `httpx` — async HTTP client
  - [ ] `pydantic[email]` — data validation
  - [ ] `pillow` — image processing
  - [ ] `easyocr` or `manga-ocr` — OCR
  - [ ] `zipfile36` — ZIP handling
- [ ] Create `backend/app/main.py` entry point
- [ ] Verify FastAPI runs: `uvicorn app.main:app --reload`

### 0.4 AI Server Scaffolding (llama.cpp)
- [ ] Create `ai_server/` Python project with its own `requirements.txt`
- [ ] Install AI dependencies:
  - [ ] `llama-cpp-python` (with CUDA/Metal flags if GPU available)
  - [ ] `fastapi`, `uvicorn` (AI server is its own FastAPI micro-service)
  - [ ] `numpy`, `Pillow`
- [ ] Download first GGUF model (LLaMA 3.1 8B Q4_K_M from Hugging Face)
- [ ] Create `ai_server/main.py` with basic health check endpoint
- [ ] Verify model loads and `/health` returns 200

### 0.5 Docker & Dev Environment
- [ ] Write `docker/Dockerfile.frontend`
- [ ] Write `docker/Dockerfile.backend`
- [ ] Write `docker/Dockerfile.ai_server`
- [ ] Write root `docker-compose.yml` with all 3 services + volume mounts
- [ ] Write `docker-compose.dev.yml` override for hot-reload
- [ ] Test: `docker-compose up --build` — all 3 services healthy
- [ ] Add `Makefile` with shortcuts: `make dev`, `make build`, `make logs`

### 0.6 CI/CD Pipeline
- [ ] Create `.github/workflows/ci.yml`
- [ ] CI pipeline: lint → type-check → unit tests → build
- [ ] Add branch protection rule on `main` (require CI pass before merge)

---

## 🔐 PHASE 1 — Authentication & Shell UI (Weeks 2–3)

### 1.1 Database & Auth Backend
- [ ] Initialize Alembic: `alembic init migrations`
- [ ] Configure `alembic.ini` and `env.py` to read from `.env`
- [ ] Create `User` model (SQLAlchemy): id, email, username, hashed_password, created_at, updated_at
- [ ] Create `UserSession` model: id, user_id, token_hash, expires_at, ip_address
- [ ] Generate and run first migration: `alembic revision --autogenerate -m "create_users"`
- [ ] Write `auth/password.py`: `hash_password()`, `verify_password()`
- [ ] Write `auth/jwt.py`: `create_access_token()`, `decode_access_token()`, `create_refresh_token()`
- [ ] Write `auth/dependencies.py`: `get_current_user()` FastAPI dependency
- [ ] Write `schemas/auth.py`: Pydantic schemas for Register, Login, TokenResponse, UserResponse
- [ ] Write `routers/auth.py`: POST `/api/v1/auth/register`, POST `/api/v1/auth/login`, POST `/api/v1/auth/logout`, POST `/api/v1/auth/refresh`, GET `/api/v1/auth/me`
- [ ] Add CORS middleware in `main.py`
- [ ] Test all auth endpoints with Swagger UI at `/docs`

### 1.2 Frontend Shell & Routing
- [ ] Create `src/layouts/MainLayout.tsx` — sidebar + content area
- [ ] Create `src/layouts/AuthLayout.tsx` — centered card for login/register
- [ ] Set up React Router in `src/App.tsx` with protected routes
- [ ] Create route guard `src/components/ProtectedRoute.tsx`
- [ ] Create sidebar `src/components/layout/Sidebar.tsx` with nav icons
- [ ] Create topbar `src/components/layout/Topbar.tsx` with greeting + avatar
- [ ] Create `src/pages/LoginPage.tsx` — login form UI
- [ ] Create `src/pages/RegisterPage.tsx` — register form UI
- [ ] Create `src/store/authStore.ts` (Zustand) — user, token, isLoggedIn, login(), logout()
- [ ] Write `src/services/auth.service.ts` — API calls for auth endpoints
- [ ] Connect login form → API → store → redirect to home
- [ ] Connect register form → API → auto-login → redirect to home
- [ ] Implement token refresh interceptor in `src/lib/axios.ts`
- [ ] Store token in `httpOnly` cookie (via backend) OR `localStorage` (simpler for MVP)
- [ ] Add logout button → clear store + redirect
- [ ] Test: full register → login → protected route → logout flow

### 1.3 Theme System
- [ ] Define 4 themes in `src/styles/themes.ts`: `night-garden`, `rainy-city`, `space`, `forest`
- [ ] Each theme: background video/gif URL, accent color, overlay opacity
- [ ] Create `src/store/settingsStore.ts` (Zustand, persisted to localStorage): theme, fontSize, musicURL, aiModel
- [ ] Create `src/components/ui/ThemeBackground.tsx` — renders animated BG based on current theme
- [ ] Apply theme CSS variables globally

---

## 🏠 PHASE 2 — Home Page & Focus Tools (Weeks 4–5)

### 2.1 Home Page Layout
- [ ] Create `src/pages/HomePage.tsx`
- [ ] Display dynamic greeting: "Good morning/afternoon/evening, [Username]"
- [ ] Display current time (updates every second with `useEffect`)
- [ ] Display current date: "Wednesday, February 25"
- [ ] Add `ThemeBackground` behind all content
- [ ] Add glass-morphism card containers over the background

### 2.2 Pomodoro Timer
- [ ] Create `src/components/timer/PomodoroTimer.tsx`
- [ ] States: WORK (25 min default), SHORT_BREAK (5 min), LONG_BREAK (15 min)
- [ ] Controls: Start, Pause, Reset, Skip
- [ ] Toggle between POMODORO and STOPWATCH modes (tab UI)
- [ ] Create `src/store/timerStore.ts` (Zustand): mode, timeLeft, isRunning, sessionCount, tick()
- [ ] Use `setInterval` in store action, clear on pause/reset
- [ ] Play audio notification on session end (browser Audio API)
- [ ] Create settings panel for custom durations (stored in `settingsStore`)
- [ ] Display session count ("Session 3 of 4")
- [ ] Save completed sessions to backend: POST `/api/v1/sessions/pomodoro`

### 2.3 Stopwatch
- [ ] Inside `PomodoroTimer.tsx` — render Stopwatch UI when mode === 'STOPWATCH'
- [ ] Controls: Start, Stop, Lap, Reset
- [ ] Display laps list below main time
- [ ] HH:MM:SS:ms precision using `performance.now()`

### 2.4 Music Player (YouTube Embed)
- [ ] Create `src/components/music/MusicPlayer.tsx`
- [ ] Embed YouTube iframe with custom playlist URL from `settingsStore.musicURL`
- [ ] Show: track title, play/pause, next track, volume slider, progress bar
- [ ] Use YouTube iframe API (`window.YT.Player`) to control playback programmatically
- [ ] Allow user to paste new YouTube playlist/video URL in Settings
- [ ] Auto-load default lo-fi playlist on first visit
- [ ] Minimize/maximize music player widget

### 2.5 Backend — Sessions API
- [ ] Create `PomodoroSession` model: id, user_id, duration_minutes, session_type, completed_at
- [ ] Create `routers/sessions.py`: POST `/api/v1/sessions/pomodoro`, GET `/api/v1/sessions/stats`
- [ ] Stats endpoint returns: total_sessions, total_focus_minutes, sessions_today, streak_days
- [ ] Run migration for new model

---

## 🤖 PHASE 3 — AI Chatbot Integration (Weeks 6–7)

### 3.1 AI Server — Model Management
- [ ] Create `ai_server/models/model_manager.py` — singleton class for loading/unloading GGUF models
- [ ] Support multiple models: list available `.gguf` files in `ai_server/models/` directory
- [ ] Load model on first request, keep in memory, swap on model change
- [ ] Create `ai_server/routers/chat.py`: POST `/v1/chat/completions` (OpenAI-compatible format)
- [ ] Implement streaming response using `StreamingResponse` + `Server-Sent Events`
- [ ] Create `ai_server/routers/models.py`: GET `/v1/models` — list available models
- [ ] Add request queue to handle concurrent requests safely
- [ ] Implement system prompt injection (role-based persona)
- [ ] Add `/v1/health` endpoint with model status

### 3.2 Backend — Chat Proxy & History
- [ ] Create `ChatConversation` model: id, user_id, title, model_used, created_at, updated_at
- [ ] Create `ChatMessage` model: id, conversation_id, role (user/assistant/system), content, tokens_used, created_at
- [ ] Create `routers/chat.py`:
  - [ ] POST `/api/v1/chat/conversations` — create new conversation
  - [ ] GET `/api/v1/chat/conversations` — list user's conversations
  - [ ] GET `/api/v1/chat/conversations/{id}` — get conversation + messages
  - [ ] DELETE `/api/v1/chat/conversations/{id}` — delete conversation
  - [ ] POST `/api/v1/chat/conversations/{id}/messages` — send message (proxies to AI server, streams back)
  - [ ] GET `/api/v1/chat/models` — list available models (proxies to AI server)
- [ ] Implement streaming proxy: backend receives from AI server, forwards SSE to frontend
- [ ] Save messages to DB as they stream (save full response when complete)
- [ ] Run migration for chat models

### 3.3 Frontend — Chatbot Page
- [ ] Create `src/pages/ChatbotPage.tsx`
- [ ] Split layout: chat area (left, 65%) + sidebar panel (right, 35%)
- [ ] Create `src/components/chat/ChatMessage.tsx` — renders user/assistant message bubble
- [ ] Create `src/components/chat/ChatInput.tsx` — textarea + send button, Shift+Enter newline
- [ ] Create `src/components/chat/ChatWindow.tsx` — scrollable message list, auto-scroll to bottom
- [ ] Create `src/components/chat/ConversationList.tsx` — sidebar list of past conversations
- [ ] Create `src/components/chat/ModelSelector.tsx` — dropdown to pick active model
- [ ] Create `src/components/chat/ToolsPanel.tsx` — toggles for enabled tools (future expansion)
- [ ] Implement SSE/streaming: `EventSource` or `fetch` with `ReadableStream` for token-by-token rendering
- [ ] Show typing indicator while waiting for first token
- [ ] Support Markdown rendering in assistant messages (`react-markdown` + `remark-gfm`)
- [ ] Support code block syntax highlighting (`react-syntax-highlighter`)
- [ ] Implement conversation title: auto-generate from first user message (ask AI)
- [ ] Create `src/services/chat.service.ts` — all chat API calls
- [ ] Create `src/store/chatStore.ts` (Zustand): conversations, activeConversation, messages, isStreaming, sendMessage()

---

## 🖼️ PHASE 4 — Image Translator (Week 8)

### 4.1 AI Server — Vision & Translation
- [ ] Load a vision-capable model: LLaVA 1.6 or Moondream GGUF
- [ ] Create `ai_server/routers/translate.py`:
  - [ ] POST `/v1/translate/image` — accepts base64 image + source/target language
  - [ ] Extracts text regions via OCR → sends to LLM for translation
  - [ ] Returns: `{ original_text, translated_text, bounding_boxes }`
- [ ] Create `ai_server/services/ocr_service.py` — wraps EasyOCR or Manga-OCR
- [ ] Create `ai_server/services/translation_service.py` — overlays translated text on image using Pillow
- [ ] Support source languages: Japanese, Korean, Chinese, Auto-detect
- [ ] Support target languages: English, Vietnamese (configurable)

### 4.2 Backend — File Handling & Translation Jobs
- [ ] Create `TranslationJob` model: id, user_id, filename, status (pending/processing/done/failed), source_lang, target_lang, page_count, created_at, completed_at
- [ ] Create `TranslationPage` model: id, job_id, page_number, original_path, translated_path, ocr_text, translated_text
- [ ] Create `routers/translator.py`:
  - [ ] POST `/api/v1/translate/upload` — accept file (.jpg/.png/.cbz/.zip), create job, process async
  - [ ] GET `/api/v1/translate/jobs` — list user's translation jobs
  - [ ] GET `/api/v1/translate/jobs/{id}` — get job status + pages
  - [ ] GET `/api/v1/translate/jobs/{id}/pages/{num}` — get specific page image (original or translated)
  - [ ] POST `/api/v1/translate/jobs/{id}/retranslate` — re-run translation with different model/lang
  - [ ] GET `/api/v1/translate/jobs/{id}/download` — stream ZIP of all translated pages
  - [ ] DELETE `/api/v1/translate/jobs/{id}` — delete job and files
- [ ] Create `services/file_service.py` — handle CBZ extraction (CBZ = ZIP of images)
- [ ] Create `services/translation_service.py` — orchestrates OCR → AI → overlay pipeline
- [ ] Use FastAPI `BackgroundTasks` for async processing
- [ ] Run migration for translator models

### 4.3 Frontend — Translator Page
- [ ] Create `src/pages/TranslatorPage.tsx`
- [ ] Split layout: translated image viewer (left, 65%) + original file panel (right, 35%)
- [ ] Create `src/components/translator/FileUploader.tsx` — drag & drop zone for .jpg/.png/.cbz
- [ ] Create `src/components/translator/PageViewer.tsx` — displays translated image, paginated
- [ ] Create `src/components/translator/OriginalPanel.tsx` — shows original file thumbnails
- [ ] Create `src/components/translator/JobList.tsx` — list of past translation jobs
- [ ] Create `src/components/translator/ControlBar.tsx` — Back/Next buttons, page counter (1/xxx)
- [ ] Create `src/components/translator/ActionBar.tsx` — Re-translate, Show Original, Download ZIP buttons
- [ ] Show processing progress bar while job is running (poll `/jobs/{id}` every 2s)
- [ ] Create `src/services/translator.service.ts` — all translator API calls
- [ ] Create `src/store/translatorStore.ts` — jobs, activeJob, currentPage, uploadFile()

---

## 📊 PHASE 5 — Dashboard & Settings (Week 9)

### 5.1 Dashboard Page
- [ ] Create `src/pages/DashboardPage.tsx`
- [ ] Stat cards: Total Focus Time, Sessions Completed, Words Translated, Chats Started
- [ ] Focus chart: bar chart of daily focus minutes (last 7 days) using Recharts
- [ ] Recent activity feed: last 5 chat conversations, last 3 translation jobs
- [ ] Streak tracker: current daily streak + longest streak
- [ ] Create backend endpoint: GET `/api/v1/dashboard/stats` — aggregate all stats for current user
- [ ] Create `src/services/dashboard.service.ts`

### 5.2 Settings Page
- [ ] Create `src/pages/SettingsPage.tsx`
- [ ] Sections: Appearance, Timer, Music, AI Models, Account
- [ ] Appearance: theme picker (4 animated previews), font size slider
- [ ] Timer: custom work/break durations, notification sound toggle, auto-start breaks toggle
- [ ] Music: YouTube URL input, default playlist selector
- [ ] AI Models: active chat model dropdown, active vision model dropdown, model file path config
- [ ] Account: change username, change password, delete account (danger zone)
- [ ] All settings persist to `settingsStore` (Zustand + localStorage)
- [ ] Account changes call backend PATCH `/api/v1/users/me`

---

## 🚀 PHASE 6 — Polish, Testing & Production Deploy (Week 10)

### 6.1 UI Polish
- [ ] Add loading skeleton components for all data-fetching states
- [ ] Add empty states for: no conversations, no translation jobs, no focus sessions
- [ ] Add error boundaries for all pages
- [ ] Implement toast notifications for: success saves, errors, model loading status
- [ ] Add keyboard shortcuts: `Ctrl+Enter` send message, `Space` start/pause timer
- [ ] Responsive design: test and fix breakpoints at 768px, 1024px, 1280px
- [ ] Add page transition animations (Framer Motion `AnimatePresence`)
- [ ] Cross-browser test: Chrome, Firefox, Safari, Edge

### 6.2 Testing
- [ ] Write unit tests for: `authStore`, `timerStore`, `chatStore` (Vitest)
- [ ] Write unit tests for: FastAPI auth routes (pytest + httpx)
- [ ] Write integration test: full chat flow (upload → translate → download)
- [ ] Run `npm run build` — fix all TypeScript errors and build warnings
- [ ] Run `python -m pytest` — all backend tests pass
- [ ] Lighthouse audit: score ≥ 85 on Performance, Accessibility, Best Practices

### 6.3 Security Hardening
- [ ] Add rate limiting: `slowapi` on FastAPI (max 60 req/min per IP)
- [ ] Add input validation/sanitization on all text inputs (prevent XSS)
- [ ] Add file type validation on upload (check magic bytes, not just extension)
- [ ] Set secure HTTP headers: `HSTS`, `X-Frame-Options`, `Content-Security-Policy`
- [ ] Rotate JWT secret keys via environment variables
- [ ] Add HTTPS with Let's Encrypt (if self-hosting VPS)

### 6.4 Production Deploy
- [ ] Choose hosting: VPS (DigitalOcean/Hetzner) or Railway + Render
- [ ] Set up VPS: Ubuntu 22.04, Docker + Docker Compose installed
- [ ] Configure Nginx as reverse proxy for frontend + backend
- [ ] Set up SSL with Certbot (Let's Encrypt)
- [ ] Configure production `.env` files (never commit to git)
- [ ] Set up GitHub Actions deploy workflow: push to `main` → SSH → `docker-compose pull && up -d`
- [ ] Set up automated daily SQLite backups to S3 or local backup directory
- [ ] Monitor uptime with UptimeRobot (free tier)
- [ ] Final smoke test: register → focus session → chat → translate → download → logout

---

# 2. System Folder Structure Tree

```
personal-ai-website/                        # Root monorepo
│
├── 📄 README.md
├── 📄 docker-compose.yml                   # Production compose
├── 📄 docker-compose.dev.yml               # Dev override (hot-reload)
├── 📄 Makefile                             # Shortcut commands
├── 📄 .gitignore
├── 📄 .env.example                         # Template for all env vars
│
├── 📁 docs/                                # Project documentation
│   ├── PLANNING.md                         # This file
│   ├── API.md                              # API endpoint reference
│   └── ARCHITECTURE.md                     # Architecture decisions
│
├── 📁 docker/                              # Dockerfiles
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   ├── Dockerfile.ai_server
│   └── nginx.conf                          # Nginx reverse proxy config
│
├── 📁 .github/
│   └── workflows/
│       ├── ci.yml                          # Lint + test + build
│       └── deploy.yml                      # Deploy to VPS on main push
│
│
├── ──────────────────────────────────────
├── 📁 frontend/                            # React + TypeScript + Vite
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   ├── 📄 tsconfig.node.json
│   ├── 📄 vite.config.ts
│   ├── 📄 tailwind.config.ts
│   ├── 📄 postcss.config.js
│   ├── 📄 .eslintrc.cjs
│   ├── 📄 .prettierrc
│   ├── 📄 index.html
│   │
│   └── 📁 src/
│       ├── 📄 main.tsx                     # App entry point
│       ├── 📄 App.tsx                      # Router + layout shell
│       ├── 📄 index.css                    # Tailwind base + global styles
│       ├── 📄 vite-env.d.ts
│       │
│       ├── 📁 pages/                       # Route-level page components
│       │   ├── HomePage.tsx
│       │   ├── LoginPage.tsx
│       │   ├── RegisterPage.tsx
│       │   ├── ChatbotPage.tsx
│       │   ├── TranslatorPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── SettingsPage.tsx
│       │   └── NotFoundPage.tsx
│       │
│       ├── 📁 layouts/                     # Structural layout wrappers
│       │   ├── MainLayout.tsx              # Sidebar + topbar + content
│       │   └── AuthLayout.tsx              # Centered card (login/register)
│       │
│       ├── 📁 components/                  # Reusable UI components
│       │   ├── 📁 ui/                      # Generic, domain-agnostic atoms
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Modal.tsx
│       │   │   ├── Spinner.tsx
│       │   │   ├── Skeleton.tsx
│       │   │   ├── Badge.tsx
│       │   │   ├── Card.tsx
│       │   │   ├── Dropdown.tsx
│       │   │   ├── Tabs.tsx
│       │   │   ├── Tooltip.tsx
│       │   │   ├── ProgressBar.tsx
│       │   │   └── ThemeBackground.tsx
│       │   │
│       │   ├── 📁 layout/                  # App shell pieces
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Topbar.tsx
│       │   │   └── ProtectedRoute.tsx
│       │   │
│       │   ├── 📁 timer/                   # Pomodoro + Stopwatch
│       │   │   ├── PomodoroTimer.tsx
│       │   │   ├── StopwatchTimer.tsx
│       │   │   ├── TimerControls.tsx
│       │   │   ├── TimerDisplay.tsx
│       │   │   └── SessionCounter.tsx
│       │   │
│       │   ├── 📁 music/                   # YouTube Music Player
│       │   │   ├── MusicPlayer.tsx
│       │   │   ├── MusicControls.tsx
│       │   │   └── YouTubeEmbed.tsx
│       │   │
│       │   ├── 📁 chat/                    # AI Chatbot
│       │   │   ├── ChatWindow.tsx
│       │   │   ├── ChatMessage.tsx
│       │   │   ├── ChatInput.tsx
│       │   │   ├── ConversationList.tsx
│       │   │   ├── ModelSelector.tsx
│       │   │   ├── ToolsPanel.tsx
│       │   │   └── TypingIndicator.tsx
│       │   │
│       │   ├── 📁 translator/              # Image Translator
│       │   │   ├── FileUploader.tsx
│       │   │   ├── PageViewer.tsx
│       │   │   ├── OriginalPanel.tsx
│       │   │   ├── JobList.tsx
│       │   │   ├── ControlBar.tsx
│       │   │   ├── ActionBar.tsx
│       │   │   └── TranslationProgress.tsx
│       │   │
│       │   └── 📁 dashboard/               # Dashboard widgets
│       │       ├── StatCard.tsx
│       │       ├── FocusChart.tsx
│       │       ├── ActivityFeed.tsx
│       │       └── StreakTracker.tsx
│       │
│       ├── 📁 store/                       # Zustand global state
│       │   ├── authStore.ts
│       │   ├── settingsStore.ts
│       │   ├── timerStore.ts
│       │   ├── chatStore.ts
│       │   └── translatorStore.ts
│       │
│       ├── 📁 services/                    # API call functions
│       │   ├── auth.service.ts
│       │   ├── chat.service.ts
│       │   ├── translator.service.ts
│       │   ├── sessions.service.ts
│       │   └── dashboard.service.ts
│       │
│       ├── 📁 hooks/                       # Custom React hooks
│       │   ├── useAuth.ts
│       │   ├── useTimer.ts
│       │   ├── useChat.ts
│       │   ├── useGreeting.ts
│       │   ├── useStreamResponse.ts
│       │   └── useLocalStorage.ts
│       │
│       ├── 📁 lib/                         # Utility singletons & config
│       │   ├── axios.ts                    # Axios instance + interceptors
│       │   ├── queryClient.ts              # React Query client config
│       │   └── utils.ts                    # cn(), formatTime(), etc.
│       │
│       ├── 📁 types/                       # TypeScript type definitions
│       │   ├── auth.types.ts
│       │   ├── chat.types.ts
│       │   ├── translator.types.ts
│       │   ├── timer.types.ts
│       │   └── api.types.ts
│       │
│       └── 📁 styles/                      # Global style files
│           ├── themes.ts                   # Theme definitions
│           └── animations.ts              # Framer Motion variants
│
│
├── ──────────────────────────────────────
├── 📁 backend/                             # FastAPI Python Backend
│   ├── 📄 requirements.txt
│   ├── 📄 pyproject.toml
│   ├── 📄 alembic.ini
│   ├── 📄 .env.example
│   │
│   ├── 📁 migrations/                      # Alembic migration files
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       ├── 001_create_users.py
│   │       ├── 002_create_sessions.py
│   │       ├── 003_create_chat.py
│   │       └── 004_create_translator.py
│   │
│   └── 📁 app/
│       ├── 📄 main.py                      # FastAPI app entry point
│       │
│       ├── 📁 core/                        # Core config, DB, security
│       │   ├── config.py                   # Settings from env vars
│       │   ├── database.py                 # SQLAlchemy engine + session
│       │   └── security.py                 # JWT + password utilities
│       │
│       ├── 📁 models/                      # SQLAlchemy ORM models
│       │   ├── base.py                     # Base class + common fields
│       │   ├── user.py
│       │   ├── session.py                  # Pomodoro sessions
│       │   ├── chat.py                     # Conversations + messages
│       │   └── translator.py              # Jobs + pages
│       │
│       ├── 📁 schemas/                     # Pydantic request/response schemas
│       │   ├── auth.py
│       │   ├── user.py
│       │   ├── session.py
│       │   ├── chat.py
│       │   └── translator.py
│       │
│       ├── 📁 routers/                     # API route handlers
│       │   ├── auth.py
│       │   ├── users.py
│       │   ├── sessions.py
│       │   ├── chat.py
│       │   └── translator.py
│       │
│       ├── 📁 services/                    # Business logic layer
│       │   ├── auth_service.py
│       │   ├── user_service.py
│       │   ├── session_service.py
│       │   ├── chat_service.py
│       │   ├── translator_service.py
│       │   └── file_service.py
│       │
│       ├── 📁 dependencies/                # FastAPI dependency injection
│       │   ├── auth.py                     # get_current_user()
│       │   └── database.py                 # get_db()
│       │
│       └── 📁 utils/                       # Helpers
│           ├── image_utils.py
│           ├── zip_utils.py
│           └── ai_client.py               # HTTP client to AI server
│
│
└── ──────────────────────────────────────
    📁 ai_server/                           # llama.cpp Inference Server
    ├── 📄 requirements.txt
    ├── 📄 .env.example
    │
    ├── 📁 models/                          # GGUF model files (gitignored)
    │   ├── .gitkeep
    │   └── README.md                       # How to download models
    │
    └── 📁 app/
        ├── 📄 main.py                      # FastAPI AI server entry
        │
        ├── 📁 core/
        │   └── config.py
        │
        ├── 📁 services/
        │   ├── model_manager.py            # Load/unload/swap GGUF models
        │   ├── ocr_service.py              # EasyOCR / Manga-OCR wrapper
        │   └── translation_service.py     # OCR → LLM → overlay pipeline
        │
        └── 📁 routers/
            ├── chat.py                     # /v1/chat/completions (streaming)
            ├── models.py                   # /v1/models list
            └── translate.py               # /v1/translate/image
```

---

# 3. File-by-File Detail

> For every significant file: **purpose**, **key functions/classes**, **what to implement**.

---

## 🖥️ Frontend Files

---

### `frontend/src/main.tsx`
**Purpose:** React app bootstrapper.
```
- Wrap <App /> with: <QueryClientProvider>, <BrowserRouter>
- Call ReactDOM.createRoot().render()
- Import global CSS
```

---

### `frontend/src/App.tsx`
**Purpose:** Root router. Defines all routes and which layout they use.
```
Functions/Structure:
- <Routes> with nested <Route> elements
- Public routes: /login, /register → <AuthLayout>
- Protected routes: /, /chat, /translator, /dashboard, /settings → <MainLayout> wrapped in <ProtectedRoute>
- Catch-all: * → <NotFoundPage>
- Wrap all routes in <AnimatePresence> for page transitions
```

---

### `frontend/src/layouts/MainLayout.tsx`
**Purpose:** Shell for all authenticated pages. Sidebar + topbar + animated content area.
```
Props: none (reads from router)
Structure:
- <div className="flex h-screen">
  - <Sidebar /> (fixed left, collapsible)
  - <div className="flex-1 flex flex-col">
    - <Topbar />
    - <ThemeBackground /> (absolute, z-0)
    - <main> <Outlet /> </main> (z-10, above background)
```

---

### `frontend/src/layouts/AuthLayout.tsx`
**Purpose:** Centered card layout for login/register pages.
```
Structure:
- Full-screen with animated gradient background
- Centered glass card (max-w-md)
- Logo + title above form
- <Outlet /> for form content
```

---

### `frontend/src/components/layout/Sidebar.tsx`
**Purpose:** Left navigation bar with icon buttons.
```
State: collapsed (boolean), toggle on hover or button click
Nav items array: { icon, label, path } for each page
- Active item: highlighted with accent color
- Uses NavLink from react-router-dom for active state detection
- Bottom section: settings gear, logout button
```

---

### `frontend/src/components/layout/Topbar.tsx`
**Purpose:** Top bar showing greeting and user avatar.
```
Data: reads username from authStore, current time
Functions:
- getGreeting(): returns "Good morning/afternoon/evening" based on hour
- Displays: "[greeting], [username]" on left
- Displays: clock (live, updates every second) on right
- Displays: avatar/initials + dropdown menu (Profile, Settings, Logout)
```

---

### `frontend/src/components/ui/ThemeBackground.tsx`
**Purpose:** Renders the animated background visual behind all content.
```
Reads: theme name from settingsStore
Renders: <video> or <img> with autoPlay loop muted playsInline
Applies: dark overlay div (rgba) for readability
Theme map: { 'night-garden': '/assets/bg/night-garden.mp4', ... }
```

---

### `frontend/src/pages/HomePage.tsx`
**Purpose:** Main landing page after login. Shows timer, music, greeting.
```
Layout:
- Full-height with ThemeBackground behind
- Center: <PomodoroTimer /> in glass card
- Bottom: <MusicPlayer /> bar
- Top: greeting text (via Topbar)
State: reads timerStore for active session
```

---

### `frontend/src/components/timer/PomodoroTimer.tsx`
**Purpose:** Container for timer modes and controls.
```
State from timerStore: mode, timeLeft, isRunning, sessionCount
Renders:
- <Tabs>: POMODORO | STOPWATCH
- When POMODORO: <TimerDisplay /> + <TimerControls /> + <SessionCounter />
- When STOPWATCH: <StopwatchTimer />
- Settings gear → opens duration settings modal
```

---

### `frontend/src/store/timerStore.ts`
**Purpose:** Zustand store for all timer state.
```
State:
  mode: 'pomodoro' | 'stopwatch'
  phase: 'work' | 'short_break' | 'long_break'
  timeLeft: number (seconds)
  isRunning: boolean
  sessionCount: number
  lapTimes: number[] (stopwatch)
  durations: { work: 1500, shortBreak: 300, longBreak: 900 }

Actions:
  start() — setInterval every 1s, calls tick()
  pause() — clearInterval
  reset() — reset timeLeft to current phase duration
  skip() — advance to next phase
  tick() — decrement timeLeft, handle phase transitions, trigger notification
  setMode(mode) — switch between pomodoro/stopwatch
  addLap() — push current stopwatch time to lapTimes
  saveSession() — POST to /api/v1/sessions/pomodoro when work phase completes
```

---

### `frontend/src/components/music/MusicPlayer.tsx`
**Purpose:** YouTube music player widget at bottom of home page.
```
State: isPlaying, volume, isMiniaturized
YouTube iframe API: window.YT.Player instance
Functions:
  initPlayer() — creates YT.Player, attaches to hidden div
  play() / pause() — player.playVideo() / pauseVideo()
  setVolume(v) — player.setVolume(v)
  onStateChange(e) — sync isPlaying state with actual player state
Reads: musicURL from settingsStore
```

---

### `frontend/src/pages/ChatbotPage.tsx`
**Purpose:** Full AI chat interface page.
```
Layout: flex row
  Left (65%): <ChatWindow /> + <ChatInput />
  Right (35%): <ConversationList /> + <ModelSelector /> + <ToolsPanel />
State: reads chatStore
onSend(text): calls chatStore.sendMessage(text)
```

---

### `frontend/src/store/chatStore.ts`
**Purpose:** Zustand store for chat state.
```
State:
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Record<conversationId, Message[]>
  isStreaming: boolean
  currentStreamContent: string
  selectedModel: string

Actions:
  loadConversations() — GET /api/v1/chat/conversations
  selectConversation(id) — set active, load messages
  createConversation() — POST /api/v1/chat/conversations
  deleteConversation(id)
  sendMessage(content) — POST to API, handle SSE stream
    - Set isStreaming = true
    - Create optimistic user message in state
    - Open EventSource / fetch with ReadableStream
    - Append tokens to currentStreamContent as they arrive
    - On stream end: save full assistant message, isStreaming = false
  setModel(model)
```

---

### `frontend/src/hooks/useStreamResponse.ts`
**Purpose:** Custom hook to handle SSE streaming from backend.
```
Parameters: url, body, onToken(token), onComplete(fullText), onError(err)
Implementation:
  Uses fetch() with { method: 'POST', body: JSON.stringify(body) }
  Reads response.body as ReadableStream
  TextDecoder to decode chunks
  Parse SSE format: lines starting with "data: "
  Call onToken() for each token, onComplete() when stream ends
Returns: { start(), abort(), isStreaming }
```

---

### `frontend/src/pages/TranslatorPage.tsx`
**Purpose:** Image translation interface.
```
Layout: flex row
  Left (65%): <PageViewer /> + <ControlBar /> + <ActionBar />
  Right (35%): <FileUploader /> or <OriginalPanel /> + model/lang selectors
State: reads translatorStore
onUpload(file): translatorStore.uploadFile(file)
Polls job status every 2s when job.status === 'processing'
```

---

### `frontend/src/store/translatorStore.ts`
**Purpose:** Zustand store for translator state.
```
State:
  jobs: TranslationJob[]
  activeJobId: string | null
  currentPage: number
  isUploading: boolean
  sourceLanguage: string
  targetLanguage: string

Actions:
  uploadFile(file) — POST multipart/form-data to /api/v1/translate/upload
  loadJobs() — GET /api/v1/translate/jobs
  selectJob(id) — set activeJobId, reset currentPage to 1
  pollJobStatus(id) — GET /api/v1/translate/jobs/{id} every 2s until done
  nextPage() / prevPage() — update currentPage
  retranslate(id) — POST /api/v1/translate/jobs/{id}/retranslate
  downloadZip(id) — GET /api/v1/translate/jobs/{id}/download, trigger file download
  deleteJob(id)
```

---

### `frontend/src/lib/axios.ts`
**Purpose:** Configured Axios instance with auth interceptors.
```
baseURL: import.meta.env.VITE_API_URL (e.g., http://localhost:8000)
Request interceptor: attach Bearer token from authStore
Response interceptor:
  On 401 → call /api/v1/auth/refresh to get new token
  If refresh fails → logout user, redirect to /login
  Retry original request with new token
```

---

### `frontend/src/types/chat.types.ts`
**Purpose:** TypeScript interfaces for chat domain.
```typescript
interface Conversation {
  id: string
  title: string
  model_used: string
  created_at: string
  updated_at: string
  message_count: number
}

interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens_used?: number
  created_at: string
}

interface SendMessagePayload {
  content: string
  model?: string
}
```

---

## ⚙️ Backend Files

---

### `backend/app/main.py`
**Purpose:** FastAPI application factory and global middleware.
```python
Functions/Setup:
- Create FastAPI() instance with title, version, docs_url
- Add CORSMiddleware (origins from config)
- Add rate limiting middleware (slowapi)
- Include all routers with prefix /api/v1
- Add startup event: create DB tables if not exist
- Add shutdown event: cleanup
- /health endpoint: returns { status: "ok", timestamp }
- Exception handlers: HTTPException, ValidationError, generic 500
```

---

### `backend/app/core/config.py`
**Purpose:** Centralized settings from environment variables.
```python
class Settings(BaseSettings):
  DATABASE_URL: str = "sqlite:///./app.db"
  SECRET_KEY: str
  ALGORITHM: str = "HS256"
  ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
  REFRESH_TOKEN_EXPIRE_DAYS: int = 7
  AI_SERVER_URL: str = "http://localhost:8001"
  UPLOAD_DIR: str = "./uploads"
  MAX_UPLOAD_SIZE_MB: int = 100
  ALLOWED_ORIGINS: list[str] = ["http://localhost:5173"]

  class Config:
    env_file = ".env"

settings = Settings()
```

---

### `backend/app/core/database.py`
**Purpose:** SQLAlchemy engine, session factory, and base model.
```python
Functions:
- engine = create_async_engine(settings.DATABASE_URL) 
- AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession)
- async def get_db() → yields AsyncSession (dependency)
- Base = declarative_base()
```

---

### `backend/app/core/security.py`
**Purpose:** Password hashing and JWT token utilities.
```python
Functions:
- hash_password(plain: str) → str  # bcrypt hash
- verify_password(plain: str, hashed: str) → bool
- create_access_token(data: dict) → str  # JWT with exp
- create_refresh_token(data: dict) → str  # longer-lived JWT
- decode_token(token: str) → dict | None  # returns payload or None
```

---

### `backend/app/models/user.py`
**Purpose:** User ORM model.
```python
class User(Base):
  __tablename__ = "users"
  id: UUID (primary key, default uuid4)
  email: str (unique, indexed)
  username: str (unique, indexed)
  hashed_password: str
  is_active: bool = True
  is_verified: bool = False
  created_at: datetime
  updated_at: datetime

  # Relationships:
  pomodoro_sessions: list[PomodoroSession]
  conversations: list[ChatConversation]
  translation_jobs: list[TranslationJob]
```

---

### `backend/app/routers/auth.py`
**Purpose:** Authentication endpoints.
```python
Endpoints:
- POST /register
    Body: RegisterSchema (email, username, password)
    → validate unique email/username
    → hash password
    → create User in DB
    → return UserResponse + tokens

- POST /login
    Body: LoginSchema (email, password)
    → lookup user by email
    → verify_password()
    → create access + refresh tokens
    → return TokenResponse

- POST /logout
    Auth required
    → invalidate refresh token in DB (or just client-side)

- POST /refresh
    Body: { refresh_token: str }
    → decode refresh token
    → issue new access token

- GET /me
    Auth required
    → return current user profile
```

---

### `backend/app/routers/chat.py`
**Purpose:** Chat conversation and messaging endpoints.
```python
Endpoints:
- POST /conversations → create new conversation, return ConversationResponse
- GET /conversations → list user's conversations (paginated)
- GET /conversations/{id} → get conversation detail + messages
- DELETE /conversations/{id} → soft delete
- POST /conversations/{id}/messages
    Body: { content: str, model: str? }
    → save user message to DB
    → forward to AI server with full message history
    → stream AI response back via SSE (StreamingResponse)
    → save complete AI response to DB on stream end
- GET /models → proxy GET /v1/models from AI server
```

---

### `backend/app/services/chat_service.py`
**Purpose:** Business logic for chat operations.
```python
Functions:
- create_conversation(user_id, title?) → Conversation
- get_conversations(user_id, skip, limit) → list[Conversation]
- get_conversation_with_messages(id, user_id) → Conversation + messages
- add_message(conversation_id, role, content) → Message
- stream_ai_response(conversation_id, user_message, model)
    → build message history list from DB
    → POST to AI server /v1/chat/completions with stream=True
    → yield tokens as SSE events
    → save full response when complete
- auto_title_conversation(conversation_id)
    → if it's the first message, ask AI for a short title
    → PATCH conversation title
```

---

### `backend/app/routers/translator.py`
**Purpose:** Image translation job endpoints.
```python
Endpoints:
- POST /upload
    Form: file (UploadFile), source_lang, target_lang
    → validate file type (jpg/png/cbz)
    → save file to UPLOAD_DIR
    → create TranslationJob in DB (status=pending)
    → trigger background task: process_translation_job(job_id)
    → return job immediately (don't wait)

- GET /jobs → list user's jobs with status
- GET /jobs/{id} → job detail + page list + status
- GET /jobs/{id}/pages/{num}/original → return image file (FileResponse)
- GET /jobs/{id}/pages/{num}/translated → return translated image (FileResponse)
- POST /jobs/{id}/retranslate → reset status, trigger background task again
- GET /jobs/{id}/download → create ZIP of all translated pages, return StreamingResponse
- DELETE /jobs/{id} → delete job + files from disk + DB records
```

---

### `backend/app/services/translator_service.py`
**Purpose:** Orchestrates the full translation pipeline.
```python
Functions:
- async process_translation_job(job_id: UUID, db: Session)
    1. Load job from DB, set status = 'processing'
    2. If .cbz: extract images from ZIP
    3. For each image page:
        a. Call OCR service → get text regions + bounding boxes
        b. If no text found: copy original, mark page as 'no_text'
        c. Send text + image to AI server /v1/translate/image
        d. Overlay translated text onto image using Pillow
        e. Save translated image to disk
        f. Create TranslationPage record in DB
    4. Set job status = 'completed'
    5. On any error: set status = 'failed', store error message

- create_zip_stream(job_id) → AsyncGenerator[bytes]
    → stream ZIP bytes of all translated pages
```

---

### `backend/app/utils/ai_client.py`
**Purpose:** Async HTTP client wrapper for the AI server.
```python
class AIServerClient:
  base_url: str (from settings.AI_SERVER_URL)
  client: httpx.AsyncClient

  async def chat_stream(messages, model, ...) → AsyncGenerator[str]
    POST /v1/chat/completions with stream=True
    Yield each SSE token

  async def translate_image(image_b64, source_lang, target_lang) → dict
    POST /v1/translate/image
    Return { original_text, translated_text, boxes }

  async def list_models() → list[str]
    GET /v1/models
```

---

## 🤖 AI Server Files

---

### `ai_server/app/main.py`
**Purpose:** FastAPI AI inference server entry point.
```python
- Create FastAPI() instance (no auth — internal network only)
- Include routers: chat, models, translate
- Startup event: pre-load default model from config
- /v1/health → { status, model_loaded, model_name, vram_usage_mb }
```

---

### `ai_server/app/services/model_manager.py`
**Purpose:** Singleton that manages loading/unloading GGUF models.
```python
class ModelManager:
  _instance: ModelManager (singleton)
  _model: Llama | None
  _current_model_name: str | None
  _lock: asyncio.Lock

  async def load_model(model_name: str)
    → acquire lock
    → if same model already loaded: return
    → unload current model (del self._model, gc.collect())
    → find .gguf file in models/ dir
    → self._model = Llama(model_path=..., n_ctx=4096, n_gpu_layers=-1)
    → release lock

  def get_model() → Llama
    → raise if not loaded

  def list_models() → list[str]
    → scan models/ dir for *.gguf files

  async def generate_stream(messages, max_tokens, temperature, ...) → AsyncGenerator[str]
    → call self._model.create_chat_completion(stream=True)
    → yield token strings
```

---

### `ai_server/app/routers/chat.py`
**Purpose:** OpenAI-compatible chat completion endpoint.
```python
POST /v1/chat/completions
Body: { model, messages, stream, max_tokens, temperature, ... }

If stream=True:
  → async def event_generator()
      async for token in model_manager.generate_stream(...)
        yield f"data: {json.dumps({'choices': [{'delta': {'content': token}}]})}\n\n"
      yield "data: [DONE]\n\n"
  → return StreamingResponse(event_generator(), media_type="text/event-stream")

If stream=False:
  → call model_manager._model.create_chat_completion(stream=False)
  → return full response JSON
```

---

### `ai_server/app/services/ocr_service.py`
**Purpose:** Wrapper around EasyOCR or Manga-OCR.
```python
class OCRService:
  _reader: easyocr.Reader | None
  
  def initialize(langs=['ja', 'en'])
    → self._reader = easyocr.Reader(langs, gpu=True)

  def extract_text(image_path: str) → list[TextRegion]
    → results = self._reader.readtext(image_path)
    → return list of TextRegion(bbox, text, confidence)

  def extract_text_from_array(img: np.ndarray) → list[TextRegion]
    → same but takes numpy array (for in-memory processing)

dataclass TextRegion:
  bbox: list[list[int]]  # [[x1,y1],[x2,y1],[x2,y2],[x1,y2]]
  text: str
  confidence: float
```

---

### `ai_server/app/services/translation_service.py`
**Purpose:** Full pipeline: OCR → LLM translate → overlay onto image.
```python
Functions:
- async translate_image_file(image_path, source_lang, target_lang) → TranslationResult
  1. Load image with Pillow
  2. OCR: extract text regions
  3. Build translation prompt with all extracted text
  4. Call model to translate all text at once (batch, not per-region)
  5. Parse model output → map translated strings back to regions
  6. Overlay: for each region, draw white rectangle, render translated text
  7. Return TranslationResult(original_image, translated_image_bytes, text_map)

- overlay_text(image, region, translated_text)
  → calculate font size from bounding box dimensions
  → use Pillow ImageDraw + ImageFont (NotoSansCJK)
  → draw background box, then draw text
```

---

# 4. Environment Preparation

## 4.1 Your Machine Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 10 / macOS 12 / Ubuntu 20.04 | Ubuntu 22.04 LTS |
| RAM | 16 GB | 32 GB |
| GPU VRAM | 0 GB (CPU only, slow) | 8 GB NVIDIA (RTX 3070+) |
| Disk Space | 50 GB free | 100 GB free |
| CPU | 8 cores | 12+ cores |
| Node.js | 18.x | 20.x LTS |
| Python | 3.10 | 3.11 |

---

## 4.2 Software to Install

### System Tools
```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y \
  git curl wget build-essential \
  python3.11 python3.11-venv python3-pip \
  libpq-dev libffi-dev libssl-dev \
  tesseract-ocr tesseract-ocr-jpn \
  ffmpeg imagemagick \
  docker.io docker-compose-plugin \
  nginx certbot python3-certbot-nginx

# macOS (Homebrew)
brew install git python@3.11 node@20 docker docker-compose tesseract

# Windows — use WSL2 (Ubuntu) + Docker Desktop
```

### Node.js (via NVM — recommended)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
node -v  # should output v20.x.x
```

### NVIDIA CUDA (if you have an NVIDIA GPU)
```bash
# Check GPU
nvidia-smi

# Install CUDA toolkit (Ubuntu)
sudo apt install -y nvidia-cuda-toolkit

# Build llama-cpp-python with CUDA support
CMAKE_ARGS="-DLLAMA_CUBLAS=on" pip install llama-cpp-python --force-reinstall
```

---

## 4.3 Environment Variables

### Root `.env.example`
```bash
# Copy to .env in each service folder

# ─── BACKEND (/backend/.env) ───────────────────────
DATABASE_URL=sqlite+aiosqlite:///./app.db
# For PostgreSQL (Phase 2):
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/ai_website

SECRET_KEY=your-super-secret-key-change-this-in-production-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

AI_SERVER_URL=http://localhost:8001
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=100

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
ENVIRONMENT=development

# ─── AI SERVER (/ai_server/.env) ───────────────────
DEFAULT_MODEL=llama-3.1-8b-instruct-q4_k_m.gguf
MODELS_DIR=./models
N_GPU_LAYERS=-1      # -1 = all layers on GPU, 0 = CPU only
N_CTX=4096           # context window size
N_THREADS=8          # CPU threads (set to your CPU core count)
MAX_CONCURRENT_REQUESTS=3
PORT=8001

# ─── FRONTEND (/frontend/.env) ─────────────────────
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=MyAI Space
VITE_DEFAULT_MUSIC_URL=https://www.youtube.com/watch?v=jfKfPfyJRdk

# ─── PRODUCTION ONLY ───────────────────────────────
# DOMAIN=yourdomain.com
# SSL_EMAIL=you@email.com
# POSTGRES_USER=appuser
# POSTGRES_PASSWORD=strongpassword
# POSTGRES_DB=ai_website
```

---

## 4.4 Project Setup Commands (First Time)

```bash
# 1. Clone repo
git clone https://github.com/yourname/personal-ai-website.git
cd personal-ai-website

# 2. Set up Frontend
cd frontend
cp .env.example .env
npm install
npm run dev   # should open http://localhost:5173

# 3. Set up Backend
cd ../backend
python3.11 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head      # create DB tables
uvicorn app.main:app --reload --port 8000
# visit http://localhost:8000/docs

# 4. Set up AI Server
cd ../ai_server
python3.11 -m venv venv
source venv/bin/activate
# Install WITH GPU support (NVIDIA):
CMAKE_ARGS="-DLLAMA_CUBLAS=on" pip install llama-cpp-python
# Install CPU only:
pip install llama-cpp-python
pip install -r requirements.txt
cp .env.example .env

# Download a model (example: LLaMA 3.1 8B Q4_K_M ~4.7GB)
mkdir -p models
wget -P models/ https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf

uvicorn app.main:app --port 8001
# visit http://localhost:8001/v1/health

# 5. Run all with Docker (alternative)
cd ..
cp .env.example .env
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

---

## 4.5 Recommended VS Code Extensions

```
# Install these for best dev experience:
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)
- TypeScript Error Lens (usernamehw.errorlens)
- Python (ms-python.python)
- Pylance (ms-python.vscode-pylance)
- REST Client (humao.rest-client)  # test APIs without Postman
- Docker (ms-azuretools.vscode-docker)
- GitLens (eamodio.gitlens)
- Auto Rename Tag (formulahendry.auto-rename-tag)
```

---

## 4.6 Recommended Models to Download

```bash
# ── Text Chat Models (choose one based on your VRAM) ──────────────
# 4GB VRAM:  Phi-3 Mini 4K Q4  (~2.2GB)
wget https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf

# 8GB VRAM:  LLaMA 3.1 8B Q4_K_M  (~4.7GB)  ← Recommended
wget https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf

# 16GB VRAM: Mistral 7B v0.3 Q8  (~7.7GB)
wget https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/mistral-7b-instruct-v0.3.Q8_0.gguf

# ── Vision Model for Image Translation ───────────────────────────
# LLaVA 1.6 Mistral 7B  (~4.1GB)
wget https://huggingface.co/cjpais/llava-1.6-mistral-7b-gguf/resolve/main/llava-1.6-mistral-7b.Q4_K_M.gguf
# Also need its mmproj (multi-modal projector):
wget https://huggingface.co/cjpais/llava-1.6-mistral-7b-gguf/resolve/main/mmproj-model-f16.gguf
```

---

# 5. Database Structure

## 5.1 Overview

- **Phase 1 (MVP):** SQLite via SQLAlchemy async (`aiosqlite`)
- **Phase 2:** PostgreSQL via `asyncpg` — same ORM models, just change `DATABASE_URL`
- **ORM:** SQLAlchemy 2.0 with `DeclarativeBase`
- **Migrations:** Alembic (auto-generate from model changes)

---

## 5.2 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                            USERS                                │
│  PK  id            UUID                                         │
│      email         VARCHAR(255) UNIQUE NOT NULL                 │
│      username      VARCHAR(100) UNIQUE NOT NULL                 │
│      hashed_pass   VARCHAR(255) NOT NULL                        │
│      is_active     BOOLEAN DEFAULT TRUE                         │
│      created_at    TIMESTAMP                                    │
│      updated_at    TIMESTAMP                                    │
└───────────────┬──────────────────────────────────────────┬──────┘
                │1                                         │1
                │                                          │
    ────────────┼────────────────            ──────────────┼──────────────────
    │           │               │            │             │                  │
    │N          │N              │N           │N            │N                 │N
    ▼           ▼               ▼            ▼             ▼                  ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  ┌──────────┐  ┌────────────┐
│ POMODORO │ │   CHAT   │ │  TRANS-  │ │  CHAT    │  │  TRANS-  │  │   USER     │
│ SESSIONS │ │  CONVER- │ │  LATION  │ │ MESSAGES │  │  LATION  │  │ SETTINGS   │
│          │ │  SATIONS │ │   JOBS   │ │          │  │  PAGES   │  │            │
└──────────┘ └──────────┘ └──────────┘ └──────────┘  └──────────┘  └────────────┘
                │1                          ▲              ▲
                │                          │              │
                │──────────────────────────┘N             │
                │                                         │
                │─────────────────────────────────────────┘N
                │(via translation_jobs.id)
```

---

## 5.3 Full Schema Definitions

### Table: `users`
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    username        VARCHAR(100) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url      VARCHAR(500),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

---

### Table: `user_settings`
```sql
CREATE TABLE user_settings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme                   VARCHAR(50) DEFAULT 'night-garden',
    font_size               INTEGER DEFAULT 14,
    music_url               TEXT DEFAULT 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    preferred_chat_model    VARCHAR(255),
    preferred_vision_model  VARCHAR(255),
    pomodoro_work_minutes   INTEGER DEFAULT 25,
    pomodoro_short_break    INTEGER DEFAULT 5,
    pomodoro_long_break     INTEGER DEFAULT 15,
    auto_start_breaks       BOOLEAN DEFAULT FALSE,
    notification_sound      BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)  -- one settings row per user
);
```

---

### Table: `pomodoro_sessions`
```sql
CREATE TABLE pomodoro_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type    VARCHAR(20) NOT NULL CHECK (session_type IN ('work', 'short_break', 'long_break')),
    duration_minutes INTEGER NOT NULL,
    completed       BOOLEAN NOT NULL DEFAULT FALSE,
    started_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at    TIMESTAMP WITH TIME ZONE,
    notes           TEXT
);

CREATE INDEX idx_pomodoro_user_id ON pomodoro_sessions(user_id);
CREATE INDEX idx_pomodoro_started_at ON pomodoro_sessions(started_at);
```

---

### Table: `chat_conversations`
```sql
CREATE TABLE chat_conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) DEFAULT 'New Conversation',
    model_used      VARCHAR(255),
    system_prompt   TEXT,
    message_count   INTEGER DEFAULT 0,
    is_archived     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX idx_conversations_updated ON chat_conversations(updated_at DESC);
```

---

### Table: `chat_messages`
```sql
CREATE TABLE chat_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role                VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content             TEXT NOT NULL,
    tokens_used         INTEGER,
    generation_ms       INTEGER,   -- how long the model took to respond
    model_used          VARCHAR(255),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_messages_created_at ON chat_messages(created_at);
```

---

### Table: `translation_jobs`
```sql
CREATE TABLE translation_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename   VARCHAR(500) NOT NULL,
    file_path       VARCHAR(1000) NOT NULL,   -- path on disk
    file_size_bytes BIGINT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    source_language VARCHAR(10) DEFAULT 'auto',
    target_language VARCHAR(10) DEFAULT 'en',
    model_used      VARCHAR(255),
    page_count      INTEGER DEFAULT 0,
    error_message   TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at      TIMESTAMP WITH TIME ZONE,
    completed_at    TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_jobs_user_id ON translation_jobs(user_id);
CREATE INDEX idx_jobs_status ON translation_jobs(status);
```

---

### Table: `translation_pages`
```sql
CREATE TABLE translation_pages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id              UUID NOT NULL REFERENCES translation_jobs(id) ON DELETE CASCADE,
    page_number         INTEGER NOT NULL,
    original_path       VARCHAR(1000) NOT NULL,      -- path to original image
    translated_path     VARCHAR(1000),               -- path to translated image (null if failed)
    ocr_raw_text        TEXT,                        -- all extracted text (JSON array)
    translated_text     TEXT,                        -- all translated text (JSON array)
    has_text            BOOLEAN DEFAULT FALSE,        -- false if no text found
    processing_status   VARCHAR(20) DEFAULT 'pending'
                        CHECK (processing_status IN ('pending', 'processing', 'done', 'no_text', 'failed')),
    error_message       TEXT,
    processing_ms       INTEGER,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(job_id, page_number)
);

CREATE INDEX idx_pages_job_id ON translation_pages(job_id);
CREATE INDEX idx_pages_job_page ON translation_pages(job_id, page_number);
```

---

### Table: `user_sessions` *(for refresh token management)*
```sql
CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash  VARCHAR(255) NOT NULL UNIQUE,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    is_revoked      BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(refresh_token_hash);
```

---

## 5.4 Alembic Migration Workflow

```bash
# Create a new migration after changing a model
alembic revision --autogenerate -m "add_user_settings_table"

# Apply all pending migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1

# See current migration status
alembic current

# See migration history
alembic history --verbose
```

---

## 5.5 Key SQL Queries Reference

```sql
-- Dashboard: Focus stats for user
SELECT
    COUNT(*) FILTER (WHERE session_type = 'work' AND completed = TRUE) AS total_sessions,
    COALESCE(SUM(duration_minutes) FILTER (WHERE session_type = 'work' AND completed = TRUE), 0) AS total_focus_minutes,
    COUNT(*) FILTER (WHERE session_type = 'work' AND completed = TRUE AND started_at >= NOW() - INTERVAL '1 day') AS sessions_today
FROM pomodoro_sessions
WHERE user_id = :user_id;

-- Dashboard: Daily focus chart (last 7 days)
SELECT
    DATE(started_at) AS day,
    SUM(duration_minutes) AS total_minutes
FROM pomodoro_sessions
WHERE user_id = :user_id
  AND session_type = 'work'
  AND completed = TRUE
  AND started_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(started_at)
ORDER BY day;

-- Chat: Get messages for a conversation (newest first, paginated)
SELECT * FROM chat_messages
WHERE conversation_id = :conversation_id
ORDER BY created_at ASC
LIMIT 100;

-- Translator: Get all pages for a job ordered
SELECT * FROM translation_pages
WHERE job_id = :job_id
ORDER BY page_number ASC;

-- Clean up stale 'processing' jobs (scheduled cleanup task)
UPDATE translation_jobs
SET status = 'failed', error_message = 'Timeout: processing exceeded 30 minutes'
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '30 minutes';
```

---

## 5.6 File Storage Structure (on Disk)

```
uploads/                            # UPLOAD_DIR from config
└── {user_id}/
    └── {job_id}/
        ├── original/
        │   ├── page_001.jpg        # extracted pages from CBZ or original upload
        │   ├── page_002.jpg
        │   └── ...
        └── translated/
            ├── page_001.jpg        # translated overlay images
            ├── page_002.jpg
            └── ...
```

> ⚠️ **Important:** Never store raw files in the DB (no BLOBs). Always store file paths. The DB stores metadata; the filesystem stores file bytes.

---

*Document version: 1.0 | Last updated: February 2026 | Maintained by: Product Owner*
