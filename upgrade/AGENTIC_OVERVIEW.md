# Kyuna — Agentic AI Upgrade
## Overview & Plan for All Developers

> **Version:** Architecture v2 (post-review)
> **Model:** Qwen 35B — single model, all agents via different system prompts
> **Mode:** User-selected — Fast / Thinking / **Agentic** (new)
> **Phases:** 4 phases, each independently shippable

---

## Why We're Doing This

Kyuna's current chatbot is a single RAG pipeline: embed query → search Qdrant → inject context → stream response. That works well for conversational questions. It breaks down for anything requiring multiple steps, external research, or memory management tasks.

The agentic upgrade gives Kyuna the ability to:
- Plan before it acts, and show that plan to the user
- Use tools (memory read/write, document search, web search/fetch)
- Execute multi-step tasks across multiple tool calls
- Self-evaluate output quality (user-configurable)
- Guard every irreversible action behind user confirmation

**What does NOT change:** Fast mode and Thinking mode remain exactly as they are today. The agentic pipeline is opt-in only.

---

## The Three Modes (After This Upgrade)

| Mode | Pipeline | User Sees |
|------|----------|-----------|
| **Fast** | Current RAG pipeline — unchanged | Instant streaming response |
| **Thinking** | RAG + extended reasoning (`<think>` tags) | Collapsible reasoning panel + answer |
| **Agentic** | Full 11-pattern pipeline (this upgrade) | Plan → approve → execution steps → final answer |

The mode selector is a UI control the user sets per-request (same location as the existing Fast/Thinking toggle). **No background auto-routing. User opts in explicitly.**

---

## Architecture Summary

```
USER INPUT  (Agentic mode selected)
        │
        ▼
ORCHESTRATOR AGENT                    ← P4, P8
Reads request. Queries memory.
Produces detailed step-by-step plan.
        │
        ▼
PLAN SHOWN TO USER — Edit / Approve   ← P11 (Gate 1)
User can modify any step.
Nothing executes until approved.
        │
        ▼
MEMORY AGENT  (if research needed)    ← P7
Searches memories, universal facts,
documents before execution begins.
        │
        ▼
EXECUTE AGENTS — Sequential           ← P6, P3
  Tool 1 → answer → into working memory
  Tool 2 → answer → into working memory
  Tool N → answer → into working memory
        │
        ▼
SYNTHESIZER AGENT                     ← P1
Reads all accumulated tool answers.
Produces consolidated draft.
        │
        ▼
EVALUATOR AGENT  (if user enabled)    ← P5, P9
Planning check — did every step pass?
If not → Orchestrator re-runs failed steps only.
        │
        ▼
MULTI-AGENT CONSENSUS  (promote only) ← P10
Two agent passes must agree before
any universal_fact is created.
        │
        ▼
ORCHESTRATOR AGENT — Final Output
Wraps result, applies formatting,
cites sources.
        │
        ▼
SSE STREAM → USER
```

---

## All 11 Patterns — What Each One Does

| # | Pattern | Role in pipeline | Key decision |
|---|---------|-----------------|--------------|
| P1 | Prompt Chaining | Sequential prompts — orchestrator → memory → execute → synthesize → evaluate | One model (Qwen 35B), different system prompts per agent. No model switching. |
| P2 | Mode Selection | Replaces auto-routing from v1 | User picks Fast / Thinking / Agentic explicitly |
| P3 | Sequential Execution | Tools run one at a time, each result feeds the next | Tool 2 can use Tool 1's answer as input |
| P4 | Orchestrator + Subagents | Orchestrator plans; specialist agents execute | Each agent = same model + different system prompt |
| P5 | Evaluator-Optimizer | Planning check after all tasks complete | User-configurable: Off / Always / Threshold (≥N tools) |
| P6 | Tool Use | LLM calls external functions; results injected back | 10 tools across 3 domains (memory, docs, web) |
| P7 | Memory Management | 4-layer stack: Working / Episodic / Semantic / Permanent | Working Memory is the only new addition needed |
| P8 | Planning | Orchestrator always generates a plan in agentic mode | Even single-step tasks get a plan. Always shown. Always approved. |
| P9 | Reflection | Agent reviews its own reasoning at two checkpoints | Qwen 35B + reflection prompt. No model switch — faster on single GPU. |
| P10 | Multi-Agent Consensus | Two passes must agree before promoting a universal fact | Prevents wrong facts becoming permanent context |
| P11 | HITL | Dual gate: plan approval + per-tool dispatcher confirmation | Enforced in Python at dispatcher level, not in prompts |

---

## Agent Roster — One Model, Six Prompts

All agents are Qwen 35B loaded once. Each agent is a different system prompt.

| Agent | When it runs | Responsibility |
|-------|-------------|---------------|
| **Orchestrator Agent** | Start + end of every agentic run | Plans, coordinates, produces final output |
| **Memory Agent** | Before tool execution | Queries all memory layers, returns structured context |
| **Execute Agent** (×N) | Once per tool in the plan | Calls exactly one tool, returns the result |
| **Synthesizer Agent** | After all tools complete | Consolidates all tool results into a draft answer |
| **Evaluator Agent** | After synthesis (if enabled) | Checks draft against original plan goals |
| **Consensus Agent** (×2) | Only on memory_promote | Two independent passes evaluate the fact |

> **Why not Qwen 8B for lighter agents?**
> On a single GPU, unloading Qwen 35B and loading Qwen 8B costs 5–15 seconds.
> Switching system prompts on an already-loaded model costs milliseconds.
> Same model, different context = always the faster path on single-GPU hardware.

---

## Tool Registry

| Tool | Domain | HITL? | Notes |
|------|--------|-------|-------|
| `memory_search` | Memory | NO | Read-only |
| `memory_write` | Memory | YES (×2 gates) | Saves new fact |
| `memory_promote` | Memory | YES + Consensus | Triggers 2-pass consensus before Gate 2 |
| `memory_delete` | Memory | YES (×2 gates) | Irreversible |
| `doc_search` | Documents | NO | Read-only |
| `doc_summarize` | Documents | NO | Read-only |
| `doc_upload` | Documents | YES (×2 gates) | Indexes new file |
| `doc_delete` | Documents | YES (×2 gates) | Irreversible |
| `web_search` | Web | NO | External read |
| `web_fetch` | Web | NO | External read |

**HITL ×2 means:** gated at plan approval (Gate 1) AND at tool dispatcher (Gate 2).

---

## Memory Architecture — What Already Exists

| Layer | Name | Status |
|-------|------|--------|
| L1 | **Working Memory** — per-run scratch pad | 🔴 ADD (Python dict, lives during agent run) |
| L2 | **Episodic** — `conversation_memories` (Qdrant) | ✅ EXISTS |
| L3 | **Semantic** — `documents` (Qdrant) | ✅ EXISTS |
| L4 | **Permanent** — `universal_facts` (always injected) | ✅ EXISTS |

---

## HITL Dual Gate

```
Gate 1 — Plan Approval
  User sees full step list before any execution.
  Can delete/edit any step. Removes gated tools before they ever queue.

Gate 2 — Tool Dispatcher
  Per-tool check immediately before execution.
  Emits confirmation_required SSE → frontend modal.
  Agent holds on asyncio.Event().wait().
  User confirms → proceeds. Cancel → graceful refusal for that step.
```

> Rule: **All enforcement is in Python at the dispatcher level.** Not in prompts. A prompt can be worked around. A Python flag check cannot.

---

## Database Changes Required

| Table | Change | Used by |
|-------|--------|---------|
| `agent_plans` | **New table** — stores plan steps, approval timestamp, user edits, per-step results, evaluator verdict | Backend / all agents |
| `agent_runs` | **New table** — one row per agentic run; links to plan, mode, duration, final status | Backend / observability |
| No changes to existing tables | `conversation_memories`, `universal_facts`, `documents`, `translation_jobs` unchanged | — |

---

## Build Phases

```
Phase 1 — Foundation (Week 1)
Patterns: P2 · P6 · P8 · P11
Deliverable: Agentic mode selectable. Plan shown + editable. 4 read-only tools work.
             HITL dual gate live. User is fully in control.

Phase 2 — Intelligence (Week 2)
Patterns: P4 · P3 · P7 · P1
Deliverable: Multi-step tasks work. Memory Agent runs pre-execution.
             Sequential tool execution. Synthesizer produces consolidated output.
             Write/delete tools available (HITL-gated).

Phase 3 — Quality (Week 3)
Patterns: P9 · P5 · P10
Deliverable: Evaluator with user settings (Off/Always/Threshold).
             Mid-task + post-task reflection. Consensus Agent for fact promotion.

Phase 4 — Scale (Future)
Specialist GGUF models per agent role (when hardware allows).
No pipeline changes required — agent registry handles model assignment.
```

---

## What Does NOT Change

- `chat_service.py` core logic for Fast and Thinking modes
- `qdrant_service.py` existing search methods
- `extraction_worker.py` background fact extraction
- `context_assembler.py` RAG context building
- All existing frontend pages except `ChatPage` (mode selector added)
- All existing API routes (new routes added under `/api/v1/agent/`)

---

## Definition of Done — Phase 1

- [ ] Mode selector visible in chat UI (Fast / Thinking / Agentic)
- [ ] Selecting Agentic routes to new `AgentOrchestrator`
- [ ] Plan rendered in UI with edit/delete per step
- [ ] Approve button triggers execution; Cancel aborts
- [ ] `agent_plans` table records every run
- [ ] `memory_search`, `doc_search`, `web_search`, `web_fetch` tools functional
- [ ] HITL Gate 2 modal fires for any gated tool that reaches dispatcher
- [ ] Fast and Thinking modes completely unaffected
- [ ] No regression in existing chat, memory, translator features

---

## Glossary

| Term | Meaning |
|------|---------|
| Agent | Qwen 35B called with a specific system prompt for a focused task |
| Working Memory | Python dict holding tool results during one agentic run |
| HITL | Human-in-the-Loop — user confirmation before irreversible action |
| Gate 1 | Plan-level approval before any execution begins |
| Gate 2 | Per-tool dispatcher check immediately before tool fires |
| Universal Fact | A memory fact promoted to permanent context — injected into every future conversation |
| Consensus | Two independent agent passes that must both pass before a universal fact is created |
| Evaluator | Agent that checks the synthesized output against the original plan goals |
