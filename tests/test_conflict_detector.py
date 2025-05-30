from src.conflict_detector import find_conflicts
import pytest
import os
import subprocess

def test_find_conflicts_in_git_repo(git_repo):
    # Switch to main and create a file
    subprocess.run(["git", "checkout", "main"], cwd=git_repo, check=True)
    (git_repo / "test.py").write_text("Initial content")
    subprocess.run(["git", "add", "test.py"], cwd=git_repo, check=True)
    subprocess.run(["git", "commit", "-m", "Add file"], cwd=git_repo, check=True)
    
    # Create divergent changes (feature branch already exists from fixture)
    subprocess.run(["git", "checkout", "feature"], cwd=git_repo, check=True)
    (git_repo / "test.py").write_text("Feature branch change")
    subprocess.run(["git", "add", "test.py"], cwd=git_repo, check=True)
    subprocess.run(["git", "commit", "-m", "Feature change"], cwd=git_repo, check=True)
    
    subprocess.run(["git", "checkout", "main"], cwd=git_repo, check=True)
    (git_repo / "test.py").write_text("Main branch change")
    subprocess.run(["git", "commit", "-am", "Main change"], cwd=git_repo, check=True)
    
    # Create merge conflict
    merge_process = subprocess.run(
        ["git", "merge", "feature"],
        cwd=git_repo,
        capture_output=True,
        text=True
    )
    assert "CONFLICT" in merge_process.stdout
    
    # Test conflict detection
    # Change to the git repo directory before calling find_conflicts
    import os
    original_cwd = os.getcwd()
    os.chdir(git_repo)
    try:
        conflicts = find_conflicts()
        assert "test.py" in conflicts
    finally:
        os.chdir(original_cwd)
    assert len(conflicts) == 1

def test_no_conflicts(git_repo):
    # Should return empty list when no conflicts
    conflicts = find_conflicts()
    assert conflicts == []

def test_not_git_repo(tmp_path):
    # Should raise error when not in Git repo
    os.chdir(tmp_path)
    with pytest.raises(Exception) as excinfo:
        find_conflicts()
    assert "Not a Git repository" in str(excinfo.value)