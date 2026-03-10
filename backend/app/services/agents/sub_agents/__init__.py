from .analysis_agent import run as run_analysis
from .translator_agent import run as run_translator
from .coding_agent import run as run_coding
from .web_search_agent import run as run_web_search
from .content_writing_agent import run as run_content_writing

SUB_AGENT_REGISTRY = {
    "analysis": run_analysis,
    "translator": run_translator,
    "coding": run_coding,
    "web_search": run_web_search,
    "content_writing": run_content_writing,
}
