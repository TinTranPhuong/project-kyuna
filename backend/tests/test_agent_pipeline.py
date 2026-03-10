import pytest
import asyncio
import json
from unittest.mock import AsyncMock, patch, MagicMock

from app.routers.agent import _execute_full_workflow
from app.schemas.agent import AgentPlanStep
from app.services.agents.orchestrator import WorkingMemory
from app.services.agents.evaluator import EvalResult
from app.services.agents.reflector import ReflectionResult
import app.routers.agent

# Helper mock for SSE Queue
class MockQueue:
    async def put(self, item):
        pass

@pytest.fixture
def mock_run_data(monkeypatch):
    run_data = {"test_run_id": {"message": "Test msg", "model": "test_model", "memory_context": "Initial context"}}
    monkeypatch.setattr(app.routers.agent, "_run_data", run_data)
    
@pytest.fixture
def mock_sse_queues(monkeypatch):
    queues = {"test_run_id": AsyncMock()}
    monkeypatch.setattr(app.routers.agent, "_sse_queues", queues)

@pytest.fixture
def mock_dependencies(monkeypatch):
    # Mocking out the complex external functions
    execute_plan_mock = AsyncMock(return_value=WorkingMemory(run_id="test_run_id", steps_results={1: "Exec result"}))
    synthesize_mock = AsyncMock(return_value="Synthesized Output")
    
    evaluate_mock = AsyncMock()
    # Default to pass
    evaluate_mock.return_value = EvalResult(passed=True, failed_steps=[], feedback="Looks good.")
    
    reflect_post_exec_mock = AsyncMock(return_value="Post-Exec thoughts")
    
    # Default to pass final reflection
    reflect_final_mock = AsyncMock()
    reflect_final_mock.return_value = ReflectionResult(is_satisfactory=True, feedback="Great job.")
    
    consensus_on_answer_mock = AsyncMock(return_value={"agree": True, "reasoning": "Agreed"})

    monkeypatch.setattr("app.services.agents.executor.execute_plan", execute_plan_mock)
    monkeypatch.setattr("app.services.agents.synthesizer.synthesize", synthesize_mock)
    monkeypatch.setattr("app.services.agents.evaluator.evaluate", evaluate_mock)
    monkeypatch.setattr("app.services.agents.reflector.reflect_post_exec", reflect_post_exec_mock)
    monkeypatch.setattr("app.services.agents.reflector.reflect_final", reflect_final_mock)
    monkeypatch.setattr("app.services.agents.consensus.run_consensus_on_answer", consensus_on_answer_mock)
    
    # Mock AsyncSessionLocal
    mock_db = AsyncMock()
    mock_db.__aenter__.return_value = mock_db
    monkeypatch.setattr("app.core.database.AsyncSessionLocal", MagicMock(return_value=mock_db))

    return {
        "execute_plan": execute_plan_mock,
        "synthesize": synthesize_mock,
        "evaluate": evaluate_mock,
        "reflect_post_exec": reflect_post_exec_mock,
        "reflect_final": reflect_final_mock,
        "run_consensus_on_answer": consensus_on_answer_mock
    }

@pytest.mark.asyncio
async def test_post_exec_reflection_is_called(mock_run_data, mock_sse_queues, mock_dependencies):
    steps = [AgentPlanStep(step_index=1, tool_name="test", description="desc", args={}, requires_hitl=False, agent_name="none")]
    await _execute_full_workflow("test_run_id", steps, "user_id", enable_consensus=False)
    
    mock_dependencies["reflect_post_exec"].assert_called_once()
    mock_dependencies["synthesize"].assert_called_once()

@pytest.mark.asyncio
async def test_final_reflection_redo_loop(mock_run_data, mock_sse_queues, mock_dependencies, monkeypatch):
    steps = [AgentPlanStep(step_index=1, tool_name="test", description="desc", args={}, requires_hitl=False, agent_name="none")]
    
    # First reflect_final fails, second passes
    mock_dependencies["reflect_final"].side_effect = [
        ReflectionResult(is_satisfactory=False, feedback="Bad layout"),
        ReflectionResult(is_satisfactory=True, feedback="Much better")
    ]
    
    await _execute_full_workflow("test_run_id", steps, "user_id", enable_consensus=False)
    
    # Make sure we synthesized twice - once initially, once for redo
    assert mock_dependencies["synthesize"].call_count == 2
    assert mock_dependencies["reflect_final"].call_count == 2

@pytest.mark.asyncio
async def test_final_reflection_max_retries(mock_run_data, mock_sse_queues, mock_dependencies, monkeypatch):
    steps = [AgentPlanStep(step_index=1, tool_name="test", description="desc", args={}, requires_hitl=False, agent_name="none")]
    
    # Always fail final reflection
    mock_dependencies["reflect_final"].return_value = ReflectionResult(is_satisfactory=False, feedback="Never good enough")
    
    from app.core.config import settings
    monkeypatch.setattr(settings, "AGENT_MAX_RETRIES", 2)
    
    await _execute_full_workflow("test_run_id", steps, "user_id", enable_consensus=False)
    
    # 1 initial + 2 retries = 3 synthesize calls and 3 reflect_final calls
    assert mock_dependencies["synthesize"].call_count == 3
    assert mock_dependencies["reflect_final"].call_count == 3

@pytest.mark.asyncio
async def test_consensus_skipped_when_disabled(mock_run_data, mock_sse_queues, mock_dependencies):
    steps = [AgentPlanStep(step_index=1, tool_name="test", description="desc", args={}, requires_hitl=False, agent_name="none")]
    
    await _execute_full_workflow("test_run_id", steps, "user_id", enable_consensus=False)
    
    mock_dependencies["run_consensus_on_answer"].assert_not_called()

@pytest.mark.asyncio
async def test_consensus_called_when_enabled(mock_run_data, mock_sse_queues, mock_dependencies):
    steps = [AgentPlanStep(step_index=1, tool_name="test", description="desc", args={}, requires_hitl=False, agent_name="none")]
    
    await _execute_full_workflow("test_run_id", steps, "user_id", enable_consensus=True)
    
    mock_dependencies["run_consensus_on_answer"].assert_called_once()
