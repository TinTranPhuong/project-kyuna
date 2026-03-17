"""
Coding Agents Registry — maps agent names to their specialist modules.
"""
from app.services.agents.coding_agents.analysis import run as run_analysis
from app.services.agents.coding_agents.backend_dev import run as run_backend_dev
from app.services.agents.coding_agents.frontend_dev import run as run_frontend_dev
from app.services.agents.coding_agents.frontend_design import run as run_frontend_design
from app.services.agents.coding_agents.tester import run as run_tester
from app.services.agents.coding_agents.code_reviewer import run as run_code_reviewer

CODING_AGENT_REGISTRY = {
    "analysis": run_analysis,
    "backend_dev": run_backend_dev,
    "frontend_dev": run_frontend_dev,
    "frontend_design": run_frontend_design,
    "tester": run_tester,
    "code_reviewer": run_code_reviewer,
}
