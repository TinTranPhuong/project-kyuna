<div align="center">


# KYUNA


**A fully local, self-hosted personal workspace with AI. No cloud. No subscriptions. No data leaving your machine.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)](https://python.org)
[![llama.cpp](https://img.shields.io/badge/llama.cpp-GGUF-8B5CF6?style=flat-square)](https://github.com/ggerganov/llama.cpp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)


</div>

---

## What is Kyuna?

Kyuna is a personal AI workspace that runs entirely on your own GPU. It combines a multi-mode conversational AI with long-term memory, an autonomous agentic pipeline, document RAG, and image translation — all self-hosted with zero external API calls.

- **Chat** with a local LLM that remembers you across sessions via automatic fact extraction
- **Agentic Mode** — an 11-step autonomous pipeline that plans, executes, reflects, evaluates, and self-corrects
- **RAG** — upload documents and have the AI retrieve and reference them in every reply
- **Translate** images to English using a 6-stage OCR + LLM pipeline
- **Control your memory** — view, edit, promote, or delete every fact the AI has learned about you

---

## Architecture

```
┌─────────────────┐     REST / SSE      ┌──────────────────────┐
│  React Frontend │ ──────────────────► │  FastAPI Backend     │
│  Vite + TS      │ ◄────────────────── │  Port 8000           │
└─────────────────┘   streaming tokens  └───────────┬──────────┘
                                                    │ /v1/* (internal only)
                                                    ▼
                                        ┌──────────────────────┐
                                        │  AI Inference Server │
                                        │  llama.cpp + CUDA    │
                                        │  Port 8001           │
                                        └──────────────────────┘
                                                    │
                 ┌──────────────────────────────────┼───────────────────────┐
                 ▼                                  ▼                       ▼
        ┌──────────────┐                 ┌────────────────┐       ┌─────────────────┐
        │  PostgreSQL  │                 │  Qdrant        │       │  Local Models   │
        │  Port 5432   │                 │  Port 6333     │       │  .gguf files    │
        └──────────────┘                 └────────────────┘       └─────────────────┘
```

| Service     | Port | Role                                                               |
|-------------|------|--------------------------------------------------------------------|
| `frontend`  | 5173 | React UI (Vite)                                                    |
| `backend`   | 8000 | FastAPI API, auth, RAG, orchestration, agentic pipeline             |
| `ai_server` | 8001 | llama.cpp inference — chat, memory extraction, translation, vision |
| `qdrant`    | 6333 | Vector similarity search (3 collections)                           |
| `postgres`  | 5432 | User data, chat history, memory facts, documents                   |

> The frontend never calls the AI server directly. All inference goes through the backend, which handles auth, context injection, and database writes.

---

## Chat Modes

Kyuna supports four distinct chat modes, each with a dedicated system prompt and configured model:

| Mode | Model Slot | Character |
|------|-----------|-----------|
| **Fast** | `CHAT_MODEL_FAST` | Concise, direct. Optimized for quick Q&A. |
| **Thinking** | `CHAT_MODEL_THINKING` | Deep reasoning. Uses extended chain-of-thought with `<think>` tags stripped from output. |
| **Creative** | `CHAT_MODEL_CREATIVE` | Expansive, imaginative. Artistic and narrative-focused persona. |
| **Agentic** | `CHAT_MODEL_ORCHESTRATOR` + `CHAT_MODEL_AGENT` | Autonomous multi-step pipeline (see below). |

Each chat response is streamed via **Server-Sent Events (SSE)** back to the frontend. Every reply is preceded by a `memory_context` SSE event reporting how many memories, document chunks, and universal facts were injected.

---

## RAG — Retrieval Augmented Generation

Every message goes through a full RAG pipeline before reaching the model:

```
User message
     │
     ├─ 1. Embed query ──────────────► nomic-embed-text (768-dim vectors, "search_query:" prefix)
     │
     ├─ 2. Parallel vector search (asyncio.gather):
     │       • conversation_memories  (top_k=5, threshold=0.72) — extracted personal facts
     │       • documents              (top_k=3, threshold=0.55) — uploaded file chunks
     │       • universal_facts        (PostgreSQL direct)       — permanent "always remember" entries
     │
     ├─ 3. Context Assembly (3,200 token budget):
     │       • Universal facts always included first (never trimmed)
     │       • Memories fill remaining budget/2, sorted by cosine score
     │       • Document chunks fill the rest, with filename+page citation
     │
     └─ 4. Inject into system prompt → stream response via SSE
```

### Memory Extraction (Background Worker)

After every N turns (`EXTRACTION_EVERY_N_TURNS`, default 3), a background `asyncio.create_task` calls `run_extraction()`:

1. Fetches the last 12 messages from PostgreSQL
2. POSTs them to `POST /v1/memory/extract` on the AI server
3. The AI server strips `<think>` tags, extracts a JSON array of facts (`subject`, `predicate`, `object`, `raw`, `confidence`)
4. Each fact is embedded and checked for near-duplicates via Qdrant (threshold 0.88)
5. New facts are committed to PostgreSQL and upserted to Qdrant with the same UUID, `qdrant_synced=True` only after confirmed write

### Memory Layers

| Layer | Description | Storage |
|-------|-------------|---------|
| **Conversation memories** | Facts auto-extracted after each conversation block | PostgreSQL + Qdrant (`conversation_memories`) |
| **Universal facts** | User-promoted permanent facts — always injected, never filtered | PostgreSQL + Qdrant (`universal_facts`) |
| **Document library** | Uploaded PDFs/DOCX/TXT, chunked at 400 tokens with 50-token overlap | PostgreSQL + Qdrant (`documents`) |

---

## Agentic Mode — Autonomous Workflow Engine

Toggle **Agentic Mode** from the chat interface to activate the full autonomous pipeline. Instead of a single model reply, your request is processed by **11 coordinated stages** distributed across specialized agents:

```

          User Request
               │
               ▼
          ┌────────────────────────────────────────────────────────────────────┐
          │  Stage 1  │ Memory Agent       │ Parallel retrieval from all 3     │
          │           │                    │ Qdrant collections + AI format    │
          ├───────────┼────────────────────┼───────────────────────────────────│
          │  Stage 2  │ Reflector (mid)    │ Reviews context before planning   │
          ├───────────┼────────────────────┼───────────────────────────────────│
          │  Stage 3  │ Orchestrator       │ Produces JSON step-by-step plan   │
          │           │                    │ (model: CHAT_MODEL_ORCHESTRATOR)  │
          ├───────────┼────────────────────┼───────────────────────────────────│
          │  Gate 1   │ User Approval      │ UI halts — user edits/approves    │
          ├───────────┼────────────────────┼───────────────────────────────────│
          │  Stage 4  │ Executor           │ Sequential step runner with       │
          │           │                    │ WorkingMemory accumulation        │
          │           │  ├─ Sub-Agents ──► │ Analysis, Coding, Translator,     │
          │           │  │                 │ Web Search, Content Writing       │
          │           │  └─ Tool calls ──► │ memory_search, doc_search,        │
          │           │                    │ web_search, web_fetch             │
          ├───────────┼────────────────────┼───────────────────────────────────│
          │  Gate 2   │ HITL Dispatcher    │ Destructive tools (memory_write,  │
          │           │                    │ memory_delete) pause and wait for │
          │           │                    │ explicit user confirm/cancel      │
          ├───────────┼────────────────────┼───────────────────────────────────│
          │  Stage 5  │ Reflector (exec)   │ Reviews raw tool results for gaps │
          ├───────────┼────────────────────┼───────────────────────────────────│
          │  Stage 6  │ Synthesizer        │ Drafts coherent final response    │
          │           │                    │ from all WorkingMemory results    │
          ├───────────┼────────────────────┼───────────────────────────────────│
          │  Stage 7  │ Evaluator          │ JSON score: passed, failed_steps, │
          │           │                    │ feedback vs. original plan        │
          ├───────────┼────────────────────┼───────────────────────────────────│
          │  Stage 8  │ Consensus          │ Two independent AI passes must    │
          │           │                    │ both agree the answer is valid    │
          ├───────────┼────────────────────┼───────────────────────────────────│
          │  Stage 9  │ Reflector (final)  │ JSON gate: {is_satisfactory,      │
          │           │                    │ feedback}. If false → redo loop   │
          │           │                    │ back to Synthesizer (max 3×)      │
          ├───────────┼────────────────────┼───────────────────────────────────│
          │  Stage 10 │ Final Output       │ Verified markdown streamed        │
          │           │                    │ and saved to PostgreSQL           │
          └────────────────────────────────────────────────────────────────────┘

```

### Sub-Agents

Each sub-agent runs on `CHAT_MODEL_AGENT` with a specialized system prompt and a restricted tool allowance:

| Sub-Agent | Allowed Tools | Focus |
|-----------|--------------|-------|
| `analysis` | `memory_search`, `doc_search` | Data analysis and research |
| `coding` | `web_search`, `web_fetch` | Code generation and debugging |
| `translator` | `doc_search`, `memory_search` | Language translation |
| `web_search` | `web_search`, `web_fetch` | Information retrieval from the web |
| `content_writing` | `memory_search` | Long-form writing and editing |

Sub-agents run an internal **tool-calling loop** (up to 3 iterations): if the model outputs a JSON `{tool_name, args}` block, the tool is dispatched and the result is fed back for the next iteration.

### HITL — Human in the Loop (Gate 2)

Destructive tools (`memory_write`, `memory_delete`, `memory_promote`, `doc_upload`, `doc_delete`) are flagged `requires_hitl: True` in the tool registry. When hit:

1. The dispatcher emits a `confirmation_required` SSE event to the UI
2. An `asyncio.Event` pauses the pipeline — no computation continues
3. The user explicitly approves or cancels in the chat interface
4. On approve: the tool executes normally. On cancel: returns `"cancelled"` and skips

---

## AI Server

The AI server wraps `llama.cpp` GGUF models behind a FastAPI service. Architecture highlights:

### Single-GPU Execution via Thread Isolation

All CUDA operations run on a single-threaded `ThreadPoolExecutor(max_workers=1, thread_name_prefix="llama_cuda_worker")`. Only one model occupies the GPU at a time. Swapping models executes the **Hangoff Protocol**:

```
1. model.close()                         — release llama.cpp context
2. del model                             — drop Python reference
3. llama_backend_free()                  — flush llama.cpp backend
4. llama_backend_init()                  — reinitialize backend
5. cuCtxSynchronize()                    — wait for all CUDA ops (nvcuda.dll)
6. EmptyWorkingSet(GetCurrentProcess())  — release Windows VRAM ghost memory
7. gc.collect() × 2                      — Python garbage collection
8. Load new model                        — now with full VRAM available
```

### Model Slots

| Slot | `.env` key | Purpose |
|------|-----------|---------|
| Text (fast) | `CHAT_MODEL_FAST` | Fast chat, vision multimodal |
| Text (thinking) | `CHAT_MODEL_THINKING` | Deep reasoning chat |
| Text (creative) | `CHAT_MODEL_CREATIVE` | Creative writing chat |
| Text (agent) | `CHAT_MODEL_AGENT` | Agents task execution |
| Text (orchestrator) | `CHAT_MODEL_ORCHESTRATOR` | Agents planning |
| Translation | `TRANSLATION_MODEL` | OCR translation |
| Vision | `CHAT_MODEL_FAST` + `MMPROJ_FILE` | Image understanding encoder |
| Embedding | `EMBEDDING_MODEL` | nomic-embed-text (768d) |
| Detector | `DETECTOR_MODEL` | PyTorch bubble detection |

> Vision and text models use **separate slots** with separate locks. They cannot be simultaneously loaded — loading one unloads the other via the Hangoff Protocol.

### Inference Parameters

All inference parameters are resolved at request time with a 3-tier priority:

```
Request field → .env setting → Hard fallback
```

Key parameters: `n_ctx` (default 32768), `n_gpu_layers` (-1 = all), `flash_attn`, `type_k/type_v` (Q4 KV cache), `top_k`, `min_p`, `repeat_penalty`.

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /v1/chat/completions` | OpenAI-compatible streaming SSE + non-streaming fallback |
| `POST /v1/memory/extract` | Extract structured facts from conversation (JSON array) |
| `POST /v1/embeddings` | Text embeddings with `search_query:` / `search_document:` prefix |
| `POST /v1/models/{name}/load` | Load a GGUF model (triggers Hangoff if swapping) |
| `POST /v1/models/{name}/unload` | Unload and free VRAM |
| `POST /v1/translate/ocr-pipeline` | YOLOv8 bubble detect + OCR on image |
| `POST /v1/translate/batch` | LLM batch translation of OCR'd regions |
| `POST /v1/translate/image/stream` | Vision LLM streaming translation |
| `GET /v1/health` | Model status, current model name, VRAM usage (MB) |

The chat endpoint also prints a **terminal Performance Report** after each generation: TTFT, tokens/sec, ms/token, VRAM usage, and GPU layer split status.

---

## Image Translation Pipeline

A 6-stage pipeline for image translation:

```
Image upload
     │
     Stage 1 ── Text bubble detection     (PyTorch YOLOv8)
     Stage 2 ── Bubble cropping           (OpenCV)
     Stage 3 ── OCR                       (EasyOCR / vision LLM)
     Stage 4 ── Hangoff Protocol          (unload OCR → flush VRAM → load LLM)
     Stage 5 ── Translation               (TRANSLATION_MODEL)
     Stage 6 ── Canvas overlay rendering  (React)
     │
     Result: original image with translated text overlaid in-browser
```

---

## Frontend

Built with **React 18 + Vite + TypeScript + Tailwind CSS**. All AI responses are consumed as Server-Sent Events (SSE) and progressively rendered in the UI.

### Pages

| Page | Route | Description |
|------|-------|-------------|
| **Home** | `/` | Dashboard with widgets (clock, timer, music player, notes) |
| **Chat** | `/chat` | Main chat interface — mode selector, SSE token streaming, memory context badge |
| **Memory** | `/memory` | View, edit, promote, and delete extracted facts and universal entries |
| **Documents** | `/docs` | Upload and manage documents for RAG |
| **Translator** | `/translator` | Image upload → OCR → translation canvas |
| **Notes** | `/notes` | Quick markdown notes |
| **Tools** | `/tools` | Utility tools (calculator, timer, etc.) |
| **Dashboard** | `/dashboard` | Usage stats and session overview |

### State Management (Zustand)

| Store | Manages |
|-------|---------|
| `authStore` | JWT tokens, current user, login/logout |
| `chatStore` | Conversations, messages, SSE streaming state, agentic run lifecycle |
| `memoryStore` | Memory facts, universal facts, pagination |
| `settingsStore` | User preferences, model selection, wallpaper |
| `translatorStore` | Translation jobs, OCR results, overlay canvas state |
| `timerStore` | Pomodoro sessions, timer state |
| `noteStore` | Notes CRUD |

### SSE Streaming Pattern

The chat interface consumes two separate SSE streams:

- **Regular chat**: `POST /api/v1/chat/{id}/stream` → events: `memory_context`, `token`, `[DONE]`
- **Agentic mode**: `POST /api/v1/agent/runs` → events: `agent_start`, `agent_end`, `plan_ready`, `confirmation_required`, `tool_start`, `tool_result`, `token`, `done`

The UI renders `agent_start`/`agent_end` events as a live **Execution Progress** panel that shows which agent is currently running, and clears itself when the pipeline completes.

---

## Backend

The FastAPI backend handles all orchestration, auth, and database writes. The AI server is never called directly from the frontend.

### API Routes

| Prefix | Router | Key Endpoints |
|--------|--------|---------------|
| `/api/v1/auth` | `auth.py` | Register, login (JWT), refresh token |
| `/api/v1/users` | `users.py` | Profile, password change, settings, account delete |
| `/api/v1/chat` | `chat.py` | CRUD conversations, `POST /{id}/stream` (RAG + SSE) |
| `/api/v1/agent` | `agent.py` | `POST /runs`, `POST /runs/{id}/plan/approve`, tool confirm/cancel |
| `/api/v1/memory` | `memory.py` | List/edit/delete facts, promote to universal, memory search |
| `/api/v1/docs` | `documents.py` | Upload, list, delete documents; background chunk + embed |
| `/api/v1/translate` | `translator.py` | Full 6-stage translation pipeline |
| `/api/v1/notes` | `note.py` | Notes CRUD |
| `/api/v1/sessions` | `sessions.py` | Pomodoro session tracking |
| `/api/v1/dashboard` | `dashboard.py` | Usage statistics |

### Database Models (PostgreSQL + SQLAlchemy async)

| Model | Table | Description |
|-------|-------|-------------|
| `User` | `users` | Auth, profile |
| `UserSettings` | `user_settings` | Preferences, wallpaper, music groups |
| `ChatConversation` | `chat_conversations` | Title, system prompt, message count |
| `ChatMessage` | `chat_messages` | Role, content, tokens used, generation_ms |
| `MemoryFact` | `memory_facts` | Subject/predicate/object triples, confidence, qdrant_synced |
| `UniversalFact` | `universal_facts` | Always-on facts, promoted from memory |
| `Document` | `documents` | Upload metadata, status, chunk count |
| `DocChunk` | `doc_chunks` | 400-token chunks with page + heading metadata |
| `ExtractionJob` | `extraction_jobs` | Background extraction status tracking |
| `AgentPlan` | `agent_plans` | JSON step plan, approval status |
| `AgentRun` | `agent_runs` | Run lifecycle, linked to plan |

### Middleware & Infrastructure

- **Auth**: JWT Bearer tokens (access + refresh), `passlib[bcrypt]` password hashing
- **Rate limiting**: `slowapi` on sensitive endpoints
- **CORS**: configurable `ALLOWED_ORIGINS` (default `http://localhost:5173`)
- **Connection pool**: `pool_size=5`, `max_overflow=15`, `pool_recycle=1800s`
- **Startup**: `create_all` (idempotent table creation) + Qdrant collection init via `lifespan()`
- **Migrations**: Alembic for schema changes

---

## Getting Started

### Prerequisites

- Python 3.11
- Node.js 22+
- CUDA-compatible GPU (16 GB VRAM or more recommended)
- PostgreSQL 16+
- Qdrant (native Windows binary, included in `qdrant/`)

### Installation

```bash
# 1. Clone
git clone https://github.com/your-user/project-kyuna.git
cd project-kyuna

# 2. Backend
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Edit DATABASE_URL, SECRET_KEY, AI_SERVER_URL

# 3. AI Server
cd ../ai_server
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Edit MODELS_DIR, model filenames

# 4. Frontend
cd ../frontend
npm install
cp .env.example .env        # Set VITE_API_URL=http://localhost:8000

# 5. Start everything (Windows)
start_kyuna.bat
```

### AI Server `.env` Reference

```env
MODELS_DIR=D:\models

# Model filenames — must exist in MODELS_DIR
CHAT_MODEL_FAST
CHAT_MODEL_THINKING
CHAT_MODEL_CREATIVE
CHAT_MODEL_AGENT
CHAT_MODEL_ORCHESTRATOR
TRANSLATION_MODEL
MMPROJ_FILE_
EMBEDDING_MODEL=nomic-embed-text-v1.5.Q8_0.gguf

# Inference
N_GPU_LAYERS=-1       # -1 if 16 GB VRAM or more
N_CTX=262144
MAX_TOKENS=262144
FLASH_ATTN=true
KV_TYPE_K=2           
KV_TYPE_V=2
TEMPERATURE=0.6
TOP_P=0.9
TOP_K=20
MIN_P=0.05
REPEAT_PENALTY=1
```

---

## Project Structure

```text
project-kyuna/
│
├── frontend/                           # React + Vite + TypeScript
│   └── src/
│       ├── components/                 # Reusable UI components
│       ├── hooks/                      # Custom React hooks
│       ├── pages/                      # Application pages
│       ├── services/                   # Axios API clients
│       ├── store/                      # Zustand state management
│       └── types/                      # TypeScript interfaces
│
├── backend/                            # FastAPI REST API
│   └── app/
│       ├── core/                       # Config, DB, security
│       ├── models/                     # SQLAlchemy ORM models
│       ├── routers/                    # API endpoints
│       ├── schemas/                    # Pydantic schemas
│       ├── services/
│       │   ├── agents/                 # Agentic pipeline
│       │   │   ├── sub_agents/         # Analysis, Coding, Translator, WebSearch, ContentWriting
│       │   │   ├── orchestrator.py     # JSON plan generation
│       │   │   ├── executor.py         # Sequential step runner
│       │   │   ├── dispatcher.py       # Tool dispatch + HITL Gate 2
│       │   │   ├── reflector.py        # 3-phase reflection (mid/exec/final)
│       │   │   ├── synthesizer.py      # Final answer synthesis
│       │   │   ├── evaluator.py        # JSON scoring vs. plan
│       │   │   ├── consensus.py        # Dual-pass fact/answer verification
│       │   │   ├── memory_agent.py     # Parallel 3-layer memory retrieval
│       │   │   └── tool_registry.py    # Tool definitions + HITL flags
│       │   ├── chat_service.py         # RAG pipeline + SSE streaming
│       │   ├── context_assembler.py    # Token-budget context builder
│       │   ├── embedding_service.py    # nomic-embed-text wrapper
│       │   ├── memory_service.py       # Memory CRUD + promote
│       │   ├── qdrant_service.py       # Vector DB operations
│       │   └── document_service.py     # Chunking, embedding, indexing
│       └── workers/
│           └── extraction_worker.py    # Background fact extraction
│
├── ai_server/                          # llama.cpp inference server
│   └── app/
│       ├── services/
│       │   └── model_manager.py        # Single-GPU CUDA executor + Hangoff Protocol
│       ├── routers/
│       │   ├── chat.py                 # OpenAI-compatible SSE endpoint
│       │   ├── memory.py               # Fact extraction endpoint
│       │   ├── embeddings.py           # Embedding endpoint
│       │   ├── models.py               # Model load/unload/list
│       │   └── translate.py            # OCR + translation pipeline
│       └── prompts/
│           ├── chats/                  # fast.md, thinking.md, creative.md
│           └── agents/                 # orchestrator.md, reflector.md,
│                                       # synthesizer.md, evaluator.md,
│                                       # consensus.md, memory_agent.md
│
└── qdrant/                             # Qdrant vector DB (native binary + data)
```

---

## Tech Stack

| Layer | Technologies |
|--------------------|-----------------------------------------------------------------------------|
| **Frontend** | React 18 · Vite · TypeScript · Tailwind CSS · Zustand · Framer Motion · SSE |
| **Backend** | FastAPI · SQLAlchemy (async) · PostgreSQL · asyncpg · Qdrant client · httpx |
| **AI Server** | llama.cpp · CUDA · PyTorch · OpenCV · EasyOCR · nomic-embed-text |
| **Infrastructure** | Qdrant native binary · PostgreSQL · Windows NSSM |

---

## License

MIT — see [LICENSE](LICENSE) for details.