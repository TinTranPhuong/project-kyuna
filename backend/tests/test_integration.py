import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone

# Import our FastAPI app and DB components
from app.main import app
from app.core.database import Base, engine

# ---------------------------------------------------------
# Pytest Configuration & Fixtures
# ---------------------------------------------------------

@pytest.fixture(autouse=True)
async def setup_test_database():
    """
    Runs before EVERY test.
    Creates all tables in our SQLite database, then drops them after the test.
    This guarantees a perfectly clean slate for every test run.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield  # Test runs here
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def async_client():
    """Provides an async HTTP client connected directly to our FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


# ---------------------------------------------------------
# The Master Integration Test
# ---------------------------------------------------------

@pytest.mark.asyncio
async def test_core_user_journey(async_client: AsyncClient):
    """
    Tests the entire core user journey from registration to creating data.
    """
    
    # ==========================================
    # 1. Health Check
    # ==========================================
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

    # ==========================================
    # 2. Authentication Flow
    # ==========================================
    test_user = {
        "email": "dev@kyunaspace.com",
        "username": "kyuna_dev",
        "password": "Password123"
    }

    # A. Register
    reg_response = await async_client.post("/api/v1/auth/register", json=test_user)
    assert reg_response.status_code == 201, f"Registration failed: {reg_response.text}"
    
    data = reg_response.json()
    assert "access_token" in data
    assert data["user"]["email"] == test_user["email"]

    # B. Login
    login_response = await async_client.post("/api/v1/auth/login", json={
        "email": test_user["email"],
        "password": test_user["password"]
    })
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]
    
    # Set the auth header for all subsequent requests
    async_client.headers.update({"Authorization": f"Bearer {access_token}"})

    # C. Get "Me" Profile
    me_response = await async_client.get("/api/v1/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["username"] == test_user["username"]

    # ==========================================
    # 3. Settings Flow
    # ==========================================
    # A. Get Default Settings (created automatically on register)
    settings_res = await async_client.get("/api/v1/users/me/settings")
    assert settings_res.status_code == 200
    assert settings_res.json()["theme"] == "night-garden" # Our default
    
    # B. Update Settings
    update_res = await async_client.patch("/api/v1/users/me/settings", json={
        "theme": "space",
        "pomodoro_work_minutes": 50
    })
    assert update_res.status_code == 200
    assert update_res.json()["theme"] == "space"
    assert update_res.json()["pomodoro_work_minutes"] == 50

    # ==========================================
    # 4. Pomodoro Sessions Flow
    # ==========================================
    session_data = {
        "session_type": "work",
        "duration_minutes": 25,
        "completed": True,
        "started_at": datetime.now(timezone.utc).isoformat()
    }
    
    # A. Save a session
    pom_res = await async_client.post("/api/v1/sessions/pomodoro", json=session_data)
    assert pom_res.status_code == 201
    assert pom_res.json()["completed"] is True

    # B. Verify stats updated
    stats_res = await async_client.get("/api/v1/sessions/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_sessions"] == 1
    assert stats["total_focus_minutes"] == 25
    assert stats["current_streak"] == 1

    # ==========================================
    # 5. Chat History Flow
    # ==========================================
    # A. Create a conversation
    chat_req = {
        "title": "Initial Brainstorming",
        "system_prompt": "You are a helpful AI."
    }
    chat_res = await async_client.post("/api/v1/chat/conversations", json=chat_req)
    assert chat_res.status_code == 201
    chat_id = chat_res.json()["id"]
    assert chat_res.json()["title"] == "Initial Brainstorming"

    # B. List conversations
    list_chats_res = await async_client.get("/api/v1/chat/conversations")
    assert list_chats_res.status_code == 200
    assert len(list_chats_res.json()) == 1
    assert list_chats_res.json()[0]["id"] == chat_id

    print("\n✅ All core backend integrations passed successfully!")