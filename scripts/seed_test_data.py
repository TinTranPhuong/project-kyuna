import asyncio
import httpx
import logging

# Set up basic logging to see what's happening
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_USER = {
    "username": "test_user", 
    "email": "test@luna.local", 
    "password": "password123"
}

async def seed_database():
    logger.info("Starting database seeding for Project Luna E2E tests...")
    
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # ---------------------------------------------------------
        # 1. AUTHENTICATION & USER CREATION
        # ---------------------------------------------------------
        logger.info("Ensuring test user exists...")
        login_data = {"username": TEST_USER["username"], "password": TEST_USER["password"]}
        
        # Try logging in first
        auth_res = await client.post("/auth/login", data=login_data)
        
        if auth_res.status_code != 200:
            logger.info("User not found. Registering new test user...")
            await client.post("/auth/register", json=TEST_USER)
            auth_res = await client.post("/auth/login", data=login_data)
            
        if auth_res.status_code != 200:
            logger.error("Failed to authenticate test user. Is the backend running?")
            return

        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        logger.info("Successfully authenticated.")

        # ---------------------------------------------------------
        # 2. SEED CHAT CONVERSATIONS
        # ---------------------------------------------------------
        logger.info("Seeding chat conversations...")
        # Get existing to avoid creating thousands if run multiple times
        existing_chats = await client.get("/chat/conversations", headers=headers)
        
        if len(existing_chats.json()) < 3:
            for i in range(3):
                res = await client.post("/chat/conversations", headers=headers)
                if res.status_code == 200:
                    conv_id = res.json().get("id")
                    logger.info(f"Created conversation: {conv_id}")
                    
                    # Optional: Send a tiny, fast prompt to populate message history
                    # We use a very short prompt to prevent burning through your 16GB VRAM 
                    prompt = {"content": f"Reply with exactly one word: 'Ready{i}'.", "model": "qwen-2.5-14b-gguf"}
                    try:
                        # We use a standard POST here instead of streaming just to populate the DB quickly
                        await client.post(f"/chat/conversations/{conv_id}/messages", json=prompt, headers=headers)
                        logger.info(f"Populated messages for conversation {i+1}/3")
                    except Exception as e:
                        logger.warning(f"Message seeding skipped (LLM might be busy): {e}")
        else:
            logger.info("Conversations already exist. Skipping chat creation.")

        # ---------------------------------------------------------
        # 3. SEED DASHBOARD / TIMER STATS (If endpoints exist)
        # ---------------------------------------------------------
        logger.info("Seeding Pomodoro statistics...")
        # Assuming you have an endpoint to log completed focus sessions
        try:
            session_payload = {"duration_minutes": 25, "task_type": "work"}
            await client.post("/sessions", json=session_payload, headers=headers)
            logger.info("Added mock Pomodoro session to dashboard.")
        except Exception:
            logger.info("No /sessions endpoint found yet. Skipping timer stats.")

    logger.info("Database seeding complete! Your E2E tests are ready to run.")

if __name__ == "__main__":
    asyncio.run(seed_database())