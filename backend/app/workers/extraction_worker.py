import json
import asyncio
import logging
import uuid
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, desc
from app.utils.ai_client import ai_client

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """Analyze this conversation. Extract facts worth remembering about the USER.
Output ONLY valid JSON. No explanation. No markdown code blocks.
Format: [{{"subject":"user","predicate":"...","object":"...","raw":"...","confidence":0.0}}]

Rules:
- Only facts about the USER, not the assistant
- Confidence must be 0.0 to 1.0
- Only include confidence > 0.6
- NO temporary states ("user seems tired right now")
- YES persistent facts (preferences, goals, habits, relationships)
- If nothing worth saving, output exactly: []

Conversation:
{conversation}"""


async def run_extraction(conversation_id: UUID, user_id: UUID) -> None:
    from app.core.database import AsyncSessionLocal
    from app.models.memory import ExtractionJob
    from app.models.chat import ChatMessage
    
    async with AsyncSessionLocal() as db:
        # 1. Guard: Check if extraction is already running for this conversation
        running_job = await db.scalar(
            select(ExtractionJob)
            .where(
                ExtractionJob.conversation_id == conversation_id,
                ExtractionJob.status == "running"
            )
        )
        if running_job:
            logger.info(f"[Extraction] Job already running for conversation {conversation_id}. Skipping.")
            return

        # 2. Create new ExtractionJob tracking row
        job_id = uuid.uuid4()
        new_job = ExtractionJob(
            id=job_id,
            conversation_id=conversation_id,
            user_id=user_id,
            status="running"
        )
        db.add(new_job)
        await db.commit()

        try:
            # 3. Fetch last 6 message pairs (12 messages)
            recent_msgs = await db.scalars(
                select(ChatMessage)
                .where(ChatMessage.conversation_id == conversation_id)
                .order_by(desc(ChatMessage.created_at))
                .limit(12)
            )
            # Reverse to chronological order
            msgs = list(recent_msgs)[::-1]
            if not msgs:
                raise ValueError("No messages found for extraction.")

            conv_text = "\n".join([f"{m.role.upper()}: {m.content}" for m in msgs])
            prompt = EXTRACTION_PROMPT.format(conversation=conv_text)

            # 4. POST to AI Server
            facts = []
            try:
                # Format messages for the AI server
                payload = {
                    "messages": [{"role": m.role.lower(), "content": m.content} for m in msgs]
                }
                response = await ai_client.client.post(
                    "/v1/memory/extract",
                    json=payload,
                    timeout=60.0
                )
                response.raise_for_status()
                
                # The AI server already parses JSON and returns a structured array of facts
                data = response.json()
                facts = data.get("facts", [])
                
                if not isinstance(facts, list):
                    facts = []
            except Exception as ai_err:
                logger.warning(f"[Extraction] LLM returned malformed JSON or failed: {ai_err}")
                facts = [] # Malformed JSON -> 0 facts, no crash

            # 5. Dedup and Save
            saved_count = await dedup_and_save(facts, user_id, conversation_id, db)

            # 6. Mark done
            new_job.status = "done"
            new_job.facts_extracted = saved_count
            new_job.completed_at = datetime.now(timezone.utc)
            await db.commit()
            
            logger.info(f"[Extraction] Job {job_id} complete. Extracted {saved_count} new facts.")

        except Exception as e:
            import traceback
            logger.error(f"[Extraction] Fatal error in worker: {e}\n{traceback.format_exc()}")
            new_job.status = "failed"
            new_job.error = str(e)
            new_job.completed_at = datetime.now(timezone.utc)
            await db.commit()

async def dedup_and_save(facts: list[dict], user_id: UUID, conversation_id: UUID, db) -> int:
    from app.services.embedding_service import embedding_service
    from app.services.qdrant_service import qdrant_service
    from app.models.memory import MemoryFact
    import uuid
    
    saved = 0
    for fact in facts:
        # Validate required fields
        if not fact.get("raw") or not fact.get("subject"):
            continue

        # 1. Embed raw_text
        vector = await embedding_service.embed_document(fact["raw"])
        if not vector:
            continue
            
        # 2. Check for near-duplicate (threshold 0.88)
        existing = await qdrant_service.search_memories(user_id, vector, top_k=1, threshold=0.88)
        if existing:
            logger.debug(f"[Extraction] Skipping duplicate fact: {fact['raw'][:60]}")
            continue
            
        # 3. Save to PostgreSQL
        fact_id = uuid.uuid4()
        db_fact = MemoryFact(
            id=fact_id,
            user_id=user_id,
            conversation_id=conversation_id,
            subject=fact.get("subject", "user"),
            predicate=fact.get("predicate", ""),
            object=fact.get("object", ""),
            raw_text=fact.get("raw", ""),
            confidence=float(fact.get("confidence", 0.7)),
            source="extracted",
        )
        db.add(db_fact)
        await db.flush() # Flush to get ID without committing transaction yet
        
        # 4. Upsert to Qdrant (same UUID)
        success = await qdrant_service.upsert_memory(fact_id, vector, {
            "user_id": str(user_id),
            "conversation_id": str(conversation_id),
            "raw_text": fact.get("raw", ""),
            "subject": fact.get("subject", ""),
            "predicate": fact.get("predicate", ""),
            "object": fact.get("object", ""),
            "confidence": float(fact.get("confidence", 0.7)),
        })
        
        if success:
            db_fact.qdrant_synced = True
            saved += 1
            await db.commit()
        else:
            await db.rollback() # Rollback DB if Qdrant fails to maintain 1:1 sync

    return saved