from src.conflict_parser import parse_conflicts
from tests.fixtures.conflicted_file import CONFLICT_CONTENT
from tests.fixtures.complex_conflict import COMPLEX_CONFLICT
import pytest

def test_parse_single_conflict(conflicted_file):
    conflicts = parse_conflicts(str(conflicted_file))
    
    assert len(conflicts) == 1
    conflict = conflicts[0]
    
    assert conflict["current"] == 'print("Feature A added")'
    assert conflict["incoming"] == 'print("Feature B added")'
    assert "<<<<<<<" in conflict["full_match"]
    assert ">>>>>>>" in conflict["full_match"]
    assert "Hello World" in conflict["context"]

def test_parse_multiple_conflicts(tmp_path):
    # Create file with multiple conflicts
    file_path = tmp_path / "multi_conflict.py"
    file_path.write_text(COMPLEX_CONFLICT)
    
    conflicts = parse_conflicts(str(file_path))
    assert len(conflicts) == 2
    
    first = conflicts[0]
    assert "def add" in first["current"]
    assert "def sum" in first["incoming"]
    
    second = conflicts[1]
    assert "def multiply" in second["current"]
    assert "def product" in second["incoming"]

def test_no_conflicts(no_conflict_file):
    conflicts = parse_conflicts(str(no_conflict_file))
    assert conflicts == []

def test_file_not_found():
    with pytest.raises(FileNotFoundError):
        parse_conflicts("non_existent_file.py")