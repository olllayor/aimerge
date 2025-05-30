import subprocess
from src.git_integration import stage_resolution
from unittest.mock import patch
import pytest

def test_stage_resolution_success(git_repo):
    # Create a test file
    test_file = git_repo / "test.py"
    test_file.write_text("content")
    
    # Stage the file
    with patch("subprocess.run") as mock_run:
        stage_resolution(str(test_file))
        
        mock_run.assert_called_once_with(
            ["git", "add", str(test_file)],
            check=True,
            stdout=-3,  # subprocess.DEVNULL
            stderr=-3   # subprocess.DEVNULL
        )

def test_stage_resolution_failure(git_repo):
    test_file = git_repo / "test.py"
    test_file.write_text("content")
    
    with patch("subprocess.run") as mock_run:
        mock_run.side_effect = subprocess.CalledProcessError(1, "git add")
        
        with pytest.raises(subprocess.CalledProcessError):
            stage_resolution(str(test_file))

def test_file_not_found():
    with pytest.raises(subprocess.CalledProcessError):
        stage_resolution("non_existent_file.py")