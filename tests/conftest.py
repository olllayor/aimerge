import pytest
import os
import tempfile
import shutil
import subprocess
from pathlib import Path
import sys

# Add src directory to Python path

from tests.fixtures.conflicted_file import CONFLICT_CONTENT
from tests.fixtures.no_conflict import NO_CONFLICT_CONTENT

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


@pytest.fixture
def git_repo(tmp_path):
    # Create a temporary Git repository
    repo_path = tmp_path / "test_repo"
    repo_path.mkdir()

    # Initialize Git repo
    subprocess.run(["git", "init"], cwd=repo_path, check=True)

    # Create initial commit
    (repo_path / "README.md").write_text("# Test Repo")
    subprocess.run(["git", "add", "."], cwd=repo_path, check=True)
    subprocess.run(["git", "commit", "-m", "Initial commit"], cwd=repo_path, check=True)

    # Create feature branch
    subprocess.run(["git", "checkout", "-b", "feature"], cwd=repo_path, check=True)

    yield repo_path

    # Cleanup
    shutil.rmtree(repo_path)


@pytest.fixture
def conflicted_file(tmp_path):
    file_path = tmp_path / "conflicted.py"
    file_path.write_text(CONFLICT_CONTENT)
    return file_path


@pytest.fixture
def no_conflict_file(tmp_path):
    file_path = tmp_path / "no_conflict.py"
    file_path.write_text(NO_CONFLICT_CONTENT)
    return file_path


@pytest.fixture
def gemini_api_key(monkeypatch):
    # Mock API key for Gemini tests
    monkeypatch.setenv("GEMINI_API_KEY", "test-api-key")
    return "test-api-key"
