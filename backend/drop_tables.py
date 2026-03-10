import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def clear():
    async with AsyncSessionLocal() as db:
        await db.execute(text("DROP TABLE IF EXISTS agent_runs CASCADE;"))
        await db.execute(text("DROP TABLE IF EXISTS agent_plans CASCADE;"))
        await db.commit()
    print("Dropped agent_runs and agent_plans tables.")

asyncio.run(clear())
