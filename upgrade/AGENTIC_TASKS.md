# Kyuna — Agentic AI
## Detailed Tasks by Developer

> Read `AGENTIC_OVERVIEW.md` first.
> This file assigns every implementation task to a role.
> Three roles: **Backend Dev**, **Frontend Dev**, **AI/ML Dev**
> Solo devs: work through all three tracks in phase order.

---

## Role Summary

| Role | Core responsibility |
|------|-------------------|
| **Backend Dev** | FastAPI routes, database, tool dispatcher, HITL gate, SSE events |
| **Frontend Dev** | Mode selector, plan UI (editable), execution progress, evaluator display |
| **AI/ML Dev** | Agent system prompts, agent orchestration logic, working memory, evaluator settings |

> **Dependency rule:** AI/ML Dev and Backend Dev can work in parallel on Phase 1. Frontend Dev needs the SSE event schema from Backend before building the plan UI. Agree on the event schema on Day 1.

---

---

# PHASE 1 — Foundation

**Goal:** Agentic mode is selectable. Plan is shown and editable. 4 read-only tools work. HITL gate live.

---

## Backend Dev — Phase 1

### 1.1 — New database tables

**File:** `backend/app/models/agent.py` *(new file)*

Create two SQLAlchemy models:

```python
class AgentPlan(Base):
    __tablename__ = "agent_plans"
    id: UUID (primary key)
    conversation_id: UUID (FK → chat_conversations)
    user_id: UUID (FK → users)
    user_request: str          # original user message
    raw_plan: JSON             # orchestrator's generated plan steps
    edited_plan: JSON          # plan after user edits (may differ from raw)
    approved_at: datetime      # when user clicked Approve
    status: str                # pending | approved | running | completed | failed
    evaluator_verdict: JSON    # null until evaluator runs
    created_at: datetime

class AgentRun(Base):
    __tablename__ = "agent_runs"
    id: UUID (primary key)
    plan_id: UUID (FK → agent_plans)
    user_id: UUID (FK → users)
    mode: str                  # always "agentic" for now
    started_at: datetime
    completed_at: datetime
    total_tools_called: int
    final_status: str          # completed | failed | cancelled
    error_message: str         # null on success
```

Create and run Alembic migration.

---

### 1.2 — Agent router

**File:** `backend/app/routers/agent.py` *(new file)*

```
POST /api/v1/agent/plan
  Body: { conversation_id, content, mode: "agentic" }
  → Calls OrchestratorAgent (AI/ML Dev delivers this)
  → Saves AgentPlan with status="pending"
  → Returns: { plan_id, steps: [...] }

POST /api/v1/agent/plan/{plan_id}/approve
  Body: { edited_steps: [...] }   # user's final edited plan
  → Updates AgentPlan.edited_plan, sets status="approved", sets approved_at
  → Returns: { plan_id, status: "approved" }

POST /api/v1/agent/plan/{plan_id}/cancel
  → Sets AgentPlan.status = "cancelled"
  → Returns: { plan_id, status: "cancelled" }

GET  /api/v1/agent/plan/{plan_id}
  → Returns full plan with steps, status, evaluator_verdict

POST /api/v1/agent/execute/{plan_id}
  → Starts agentic execution as SSE stream
  → Content-Type: text/event-stream
  → See SSE schema below
```

Register the router in `main.py`.

---

### 1.3 — SSE event schema  *(agree with Frontend Dev on Day 1)*

Every SSE event is JSON on a `data:` line:

```jsonc
// Agent starting
{ "type": "agent_start", "plan_id": "...", "total_steps": 3 }

// A step beginning
{ "type": "step_start", "step": 1, "agent": "ExecuteAgent", "tool": "web_search", "goal": "Find recent news about X" }

// Tool result returned
{ "type": "step_result", "step": 1, "tool": "web_search", "summary": "Found 5 results...", "success": true }

// HITL gate fired (Gate 2)
{ "type": "confirmation_required", "step": 2, "tool": "memory_write", "args": { "fact": "User prefers dark mode" }, "impact": "Saves a new memory fact permanently" }

// User confirmed (sent back via POST /agent/confirm)
// Then execution resumes — no SSE event needed

// Synthesis starting
{ "type": "synthesis_start" }

// Final answer tokens (same as current chat streaming)
{ "type": "token", "content": "Based on my research..." }

// Done
{ "type": "agent_done", "plan_id": "...", "tools_called": 3, "evaluator_ran": false }

// Error
{ "type": "agent_error", "step": 2, "message": "web_search failed: timeout" }
```

---

### 1.4 — HITL Gate 2 dispatcher

**File:** `backend/app/services/tool_dispatcher.py` *(new file)*

```python
AUTONOMOUS_TOOLS = {"memory_search", "doc_search", "doc_summarize", "web_search", "web_fetch"}
HITL_TOOLS       = {"memory_write", "memory_promote", "memory_delete", "doc_upload", "doc_delete"}

async def dispatch(tool_name, args, confirmation_token=None, sse_queue=None):
    if tool_name in HITL_TOOLS:
        if not confirmation_token:
            # Pause: emit confirmation_required event, wait for user
            await sse_queue.put({"type": "confirmation_required", "tool": tool_name, "args": args, ...})
            confirmation_token = await wait_for_confirmation(tool_name)
        if confirmation_token == "cancelled":
            return {"success": False, "reason": "User cancelled"}
    return await TOOL_REGISTRY[tool_name](**args)
```

`wait_for_confirmation()` uses `asyncio.Event` per run, resolved by `POST /api/v1/agent/confirm/{run_id}`.

---

### 1.5 — Phase 1 tool implementations

**File:** `backend/app/services/agent_tools.py` *(new file)*

Implement these 4 tools for Phase 1 (all read-only, no HITL):

```python
async def tool_memory_search(query: str, user_id: UUID, db: AsyncSession) -> dict:
    # Reuse qdrant_service.search_memories() + search_universal_facts()
    # Return: {"facts": [...], "universal_facts": [...]}

async def tool_doc_search(query: str, user_id: UUID, db: AsyncSession) -> dict:
    # Reuse qdrant_service.search_documents()
    # Return: {"chunks": [...], "sources": [...]}

async def tool_web_search(query: str) -> dict:
    # Integrate a search API (SerpAPI, DuckDuckGo, or Brave Search)
    # Return: {"results": [{"title", "url", "snippet"}, ...]}

async def tool_web_fetch(url: str) -> dict:
    # httpx GET, extract clean text (strip HTML tags)
    # Return: {"url": url, "content": str, "word_count": int}
```

---

### 1.6 — Route the agentic mode request

**File:** `backend/app/routers/chat.py`

In the existing message POST handler, check the `mode` field:

```python
if body.mode == "agentic":
    return await agent_router.handle(db, current_user, conversation_id, body.content)
# else: existing fast/thinking pipeline unchanged
```

The `mode` field is already in the request body — it just needs to be forwarded. No other changes to the existing chat pipeline.

---

### Backend Dev Phase 1 checklist

- [ ] `AgentPlan` + `AgentRun` models + migration
- [ ] `POST /agent/plan` — generate + save plan
- [ ] `POST /agent/plan/{id}/approve` — save edited plan, set approved
- [ ] `POST /agent/plan/{id}/cancel` — cancel plan
- [ ] `POST /agent/execute/{id}` — SSE execution stream
- [ ] `POST /agent/confirm/{run_id}` — resolve HITL Gate 2 hold
- [ ] `tool_dispatcher.py` with HITL gate logic
- [ ] 4 read-only tools in `agent_tools.py`
- [ ] Mode routing in `chat.py`
- [ ] SSE event schema agreed with Frontend Dev ✅

---
---

## Frontend Dev — Phase 1

### 1.1 — Mode selector

**File:** `frontend/src/components/chat/ModeSelector.tsx` *(new component)*

Add a third mode button alongside the existing Fast / Thinking toggle:

```tsx
type ChatMode = 'fast' | 'thinking' | 'agentic'

// Display in the chat input bar, same location as current Fast/Thinking toggle
// Agentic button: distinct visual treatment — pink/magenta to match Kyuna theme
// On hover: tooltip "Multi-step tasks with tool use. You control the plan."
```

Wire into `chatStore.ts`:

```ts
selectedMode: ChatMode   // add to store state
setMode: (mode: ChatMode) => void
```

When `selectedMode === 'agentic'`, the send button behavior changes:
- Instead of immediately streaming a response, it calls `POST /api/v1/agent/plan`
- Then waits for the plan response and renders the Plan Panel (1.2)

---

### 1.2 — Plan Panel

**File:** `frontend/src/components/agent/PlanPanel.tsx` *(new component)*

Rendered after the orchestrator returns a plan. Sits inline in the chat conversation area, above the chat input.

**Structure:**

```
┌─ KYUNA'S PLAN ─────────────────────────────────────────┐
│                                                          │
│  Step 1  [Memory Agent]  Search memory for facts about X │  [✕ delete]
│  Step 2  [Execute]       web_search "recent news X"      │  [✕ delete]
│  Step 3  [Execute]       doc_search "X background"       │  [✕ delete]
│  Step 4  [Synthesizer]   Consolidate results             │  [✕ delete]
│                                                          │
│  [+ Add step]                                            │
│                                                          │
│  [  Cancel  ]                    [  Approve & Run →  ]   │
└──────────────────────────────────────────────────────────┘
```

**Each step row:**
- Agent label (pill badge — colour-coded by agent type)
- Tool name + goal text (editable inline on click)
- Delete button (removes step from plan)

**Add step:** Opens a small form — agent selector + goal text input.

**Approve & Run:** Calls `POST /agent/plan/{id}/approve` with the final edited steps, then immediately calls `POST /agent/execute/{id}` and opens the SSE stream.

**Cancel:** Calls `POST /agent/plan/{id}/cancel`, dismisses the panel.

---

### 1.3 — Execution progress display

**File:** `frontend/src/components/agent/ExecutionProgress.tsx` *(new component)*

Shown during SSE stream after plan is approved. Replaces the Plan Panel.

```
┌─ RUNNING ──────────────────────────────────────────────┐
│                                                          │
│  ✅ Step 1  Memory search — 3 facts found               │
│  ⏳ Step 2  Web search — searching...                   │
│  ○  Step 3  Doc search — waiting                        │
│  ○  Step 4  Synthesizing — waiting                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Steps update in real time as SSE events arrive
- `step_start` → spinner on that step
- `step_result` → checkmark + summary text
- `agent_error` → red X + error message on that step

---

### 1.4 — HITL Gate 2 modal

**File:** `frontend/src/components/agent/ConfirmationModal.tsx` *(new component)*

Triggered when SSE event `confirmation_required` arrives. Execution pauses.

```
┌─ CONFIRM ACTION ───────────────────────────────────────┐
│                                                          │
│  ⚠️  memory_write                                       │
│                                                          │
│  The agent wants to save this memory:                    │
│  "User prefers working in the evenings"                  │
│                                                          │
│  Impact: Saves a new fact to your memory permanently.    │
│                                                          │
│  [  Cancel this step  ]          [  Confirm & Continue  ]│
└──────────────────────────────────────────────────────────┘
```

On Confirm: `POST /api/v1/agent/confirm/{run_id}` → execution resumes.
On Cancel: `POST /api/v1/agent/confirm/{run_id}` with `{ cancelled: true }` → step skipped, execution continues with remaining steps.

---

### 1.5 — AgentStore

**File:** `frontend/src/store/agentStore.ts` *(new store)*

```ts
interface AgentState {
  planId: string | null
  steps: PlanStep[]
  executionStatus: 'idle' | 'planning' | 'awaiting_approval' | 'running' | 'done' | 'failed'
  stepStatuses: Record<number, 'pending' | 'running' | 'done' | 'error'>
  stepResults: Record<number, string>
  pendingConfirmation: ConfirmationRequest | null

  generatePlan: (conversationId: string, content: string) => Promise<void>
  approvePlan: (editedSteps: PlanStep[]) => Promise<void>
  cancelPlan: () => Promise<void>
  confirmAction: (cancelled?: boolean) => Promise<void>
  streamExecution: (planId: string) => void  // opens SSE, updates step statuses
}
```

---

### Frontend Dev Phase 1 checklist

- [ ] `ModeSelector.tsx` with Fast / Thinking / Agentic
- [ ] Mode stored in `chatStore` and sent in message request
- [ ] `PlanPanel.tsx` — renders steps, editable, approve/cancel
- [ ] `ExecutionProgress.tsx` — real-time step status from SSE
- [ ] `ConfirmationModal.tsx` — HITL Gate 2 pause + confirm/cancel
- [ ] `agentStore.ts` — full state management for agent flow
- [ ] SSE event schema integrated (agreed with Backend Dev) ✅
- [ ] Agentic mode visually distinct but consistent with Kyuna theme
- [ ] Fast and Thinking modes completely unaffected

---
---

## AI/ML Dev — Phase 1

### 1.1 — Agent system prompts

**File:** `backend/app/prompts/agents/orchestrator.md` *(new file)*

```markdown
You are the Orchestrator for Kyuna, a personal AI assistant.

Your job: given a user request, produce a detailed numbered plan.

Each step must specify:
- step_number (int)
- agent_name (one of: MemoryAgent, ExecuteAgent, SynthesizerAgent)
- tool_name (one of the available tools, or null for SynthesizerAgent)
- goal (one sentence: what this step is trying to find or accomplish)
- depends_on (list of step numbers this step requires, or empty list)

Rules:
- Always start with MemoryAgent if the task benefits from personal context
- Always end with SynthesizerAgent as the last step
- Use ExecuteAgent for every tool call
- Keep goals specific and actionable
- If only one tool is needed, a plan with two steps (Execute + Synthesize) is correct

Return ONLY valid JSON. No explanation. No preamble.

Format:
{
  "plan": [
    { "step_number": 1, "agent_name": "MemoryAgent", "tool_name": "memory_search", "goal": "...", "depends_on": [] },
    ...
  ]
}
```

**File:** `backend/app/prompts/agents/execute.md` *(new file)*

```markdown
You are an Execute Agent for Kyuna.

You have been assigned exactly one tool to call with specific arguments.
The tool result will be provided to you.

Your job: call the tool, then return a clean structured summary of the result.

Rules:
- Do not add commentary or interpretation
- Do not call tools other than the one assigned
- If the tool returns an error, report it clearly
- Return ONLY the result summary as plain text

Tool assigned: {tool_name}
Arguments: {tool_args}
Previous context from earlier steps: {working_memory_summary}
```

**File:** `backend/app/prompts/agents/synthesizer.md` *(new file)*

```markdown
You are the Synthesizer Agent for Kyuna.

You have access to all tool results from this agentic run.
Your job: produce a clear, well-structured, accurate response to the user's original request.

Rules:
- Use all relevant tool results
- Cite the source of facts where appropriate (e.g., "from your memory:", "from web search:")
- Do not invent information not present in the tool results
- Match the user's conversational tone
- Be thorough but not padded

Original user request: {user_request}
Tool results accumulated: {working_memory_all_results}
```

---

### 1.2 — Orchestrator agent logic

**File:** `backend/app/services/agents/orchestrator_agent.py` *(new file)*

```python
async def generate_plan(user_request: str, conversation_id: str, db) -> dict:
    """
    Calls Qwen 35B with the orchestrator system prompt.
    Returns parsed plan JSON.
    """
    # 1. Load orchestrator system prompt from prompts/agents/orchestrator.md
    # 2. Query memory for recent context (lightweight — top 3 facts only)
    # 3. Call AI server: POST /v1/chat with orchestrator prompt + user_request
    # 4. Parse JSON response
    # 5. Validate: every step has required fields, SynthesizerAgent is last
    # 6. Return plan dict

async def generate_final_output(user_request: str, synthesized_draft: str, plan: dict) -> AsyncGenerator[str, None]:
    """
    Orchestrator wraps the synthesized draft into a final streamed response.
    Adds formatting, source citations, closing context.
    """
    # Streams tokens via SSE
```

---

### 1.3 — Working memory structure

**File:** `backend/app/services/agents/working_memory.py` *(new file)*

```python
class WorkingMemory:
    """
    Per-run scratch pad. Lives only during one agentic run.
    Keyed by run_id.
    """
    def __init__(self, run_id: str, user_request: str):
        self.run_id = run_id
        self.user_request = user_request
        self.tool_results: list[dict] = []   # [{step, tool, result, timestamp}]
        self.memory_context: dict = {}        # output of MemoryAgent
        self.synthesis_draft: str = ""        # output of SynthesizerAgent

    def add_result(self, step: int, tool: str, result: dict):
        self.tool_results.append({"step": step, "tool": tool, "result": result})

    def get_summary_for_prompt(self) -> str:
        """Returns formatted string of all results for injection into next prompt."""
        lines = []
        for r in self.tool_results:
            lines.append(f"Step {r['step']} ({r['tool']}): {json.dumps(r['result'])[:500]}")
        return "\n".join(lines)

    def get_all_for_synthesis(self) -> str:
        """Full results dump for SynthesizerAgent."""
        return json.dumps(self.tool_results, indent=2)

# Global registry — keys are run_ids, values are WorkingMemory instances
_registry: dict[str, WorkingMemory] = {}

def create(run_id: str, user_request: str) -> WorkingMemory:
    wm = WorkingMemory(run_id, user_request)
    _registry[run_id] = wm
    return wm

def get(run_id: str) -> WorkingMemory:
    return _registry[run_id]

def destroy(run_id: str):
    _registry.pop(run_id, None)
```

---

### 1.4 — Execution runner (Phase 1 version)

**File:** `backend/app/services/agents/execution_runner.py` *(new file)*

```python
async def run_plan(plan_id: str, edited_steps: list, user_id: UUID, db, sse_queue):
    """
    Main execution loop for an approved plan.
    Phase 1: MemoryAgent + ExecuteAgent (read-only tools) + SynthesizerAgent
    """
    plan = await get_plan(plan_id, db)
    wm = working_memory.create(run_id=plan_id, user_request=plan.user_request)

    await sse_queue.put({"type": "agent_start", "plan_id": plan_id, "total_steps": len(edited_steps)})

    for step in edited_steps:
        await sse_queue.put({"type": "step_start", "step": step["step_number"], ...})

        if step["agent_name"] == "MemoryAgent":
            result = await memory_agent.run(step, wm, user_id, db)

        elif step["agent_name"] == "ExecuteAgent":
            result = await tool_dispatcher.dispatch(
                tool_name=step["tool_name"],
                args=step["tool_args"],
                sse_queue=sse_queue
            )
            wm.add_result(step["step_number"], step["tool_name"], result)

        elif step["agent_name"] == "SynthesizerAgent":
            draft = await synthesizer_agent.run(plan.user_request, wm)
            wm.synthesis_draft = draft

        await sse_queue.put({"type": "step_result", "step": step["step_number"], "success": True, ...})

    # Stream final output via OrchestratorAgent
    async for token in orchestrator_agent.generate_final_output(plan.user_request, wm.synthesis_draft, plan.raw_plan):
        await sse_queue.put({"type": "token", "content": token})

    await sse_queue.put({"type": "agent_done", ...})
    working_memory.destroy(plan_id)
```

---

### AI/ML Dev Phase 1 checklist

- [ ] `orchestrator.md` system prompt — plan generation
- [ ] `execute.md` system prompt — single tool call + result summary
- [ ] `synthesizer.md` system prompt — consolidate tool results
- [ ] `orchestrator_agent.py` — `generate_plan()` + `generate_final_output()`
- [ ] `working_memory.py` — in-memory run state, add/get/destroy
- [ ] `execution_runner.py` — phase 1 loop (memory + execute + synthesize)
- [ ] Integration test: full plan → approve → execute 2 read-only tools → synthesize → output

---
---

# PHASE 2 — Intelligence

**Goal:** Multi-step tasks work. Sequential tool execution. Write/delete tools available. Synthesizer produces consolidated output.

---

## Backend Dev — Phase 2

### 2.1 — Memory Agent tool

Add to `agent_tools.py`:

```python
async def tool_memory_write(fact: str, subject: str, confidence: float, user_id: UUID, db) -> dict:
    # Saves MemoryFact to PostgreSQL (reuse memory_service.save_fact())
    # Embeds + upserts to Qdrant (reuse qdrant_service.upsert_memory())
    # Returns: {"saved": True, "fact_id": str}

async def tool_memory_delete(fact_id: str, user_id: UUID, db) -> dict:
    # Deletes MemoryFact from PostgreSQL
    # Removes vector from Qdrant
    # Returns: {"deleted": True}

async def tool_doc_upload(file_path: str, filename: str, user_id: UUID, db) -> dict:
    # Chunks file, embeds chunks, indexes to Qdrant documents collection
    # Returns: {"indexed": True, "chunks": int, "document_id": str}

async def tool_doc_delete(document_id: str, user_id: UUID, db) -> dict:
    # Removes all chunks from PostgreSQL and Qdrant
    # Returns: {"deleted": True, "chunks_removed": int}
```

All four are registered in `HITL_TOOLS` — Gate 2 fires automatically.

---

### 2.2 — AgentRun table writes

In `execution_runner.py`, write to `agent_runs` at start and end of every run:
- `started_at` on run start
- `completed_at`, `total_tools_called`, `final_status` on run end
- `error_message` on any uncaught exception

---

### Backend Dev Phase 2 checklist

- [ ] 4 HITL tools implemented (`memory_write`, `memory_delete`, `doc_upload`, `doc_delete`)
- [ ] All 4 registered in `HITL_TOOLS` set in dispatcher
- [ ] `agent_runs` table written at start and end of every run
- [ ] Error handling in execution runner — failed step is logged, execution continues

---

## Frontend Dev — Phase 2

### 2.1 — Step result detail expansion

Each completed step in `ExecutionProgress` should be expandable:

```
✅ Step 2  Web search — 5 results found         [▼ show results]
  ↳ "React hooks best practices" — reactjs.org
  ↳ "Understanding useEffect" — medium.com
  ...
```

Click `show results` expands an inline list of what the tool returned (title + URL for web, fact text for memory, chunk preview for docs).

### 2.2 — Failed step handling

When `agent_error` SSE event arrives:
- Mark step with red X + error message
- Show inline "Skip this step" button → `POST /agent/skip/{run_id}/{step}`
- Execution continues with remaining steps automatically

### Frontend Dev Phase 2 checklist

- [ ] Step result expansion in `ExecutionProgress`
- [ ] Failed step display + skip button
- [ ] HITL modal updated to show correct impact text for write/delete tools
- [ ] `agentStore` handles all 4 new tool types

---

## AI/ML Dev — Phase 2

### 2.1 — Memory Agent prompt + logic

**File:** `backend/app/prompts/agents/memory_agent.md`

```markdown
You are the Memory Agent for Kyuna.

Your job: given a task goal, extract and return the most relevant facts
from the provided memory context.

Rules:
- Return only facts directly relevant to the goal
- Preserve the source (conversation_memory vs universal_fact)
- Be concise — do not paraphrase, just select and return
- If nothing is relevant, say so explicitly

Task goal: {goal}
Memory context provided: {raw_memory_context}
```

**File:** `backend/app/services/agents/memory_agent.py`

```python
async def run(step: dict, wm: WorkingMemory, user_id: UUID, db) -> dict:
    # 1. Call memory_search + doc_search in sequence
    # 2. Inject raw results into memory_agent.md prompt
    # 3. Call Qwen 35B to filter/rank the relevant facts
    # 4. Store filtered result in wm.memory_context
    # 5. Return structured dict
```

### 2.2 — Synthesizer refinement

Update `synthesizer.md` to handle sequential tool results properly:

```markdown
Tool results are listed in execution order.
Later results may reference or extend earlier results.
When synthesizing, respect that order — later tools may have refined or
contradicted what earlier tools found.
```

### AI/ML Dev Phase 2 checklist

- [ ] `memory_agent.md` system prompt
- [ ] `memory_agent.py` — query memory layers + LLM filter pass
- [ ] `synthesizer.md` updated for sequential result ordering
- [ ] `execution_runner.py` updated: MemoryAgent writes to `wm.memory_context`, ExecuteAgents can read it
- [ ] Each ExecuteAgent step receives `wm.get_summary_for_prompt()` as context

---
---

# PHASE 3 — Quality

**Goal:** Evaluator with user settings. Reflection checkpoints. Consensus Agent for fact promotion.

---

## Backend Dev — Phase 3

### 3.1 — Evaluator trigger settings

**File:** `backend/app/models/user_settings.py` (add field)

```python
agent_evaluator_mode: str   # "off" | "always" | "threshold"
agent_evaluator_threshold: int  # min tools called to trigger (used when mode="threshold")
```

**New endpoint:**
```
PATCH /api/v1/users/settings/agent
Body: { evaluator_mode, evaluator_threshold }
```

### 3.2 — Evaluator result in plan record

After evaluator runs, update `AgentPlan.evaluator_verdict`:

```json
{
  "passed": false,
  "failed_steps": [2, 3],
  "failures": [
    { "step": 2, "issue": "web_search returned no results relevant to the goal" },
    { "step": 3, "issue": "synthesis did not address the user's second question" }
  ],
  "rerun_steps": [2, 3]
}
```

If failures exist, execution runner re-runs only the listed steps, then re-synthesizes.

### 3.3 — Consensus Agent flow for memory_promote

In `tool_dispatcher.py`, special handling for `memory_promote`:

```python
if tool_name == "memory_promote":
    # Step 1: Run ConsensusAgent Pass 1
    pass1 = await consensus_agent.evaluate(args["fact"])
    # Step 2: Run ConsensusAgent Pass 2 (fresh context, no knowledge of Pass 1)
    pass2 = await consensus_agent.evaluate(args["fact"])
    # Step 3: Both must pass
    if not (pass1["approved"] and pass2["approved"]):
        # Emit disagreement event to frontend
        await sse_queue.put({"type": "consensus_failed", "fact": args["fact"],
                              "pass1": pass1, "pass2": pass2})
        return {"success": False, "reason": "Consensus not reached"}
    # Both passed — proceed to Gate 2 HITL confirmation as normal
```

### Backend Dev Phase 3 checklist

- [ ] `agent_evaluator_mode` + `agent_evaluator_threshold` in user settings
- [ ] `PATCH /users/settings/agent` endpoint
- [ ] `AgentPlan.evaluator_verdict` updated after evaluator runs
- [ ] Partial re-run: only failed steps re-execute
- [ ] Consensus Agent flow for `memory_promote` in dispatcher

---

## Frontend Dev — Phase 3

### 3.1 — Evaluator settings panel

In the Settings page, add an **Agent** section:

```
Agent Settings

Evaluator mode:
  ○ Off — skip quality check for fastest results
  ○ Always — evaluate every agentic run
  ○ Threshold — evaluate when ≥ [N] tools were used   [ N: __3__ ]
```

`PATCH /api/v1/users/settings/agent` on save.

### 3.2 — Evaluator result display

After agent completes, if evaluator ran:

```
┌─ EVALUATOR REPORT ─────────────────────────────────────┐
│  ✅ All steps passed                                     │
│  Quality check: passed                                   │
└──────────────────────────────────────────────────────────┘
```

Or on failure:

```
┌─ EVALUATOR REPORT ─────────────────────────────────────┐
│  ⚠️  2 steps need attention                              │
│                                                          │
│  Step 2: web_search returned no relevant results         │
│  Step 3: synthesis missed the second question            │
│                                                          │
│  Re-running failed steps...                              │
└──────────────────────────────────────────────────────────┘
```

### 3.3 — Consensus failed display

When `consensus_failed` SSE event arrives:

```
┌─ CONSENSUS CHECK ──────────────────────────────────────┐
│  ⚠️  The agents could not agree on this fact            │
│                                                          │
│  Proposed fact: "User works best in the evenings"        │
│                                                          │
│  Agent 1: Approved                                       │
│  Agent 2: Rejected — "Too vague to be a permanent fact"  │
│                                                          │
│  [  Skip promotion  ]        [  Promote anyway  ]        │
└──────────────────────────────────────────────────────────┘
```

### Frontend Dev Phase 3 checklist

- [ ] Evaluator settings panel in Settings page
- [ ] Evaluator report displayed after agent completes
- [ ] Consensus failed modal with manual override option
- [ ] Re-run animation when evaluator triggers partial re-execution

---

## AI/ML Dev — Phase 3

### 3.1 — Evaluator Agent prompt

**File:** `backend/app/prompts/agents/evaluator.md`

```markdown
You are the Evaluator Agent for Kyuna.

Your job: review the completed agentic run and assess whether every goal was met.

You will be given:
- The user's original request
- The approved plan with goals per step
- The tool result for each step
- The synthesized draft

For each step, answer: did the result satisfy the step's goal?
For the synthesis: does it address every part of the user's original request?

Return ONLY valid JSON:
{
  "passed": true | false,
  "failed_steps": [list of step numbers that failed, or empty],
  "failures": [{"step": N, "issue": "specific problem"}, ...],
  "synthesis_issues": ["issue 1", ...] or []
}
```

### 3.2 — Reflection checkpoints

Add to `execution_runner.py`:

**Mid-task reflection** (after plan is generated, before user sees it):

```python
async def reflect_on_plan(plan: dict, user_request: str) -> dict:
    """
    Qwen 35B + reflection prompt reviews the plan before showing to user.
    Catches: missing steps, wrong tool for a goal, circular dependencies.
    Returns revised plan if issues found, original plan if clean.
    """
```

**Post-task reflection** (inside EvaluatorAgent — already covered by evaluator.md).

### 3.3 — Consensus Agent prompt + logic

**File:** `backend/app/prompts/agents/consensus.md`

```markdown
You are a Fact Verification Agent for Kyuna.

A fact is being proposed for permanent injection into every future conversation.
Evaluate it independently.

Criteria:
1. Accuracy — is this likely to be true based on the conversation context?
2. Specificity — is it specific enough to be useful (not "user likes things")?
3. Non-redundancy — would this duplicate an existing universal fact?
4. Permanence — is this the kind of fact that remains true long-term?

Return ONLY valid JSON:
{ "approved": true | false, "reason": "one sentence explanation" }

Fact to evaluate: {fact}
Existing universal facts for comparison: {existing_universal_facts}
```

**File:** `backend/app/services/agents/consensus_agent.py`

```python
async def evaluate(fact: str, user_id: UUID, db) -> dict:
    """
    Calls Qwen 35B with consensus.md prompt.
    Returns {"approved": bool, "reason": str}
    Fresh context — no knowledge of any other pass's verdict.
    """
```

### AI/ML Dev Phase 3 checklist

- [ ] `evaluator.md` system prompt
- [ ] `evaluator_agent.py` — runs after synthesis, returns structured verdict
- [ ] Execution runner calls evaluator based on user settings (off/always/threshold)
- [ ] Partial re-run: evaluator's `failed_steps` list fed back into execution runner
- [ ] `reflect_on_plan()` — mid-task reflection pass before plan shown to user
- [ ] `consensus.md` system prompt
- [ ] `consensus_agent.py` — two independent passes, no shared state
- [ ] Both passes must return `approved: true` for promotion to proceed

---
---

# PHASE 4 — Scale (Future)

No immediate tasks. Architecture already supports this.

When a specialist model (e.g., a smaller embedding model, a fine-tuned translation model, a dedicated fact extractor) is available:

1. Add it to `ai_server/.env` with a new model slot name
2. In `backend/app/services/agents/agent_registry.py`, map the agent name to the new model + its system prompt
3. The execution runner picks up the model automatically from the registry
4. No changes to dispatcher, tools, frontend, or database

---

# Cross-Team Agreements — Day 1

These must be decided and documented before anyone writes code:

| # | Agreement | Owner | Needed by |
|---|-----------|-------|-----------|
| 1 | SSE event JSON schema (all event types + fields) | Backend Dev | Frontend Dev |
| 2 | `PlanStep` TypeScript type (matches backend JSON) | Backend Dev | Frontend Dev |
| 3 | Tool args format per tool (field names + types) | AI/ML Dev | Backend Dev |
| 4 | `working_memory.get_summary_for_prompt()` output format | AI/ML Dev | Backend Dev |
| 5 | AI server endpoint for agent calls (same `/v1/chat` or new `/v1/agent/chat`) | AI/ML Dev | Backend Dev |

---

# Testing Responsibilities

| Test | Owner |
|------|-------|
| Unit tests for all tools in `agent_tools.py` | Backend Dev |
| Unit tests for `tool_dispatcher.py` HITL gate | Backend Dev |
| Integration test: plan → approve → execute → SSE stream | Backend Dev + AI/ML Dev |
| UI test: mode selector → plan panel → approve → progress | Frontend Dev |
| UI test: HITL modal fires and resumes correctly | Frontend Dev |
| Prompt quality test: orchestrator produces valid JSON plan | AI/ML Dev |
| Evaluator accuracy test: detects known bad outputs | AI/ML Dev |
| Consensus test: two-pass agreement + disagreement cases | AI/ML Dev |
| Regression: Fast and Thinking modes unaffected | All |

---

# File Map — All New Files

```
backend/
  app/
    models/
      agent.py                         ← AgentPlan, AgentRun models
    routers/
      agent.py                         ← /api/v1/agent/* routes
    services/
      tool_dispatcher.py               ← HITL gate, tool registry
      agent_tools.py                   ← 10 tool implementations
      agents/
        orchestrator_agent.py          ← generate_plan(), generate_final_output()
        memory_agent.py                ← query memory layers + LLM filter
        synthesizer_agent.py           ← consolidate tool results
        evaluator_agent.py             ← planning check, verdict JSON
        consensus_agent.py             ← two-pass fact verification
        execution_runner.py            ← main sequential execution loop
        working_memory.py              ← per-run scratch pad
    prompts/
      agents/
        orchestrator.md
        execute.md
        memory_agent.md
        synthesizer.md
        evaluator.md
        consensus.md

frontend/
  src/
    store/
      agentStore.ts                    ← agent state management
    components/
      agent/
        PlanPanel.tsx                  ← plan display + edit UI
        ExecutionProgress.tsx          ← real-time step status
        ConfirmationModal.tsx          ← HITL Gate 2 pause modal
        EvaluatorReport.tsx            ← quality check result display
        ConsensusModal.tsx             ← consensus failed + manual override
    components/
      chat/
        ModeSelector.tsx               ← Fast / Thinking / Agentic toggle
```
