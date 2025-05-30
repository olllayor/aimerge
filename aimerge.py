#!/Users/macbookuz/Desktop/Projects/aimerge/.venv/bin/python

import os
import argparse
import subprocess
import re
import google.generativeai as genai
from dotenv import load_dotenv

# --- Configuration ---
CONFIG_DIR = os.path.join(os.path.expanduser("~"), ".aimerge")
API_KEY_FILE = os.path.join(CONFIG_DIR, "gemini_api_key.txt")


def load_api_key():
    """
    Loads the Google Gemini API key.
    Priority:
    1. Environment variable GEMINI_API_KEY
    2. Key from ~/.aimerge/gemini_api_key.txt
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        print("INFO: Loaded API key from GEMINI_API_KEY environment variable.")
        return api_key

    if os.path.exists(API_KEY_FILE):
        try:
            with open(API_KEY_FILE, "r") as f:
                api_key = f.read().strip()
            if api_key:
                print(f"INFO: Loaded API key from {API_KEY_FILE}.")
                return api_key
        except Exception as e:
            print(f"WARNING: Could not read API key from {API_KEY_FILE}: {e}")
    return None


def save_api_key(api_key):
    """Saves the API key to the config file."""
    try:
        os.makedirs(CONFIG_DIR, exist_ok=True)
        with open(API_KEY_FILE, "w") as f:
            f.write(api_key)
        os.chmod(API_KEY_FILE, 0o600)
        print(f"INFO: API key saved to {API_KEY_FILE}.")
        print("INFO: For security, ensure this file remains readable only by you.")
        return True
    except Exception as e:
        print(f"ERROR: Could not save API key to {API_KEY_FILE}: {e}")
        return False


def get_gemini_model(api_key, model_name="gemini-1.5-flash"):
    """Initializes and returns the Gemini model if API key is valid."""
    if not api_key:
        return None
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        # Test the model with a simple prompt
        test_response = model.generate_content("Hello")
        if test_response and test_response.text:
            print("INFO: Google Gemini API key validated successfully.")
            return model
        else:
            print("ERROR: Failed to validate API key.")
            return None
    except Exception as e:
        print(f"ERROR: Google Gemini API key seems invalid or connection failed: {e}")
        return None


def find_git_repo_root():
    """Finds the root directory of the Git repository."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("ERROR: Not in a Git repository or Git not installed.")
        return None


def find_conflicted_files(repo_root):
    """Finds files with Git conflict markers."""
    conflicted_files = []
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "--diff-filter=U"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        )
        for line in result.stdout.strip().split("\n"):
            if line:
                conflicted_files.append(os.path.join(repo_root, line))
    except subprocess.CalledProcessError as e:
        if "exit status 1" in str(e) and not e.stdout and not e.stderr:
            pass  # No conflicted files found
        else:
            print(f"ERROR: Checking for conflicted files failed: {e.stderr or e}")
    return conflicted_files


def parse_conflict_hunks(file_content):
    """
    Parses a file's content and yields conflict hunks.
    Yields dicts: {'type': 'conflict' or 'content', ...}
    """
    conflict_pattern_2way = re.compile(
        r"<{7} HEAD\n(.*?)\n={7}\n(.*?)\n>{7} [a-zA-Z0-9_.:/\-]+\n", re.DOTALL
    )

    last_end = 0
    for match in conflict_pattern_2way.finditer(file_content):
        original_block = match.group(0)
        ours_content = match.group(1)
        theirs_content = match.group(2)

        if match.start() > last_end:
            yield {"type": "content", "content": file_content[last_end : match.start()]}

        yield {
            "type": "conflict",
            "ours": ours_content,
            "theirs": theirs_content,
            "original_block": original_block,
            "start_index": match.start(),
            "end_index": match.end(),
        }
        last_end = match.end()

    if last_end < len(file_content):
        yield {"type": "content", "content": file_content[last_end:]}


def get_ai_resolution(model, ours, theirs, base=None, filename=""):
    """Gets a proposed resolution from Google Gemini."""
    prompt_parts = [
        f"You are an expert Git merge conflict resolver. Analyze the following conflict from the file '{filename}'.",
        "OURS (HEAD):",
        "```",
        ours,
        "```",
        "THEIRS:",
        "```",
        theirs,
        "```",
    ]
    if base:
        prompt_parts.extend(["BASE (COMMON ANCESTOR):", "```", base, "```"])
    prompt_parts.append(
        "Propose a merged version of this code block that intelligently combines the changes. "
        "Output ONLY the merged code block for the conflicting section. Do not include markers like <<<<<<<."
    )
    prompt = "\n".join(prompt_parts)

    try:
        response = model.generate_content(prompt)
        ai_suggestion = response.text.strip()
        return ai_suggestion
    except Exception as e:
        print(f"ERROR: Google Gemini API call failed: {e}")
        return None


def process_file_conflicts(model, filepath):
    """Processes all conflicts in a single file using AI resolution."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            original_content = f.read()
    except Exception as e:
        print(f"ERROR: Reading file {filepath}: {e}")
        return False

    new_content_parts = []
    hunks = list(parse_conflict_hunks(original_content))
    found_conflicts = any(hunk["type"] == "conflict" for hunk in hunks)

    if not found_conflicts:
        print(f"INFO: No conflict markers found in {filepath}.")
        return True

    modified = False
    conflict_idx = 0

    for hunk in hunks:
        if hunk["type"] == "content":
            new_content_parts.append(hunk["content"])
            continue

        conflict_idx += 1
        print(f"\n--- Conflict #{conflict_idx} in {os.path.basename(filepath)} ---")
        print("OURS (HEAD):")
        print(hunk["ours"])
        print("-" * 20)
        print("THEIRS:")
        print(hunk["theirs"])
        print("-" * 20)

        ai_suggestion = get_ai_resolution(
            model, hunk["ours"], hunk["theirs"], filename=os.path.basename(filepath)
        )

        if ai_suggestion:
            print("AI PROPOSAL:")
            print(ai_suggestion)
            print("-" * 20)
            while True:
                choice = input("Apply AI suggestion? (y)es / (n)o: ").lower()
                if choice == "y":
                    new_content_parts.append(ai_suggestion)
                    modified = True
                    print("INFO: AI suggestion applied.")
                    break
                elif choice == "n":
                    new_content_parts.append(hunk["original_block"])
                    print("INFO: Original conflict retained.")
                    break
                else:
                    print("ERROR: Please enter 'y' or 'n'.")
        else:
            print("WARNING: AI failed to suggest a resolution.")
            new_content_parts.append(hunk["original_block"])

    if modified:
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write("".join(new_content_parts))
            print(f"INFO: Updated {filepath} with AI resolutions.")
            return True
        except Exception as e:
            print(f"ERROR: Writing changes to {filepath}: {e}")
            return False
    else:
        print(f"INFO: No changes applied to {filepath}.")
        return True


def main():
    parser = argparse.ArgumentParser(
        description="AIMerge - AI-Powered Merge Conflict Resolver using Google Gemini."
    )
    parser.add_argument(
        "--set-api-key",
        metavar="YOUR_API_KEY",
        help="Set your Google Gemini API key. Example: aimerge --set-api-key YOUR_GEMINI_KEY",
    )

    args = parser.parse_args()
    load_dotenv()

    if args.set_api_key:
        if save_api_key(args.set_api_key):
            print("INFO: API key set successfully.")
        else:
            print("ERROR: Failed to save API key.")
        return 0

    api_key = load_api_key()
    if not api_key:
        print("ERROR: Google Gemini API key not found.")
        print("Run: `aimerge --set-api-key YOUR_GEMINI_KEY`")
        print("Or set the GEMINI_API_KEY environment variable.")
        return 1

    model = get_gemini_model(api_key)
    if not model:
        return 1

    print("INFO: AIMerge initialized with your Google Gemini API key.")

    repo_root = find_git_repo_root()
    if not repo_root:
        return 1

    conflicted_files = find_conflicted_files(repo_root)
    if not conflicted_files:
        print("INFO: No conflicted files found.")
        return 0

    print(f"Found {len(conflicted_files)} conflicted file(s):")
    for f_path in conflicted_files:
        print(f"  - {os.path.relpath(f_path, repo_root)}")

    success = True
    for f_path in conflicted_files:
        print(f"\n>>> Processing {os.path.relpath(f_path, repo_root)}")
        if not process_file_conflicts(model, f_path):
            success = False

    if success:
        print("\nINFO: Conflict processing completed.")
        print("Review changes, then run `git add .` and `git merge --continue`.")
    else:
        print("\nWARNING: Errors occurred during processing.")
    return 0 if success else 1


if __name__ == "__main__":
    exit(main())
