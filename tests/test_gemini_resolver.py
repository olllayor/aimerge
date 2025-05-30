from src.gemini_resolver import resolve_with_gemini
import pytest
from unittest.mock import patch, MagicMock

def test_resolve_with_gemini(gemini_api_key):
    # Mock conflict data
    conflict = {
        "current": "print('Current change')",
        "incoming": "print('Incoming change')",
        "context": "# Context code\n"
    }
    
    # Mock Gemini response
    mock_response = MagicMock()
    mock_response.text = "print('Merged change')"
    
    with patch("google.generativeai.GenerativeModel") as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response
        
        # Test resolution
        resolved = resolve_with_gemini(conflict)
        assert resolved == "print('Merged change')"
        
        # Verify API call
        mock_model.return_value.generate_content.assert_called_once()
        prompt = mock_model.return_value.generate_content.call_args[0][0]
        assert "Current change" in prompt
        assert "Incoming change" in prompt

def test_missing_api_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    conflict = {"current": "", "incoming": "", "context": ""}
    
    with pytest.raises(RuntimeError) as excinfo:
        resolve_with_gemini(conflict)
    assert "API key not found" in str(excinfo.value)

def test_api_error_handling(gemini_api_key):
    conflict = {"current": "", "incoming": "", "context": ""}
    
    with patch("google.generativeai.GenerativeModel") as mock_model:
        mock_model.return_value.generate_content.side_effect = Exception("API error")
        
        with pytest.raises(RuntimeError) as excinfo:
            resolve_with_gemini(conflict)
        assert "Gemini API error" in str(excinfo.value)

def test_response_cleaning(gemini_api_key):
    # Test cleaning of code block markers
    conflict = {"current": "", "incoming": "", "context": ""}
    
    mock_response = MagicMock()
    mock_response.text = "```python\nprint('Hello')\n```"
    
    with patch("google.generativeai.GenerativeModel") as mock_model:
        mock_model.return_value.generate_content.return_value = mock_response
        
        resolved = resolve_with_gemini(conflict)
        assert resolved == "print('Hello')"