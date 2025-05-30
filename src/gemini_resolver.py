import os
from typing import Dict
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()


def resolve_with_gemini(conflict: Dict, model: str = "gemini-1.5-pro") -> str:
    """Resolve conflict using Gemini API"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Gemini API key not found. "
            "Please run 'aimerge config YOUR_API_KEY' or create a .env file"
        )

    genai.configure(api_key=api_key)

    prompt = f"""
    You are a code merging assistant. Resolve this Git conflict by intelligently 
    combining changes from both branches. Follow these rules:
    
    1. Preserve functionality from BOTH versions
    2. Maintain code style and conventions
    3. Keep imports/declarations only once
    4. Return ONLY the merged code without explanations
    
    ----- CONTEXT (surrounding code) -----
    {conflict["context"]}
    
    ----- CURRENT CHANGES (our branch) -----
    {conflict["current"]}
    
    ----- INCOMING CHANGES (their branch) -----
    {conflict["incoming"]}
    
    ----- MERGED RESULT -----
    """

    try:
        model = genai.GenerativeModel(model)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2, max_output_tokens=2000
            ),
        )

        # Clean response
        resolved = response.text.strip()
        # Remove code block markers if present
        if resolved.startswith("```") and resolved.endswith("```"):
            resolved = "\n".join(resolved.splitlines()[1:-1])
        return resolved

    except Exception as e:
        raise RuntimeError(f"Gemini API error: {str(e)}")
