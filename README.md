<div align="center">


# KYUNA


**A fully local, self-hosted personal workspace with AI. No cloud. No subscriptions. No data leaving your machine.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)](https://python.org)
[![llama.cpp](https://img.shields.io/badge/llama.cpp-GGUF-8B5CF6?style=flat-square)](https://github.com/ggerganov/llama.cpp)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)

</div>

---

## What is Kyuna?

Kyuna is a personal web workspace with AI that runs entirely on your own GPU. It combines a conversational AI with long-term memory, a chatbot, and a document library — all in a single self-hosted application with zero external API calls.

- **Chat** with a local LLM that remembers you across sessions via automatic fact extraction
- **Translate** images to English using a 6-stage OCR + LLM pipeline
- **Upload documents** and have the AI reference them in conversation
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
| `backend`   | 8000 | FastAPI API, auth, RAG orchestration                               |
| `ai_server` | 8001 | llama.cpp inference — chat, memory extraction, translation, vision |
| `qdrant`    | 6333 | Vector similarity search                                           |
| `postgres`  | 5432 | User data, chat history, memory facts                              |

> The frontend never calls the AI server directly. All inference goes through the backend, which handles authentication, context injection, and database writes.

---

## Features

### Chat with Long-Term Memory

Every message goes through a RAG pipeline before reaching the model:

```
User message
     │
     ├─ 1. Embed query ──────────────► nomic-embed-text (768d vectors)
     │
     ├─ 2. Parallel vector search:
     │       • conversation_memories  — past extracted facts
     │       • universal_facts        — permanent "always remember" entries  
     │       • documents              — uploaded PDFs and files
     │
     └─ 3. Assemble context (3,200 token budget) → inject into system prompt → stream response
```

After every reply, a **background extraction worker** reads the last N messages, prompts the LLM to identify memorable facts about you, and saves them to PostgreSQL + Qdrant — without blocking the response.

### Memory Manager

Three layers of memory, all user-editable from the `/memory` page:

| Layer                     | Description                                          | Storage             |
|---------------------------|------------------------------------------------------|---------------------|
| **Conversation memories** | Facts extracted automatically after each chat        | PostgreSQL + Qdrant |
| **Universal facts**       | Promoted facts — always injected, never filtered out | PostgreSQL + Qdrant |
| **Document library**      | Uploaded PDFs and text files, chunked and embedded   | PostgreSQL + Qdrant |

### Manga Translation Pipeline

A 6-stage pipeline for Image to Text translation:

```
Image upload
     │
     Stage 1 ── Text bubble detection     (PyTorch YOLOv8)
     Stage 2 ── Bubble cropping           (OpenCV)
     Stage 3 ── OCR                       (OCR / vision LLM)
     Stage 4 ── Hangoff Protocol          (unload OCR → flush VRAM → load LLM)
     Stage 5 ── Translation               (LLM)
     Stage 6 ── Canvas overlay rendering  (React)
     │
     Result: original image with translated text overlaid in-browser
```

**Hangoff Protocol** — switching between PyTorch OCR models and a large GGUF translation model on a single 16 GB GPU requires explicitly unloading models, flushing the CUDA cache, and calling `SetProcessWorkingSetSize` (Windows) to release VRAM ghost memory before loading the next model.

---

## AI Server

The AI server wraps `llama.cpp` GGUF models behind a FastAPI service. It uses a **single-threaded GPU executor** (`ThreadPoolExecutor(max_workers=1)`) — only one model can occupy the GPU at a time, and loading a new model automatically unloads the previous one.

### Model Slots

| Slot                           | Purpose                                        |
|--------------------------------|------------------------------------------------|
| `CHAT_MODEL`                   | Conversational AI — primary Kyuna persona      |
| `TRANSLATION_MODEL`            | OCR / Vision LLM                               |
| `VISION_MODEL` + `MMPROJ_FILE` | Vision / multimodal understanding              |
| `DETECTOR_MODEL`               | Comic text bubble detection (PyTorch)          |
| `EMBEDDING_MODEL`              | Sentence embeddings for RAG (nomic-embed-text) |

### Key Endpoints

| Endpoint                          | Description                                        |
|-----------------------------------|----------------------------------------------------|
| `POST /v1/chat/completions`       | Streaming chat — OpenAI-compatible SSE             |
| `POST /v1/memory/extract`         | Extract structured facts from a conversation       |
| `POST /v1/embeddings`             | Text embeddings for RAG                            |
| `POST /v1/models/{name}/load`     | Load a GGUF model by filename                      |
| `POST /v1/models/{name}/unload`   | Unload a model and free VRAM                       |
| `POST /v1/translate/ocr-pipeline` | Detect + OCR an image page                          |
| `POST /v1/translate/batch`        | Translate OCR'd regions                            |
| `POST /v1/translate/image/stream` | Vision LLM streaming translation                   |
| `GET /v1/health`                  | Model status + VRAM usage                          |

---

## Getting Started

### Prerequisites

- Python 3.11
- Node.js 22+
- CUDA-compatible GPU (16GB VRAM or more recommended)
- PostgreSQL 16+
- Qdrant (native Windows binary)

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
cp .env.example .env        # Edit MODELS_DIR, model filenames, MAX_TOKENS

# 4. Frontend
cd ../frontend
npm install
cp .env.example .env        # Edit VITE_API_URL

# 5. Start everything (Windows — run as Administrator)
start_kyuna.bat
```

```bat
rem Stop all services
stop_kyuna.bat
```

### AI Server `.env` Reference

```env
MODELS_DIR=D:\models

# Model filenames — must exist in MODELS_DIR
CHAT_MODEL=llm.gguf
VISION_MODEL=llm.gguf
TRANSLATE_MODEL=llm.gguf
MMPROJ_FILE=mmproj-llm.gguf
EMBEDDING_MODEL=nomic-embed-text-v1.5.Q8_0.gguf

# Inference
N_GPU_LAYERS=-1       # -1 = all layers on GPU
MAX_TOKENS=32768
CONTEXT_SIZE=32768
```

---

## Project Structure

```text
project-kyuna/
│
├── frontend/                           # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/                 # Reusable UI components
│   │   ├── hooks/                      # Custom React hooks
│   │   ├── layouts/                    # Page layouts
│   │   ├── lib/                        # Utility functions
│   │   ├── pages/                      # Application pages
│   │   ├── services/                   # Axios API clients
│   │   ├── store/                      # Zustand state management
│   │   ├── styles/                     # Global CSS/Tailwind
│   │   ├── types/                      # TypeScript interfaces
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── .env
│   ├── .eslintrc.cjs
│   ├── .prettierrc
│   ├── index.html
│   ├── package.json
│   ├── playwright.config.ts
│   ├── postcss.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                            # FastAPI REST API
│   ├── app/
│   │   ├── core/                       # App configuration and settings
│   │   ├── dependencies/               # FastAPI dependencies
│   │   ├── models/                     # SQLAlchemy ORM models
│   │   ├── routers/                    # API endpoints
│   │   ├── schemas/                    # Pydantic validation schemas
│   │   ├── services/                   # Business logic
│   │   ├── utils/                      # Helper functions
│   │   ├── workers/                    # Background tasks
│   │   └── main.py                     # FastAPI entry point
│   ├── migrations/                     # Alembic database migrations
│   ├── scripts/                        # Utility scripts
│   ├── uploads/                        # User uploaded files
│   ├── alembic.ini
│   ├── MIGRATIONS.md
│   ├── pyproject.toml
│   └── requirements.txt
│
├── ai_server/                          # llama.cpp inference server
│   ├── app/
│   │   ├── core/                       # Server configuration
│   │   ├── models/                     # Data models
│   │   ├── prompts/                    # System prompts and templates
│   │   ├── routers/                    # Inference API endpoints
│   │   ├── services/                   # Model loading, PyTorch pipelines
│   │   ├── utils/                      # AI utilities
│   │   └── main.py                     # FastAPI entry point
│   ├── comic-text-detector/            # PyTorch text bubble detection model
│   ├── .env.example
│   └── requirements.txt
│
├── qdrant/                             # Qdrant vector DB data directory
├── start_kyuna.bat                     # Start all services
├── stop_kyuna.bat                      # Stop all services
└── dev_kyuna.bat                       # Test launcher for all services
```

---

## Tech Stack

| Layer              | Technologies                                                                |
|--------------------|-----------------------------------------------------------------------------|
| **Frontend**       | React 18 · Vite · TypeScript · Tailwind CSS · Zustand · Framer Motion       |
| **Backend**        | FastAPI · SQLAlchemy (async) · PostgreSQL · asyncpg · Qdrant client · httpx |
| **AI Server**      | llama.cpp · CUDA · PyTorch · MangaOCR · OpenCV                              |
| **Infrastructure** | NSSM (Windows services) · Qdrant native binary · PostgreSQL                 |

---

## License

MIT — see [LICENSE](LICENSE) for details.