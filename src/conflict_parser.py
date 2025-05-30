import re
from typing import Dict, List


def parse_conflicts(file_path: str) -> List[Dict]:
    """Extract conflict regions from a file"""
    with open(file_path, "r") as f:
        content = f.read()

    conflicts = []
    # Improved regex to handle different conflict markers
    pattern = r"<<<<<<<[^\n]*\n(.*?)\n=======\n(.*?)\n>>>>>>>[^\n]*\n"

    for match in re.finditer(pattern, content, re.DOTALL):
        full_match = match.group(0)
        current_changes = match.group(1).strip()
        incoming_changes = match.group(2).strip()

        conflicts.append(
            {
                "current": current_changes,
                "incoming": incoming_changes,
                "context": get_context(content, match.start()),
                "full_match": full_match,
            }
        )

    return conflicts


def get_context(content: str, position: int, lines: int = 3) -> str:
    """Extract surrounding code context"""
    # Get context before conflict
    before_start = max(0, position - 300)  # Look back up to 300 characters
    before_text = content[before_start:position]
    before_lines = before_text.splitlines()[-lines:]

    # Find the end of the conflict marker by searching for the end pattern
    # This is a simple approach - we look for the next >>>>>>> marker
    after_start = position
    end_pattern = r">>>>>>>[^\n]*\n"
    match = re.search(end_pattern, content[after_start:])
    
    if match:
        after_end = after_start + match.end()
    else:
        # Fallback: estimate based on a reasonable distance
        after_end = position + 200
    
    after_text = content[after_end : after_end + 300]  # Next 300 characters
    after_lines = after_text.splitlines()[:lines]

    return "\n".join(before_lines + ["...CONFLICT HERE..."] + after_lines)
