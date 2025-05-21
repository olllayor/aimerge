#!/Users/macbookuz/Desktop/Projects/aimerge/.venv/bin/python

import os
import argparse
import subprocess
import re
import google.generativeai as genai
from dotenv import load_dotenv  # Keep this if you use .env for your own dev convenience

# --- Configuration ---
CONFIG_DIR = os.path.join(os.path.expanduser("~"), ".aimerge")
API_KEY_FILE = os.path.join(CONFIG_DIR, "google_api_key.txt")


def load_api_key():
    """
    Loads the Google API key.
    Priority:
    1. Environment variable GOOGLE_API_KEY
    2. Key from ~/.aimerge/google_api_key.txt
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if api_key:
        print("INFO: Loaded API key from GOOGLE_API_KEY environment variable.")
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
    """Saves the Google API key to the config file."""
    try:
        os.makedirs(CONFIG_DIR, exist_ok=True)
        with open(API_KEY_FILE, "w") as f:
            f.write(api_key)
        os.chmod(API_KEY_FILE, 0o600)
        print(f"INFO: Google API key saved to {API_KEY_FILE}.")
        print("INFO: For security, ensure this file remains readable only by you.")
        return True
    except Exception as e:
        print(f"ERROR: Could not save Google API key to {API_KEY_FILE}: {e}")
        return False


def get_gemini_client(api_key_val):
    """Initializes and returns the Google Gemini client if API key is valid."""
    if not api_key_val:
        print("ERROR: API key not provided for Gemini client.")
        return None
    try:
        genai.configure(api_key=api_key_val)
        # Test the API key by trying to get model info
        genai.get_model('models/gemini-1.5-flash-latest') # This will raise an exception if key is bad
        model = genai.GenerativeModel("gemini-1.5-flash-latest")
        print("INFO: Google Gemini API key validated and client initialized successfully.")
        return model
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
        # 'git diff --name-only --diff-filter=U' lists unmerged (conflicted) files
        result = subprocess.run(
            ["git", "diff", "--name-only", "--diff-filter=U"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        )
        for line in result.stdout.strip().split("\n"):
            if line:  # Ensure not an empty line if stdout is empty
                conflicted_files.append(os.path.join(repo_root, line))
    except subprocess.CalledProcessError as e:
        # This can happen if there are no conflicted files, git diff might return non-zero.
        # Or if not a git repo, though find_git_repo_root should catch that.
        if (
            "exit status 1" in str(e) and not e.stdout and not e.stderr
        ):  # Common for no diffs
            pass  # No conflicted files found
        else:
            print(f"Error checking for conflicted files: {e.stderr or e}")
    return conflicted_files


def parse_conflict_hunks(file_content):
    """
    Parses a file's content and yields conflict hunks.
    Each hunk is a dictionary: {'ours': str, 'base': str (optional), 'theirs': str, 'original_block': str}
    This is a simplified parser. Real-world Git conflicts can be more complex.
    """
    # Regex to find standard 3-way conflict markers.
    # It captures the 'ours' block, an optional 'base' block, and the 'theirs' block.
    # Group 1: Ours, Group 2: (Optional Base Start), Group 3: Base, Group 4: (Optional Base End), Group 5: Theirs
    # This regex is a starting point and might need refinement for edge cases.
    conflict_pattern = re.compile(
        r"<{7} HEAD\n(.*?)(?:\|{7} stage [^\n]+\n(.*?))?={7}\n(.*?)\>{7} [a-zA-Z0-9_.:/\-]+\n",
        re.DOTALL,  # DOTALL makes '.' match newlines as well
    )

    # For 2-way conflicts (no common ancestor explicitly shown, though Git uses one internally)
    # This is the more common visual marker.
    conflict_pattern_2way = re.compile(
        r"<{7} HEAD\n(.*?)\n={7}\n(.*?)\n>{7} [a-zA-Z0-9_.:/\-]+\n", re.DOTALL
    )

    last_end = 0
    for match in conflict_pattern_2way.finditer(file_content):
        original_block = match.group(0)
        ours_content = match.group(1)
        theirs_content = match.group(2)

        # Yield non-conflicting part before this hunk
        if match.start() > last_end:
            yield {"type": "content", "content": file_content[last_end : match.start()]}

        yield {
            "type": "conflict",
            "ours": ours_content,
            "theirs": theirs_content,
            "original_block": original_block,  # The full text of the conflict marker block
            "start_index": match.start(),
            "end_index": match.end(),
        }
        last_end = match.end()

    # Yield any remaining content after the last conflict
    if last_end < len(file_content):
        yield {"type": "content", "content": file_content[last_end:]}


def get_ai_resolution(client, ours, theirs, base=None, filename=""):
    """Gets a proposed resolution from Google Gemini."""
    # Prompt for Google Gemini.
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
        "Explain your reasoning briefly if the merge is non-trivial. "
        "Output ONLY the merged code block for the conflicting section. Do not include the markers like <<<<<<<."
    )
    prompt = "\n".join(prompt_parts)

    print("\nDEBUG: Sending prompt to Gemini:")
    # print(prompt) # Can be very verbose
    print("OURS:\n" + ours)
    print("THEIRS:\n" + theirs)
    print("Asking AI for resolution...")

    try:
        # For Gemini, the client is the model itself.
        # The system role is incorporated into the main prompt.
        response = client.generate_content(prompt)
        ai_suggestion = response.text.strip()
        # Potentially parse out explanation if we ask for it in a structured way
        return ai_suggestion, "Gemini AI explanation placeholder."  # TODO: Extract explanation for Gemini
    except Exception as e:
        print(f"ERROR: Google Gemini API call failed: {e}")
        return None, None


def process_file_conflicts(client, filepath):
    """Processes all conflicts in a single file using Google Gemini for resolution proposals."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            original_content = f.read()
    except Exception as e:
        print(f"ERROR: Could not read file {filepath}. Details: {e}")
        return False

    new_content_parts = []
    # Use a list to easily get hunks and check for conflicts
    hunks = list(parse_conflict_hunks(original_content))

    # Check if any actual conflict hunks exist
    found_conflicts = any(hunk_data["type"] == "conflict" for hunk_data in hunks)
    if not found_conflicts:
        # This case can be hit if find_conflicted_files is accurate but the file was resolved
        # manually before aimerge processes it, or if the parser fails to find markers
        # that `git diff --diff-filter=U` detected.
        print(f"INFO: No conflict markers found by parser in {os.path.basename(filepath)}. Skipping.")
        return True  # No changes needed from aimerge's perspective

    modified_this_file = False
    conflict_idx = 0  # For numbering conflicts presented to the user

    for hunk_data in hunks:
        if hunk_data["type"] == "content":
            new_content_parts.append(hunk_data["content"])
            continue

        # It's a conflict hunk
        conflict_idx += 1
        print(f"\n--- Conflict #{conflict_idx} in {os.path.basename(filepath)} ---")
        print("OURS (HEAD):")
        print(hunk_data["ours"])
        print("-" * 20)
        print("THEIRS:")
        print(hunk_data["theirs"])
        print("-" * 20)

        ai_suggestion, ai_explanation = get_ai_resolution(
            client,
            hunk_data["ours"],
            hunk_data["theirs"],
            filename=os.path.basename(filepath),
        )

        applied_ai_suggestion_for_this_hunk = False
        if ai_suggestion:
            print("GEMINI AI PROPOSAL:")
            print(ai_suggestion)
            # print(f"Gemini AI Explanation: {ai_explanation}") # TODO
            print("-" * 20)

            while True:
                # Choice: Apply AI, keep original, or (future) manual edit.
                choice = input(
                    "Apply Gemini AI suggestion? (y)es / (n)o, keep original conflict: "
                ).lower()
                if choice == "y":
                    new_content_parts.append(ai_suggestion)
                    modified_this_file = True
                    applied_ai_suggestion_for_this_hunk = True
                    print("Gemini AI suggestion marked for application.")
                    break
                elif choice == "n":
                    new_content_parts.append(
                        hunk_data["original_block"]
                    )  # Keep original conflict
                    print("Keeping original conflict markers for this hunk.")
                    break
                else:
                    print("Invalid choice. Please enter 'y' or 'n'.")
        else:
            print("Gemini AI could not provide a suggestion for this hunk.")
            new_content_parts.append(
                hunk_data["original_block"]
            )  # Keep original conflict

    if modified_this_file:
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write("".join(new_content_parts))
            print(f"\nINFO: Successfully updated {os.path.basename(filepath)} with accepted Gemini AI resolutions.")
            return True
        except Exception as e:
            print(f"ERROR: Could not write changes to {filepath}. Details: {e}")
            return False
    elif found_conflicts:  # Conflicts were found, but no AI suggestions were applied
        print(
            f"\nINFO: No Gemini AI resolutions were applied to {os.path.basename(filepath)}. Original conflicts remain where Gemini AI was not used or failed."
        )
        return True  # Still considered success in terms of processing, just no changes made by AI

    # This case should ideally be caught by "not found_conflicts" earlier if no conflicts.
    # If it reaches here, it means found_conflicts was false initially.
    return True


def main():
    parser = argparse.ArgumentParser(
        description="AIMerge - Merge conflicts in Git with Google Gemini. Run with no arguments in a Git repo with conflicts."
    )
    parser.add_argument(
        "--set-api-key",
        metavar="YOUR_API_KEY",
        help="Set your Google API key. Example: aimerge --set-api-key YOUR_GOOGLE_API_KEY",
    )

    args = parser.parse_args()
    load_dotenv()

    if args.set_api_key:
        if save_api_key(args.set_api_key):
            print("INFO: Google API key set successfully.")
        else:
            print("ERROR: Failed to save Google API key.") # Message improved
        return 0

    api_key = load_api_key()
    if not api_key:
        print("ERROR: Google API key not found or could not be loaded.") # Message improved
        print(
            "To set it up, run: `aimerge --set-api-key YOUR_GOOGLE_API_KEY_HERE`"
        )
        print("Or set the GOOGLE_API_KEY environment variable.")
        print("Get your key from Google AI Studio: https://aistudio.google.com/app/apikey")
        return 1

    client = get_gemini_client(api_key)
    if not client:
        # get_gemini_client() already prints specific errors
        print("ERROR: Failed to initialize Google Gemini client. Please check your API key and network connection.")
        return 1

    print("INFO: AIMerge initialized with your Google Gemini API key.") # Added Gemini

    repo_root = find_git_repo_root()
    if not repo_root:
        # find_git_repo_root() already prints specific error
        return 1

    conflicted_f_paths = find_conflicted_files(repo_root)
    if not conflicted_f_paths:
        print("INFO: No conflicted files found in this Git repository. Nothing to do.") # Message improved
        return 0

    print(f"INFO: Found {len(conflicted_f_paths)} conflicted file(s) to process:")
    for f_path in conflicted_f_paths:
        print(f"  - {os.path.relpath(f_path, repo_root)}")

    all_files_processed_successfully = True
    any_ai_modifications_applied = False

    for f_path in conflicted_f_paths:
        print(f"\n>>> Processing conflicts in: {os.path.relpath(f_path, repo_root)}")
        
        # process_file_conflicts returns True if the file was processed (even if no changes made),
        # and False if a critical error occurred (like file read/write error).
        # We also need to track if any AI suggestions were actually applied.
        # Let's assume process_file_conflicts will be updated to return a tuple: (success, modified_by_ai)
        # For now, we'll adapt to its current boolean return.
        
        # The function `process_file_conflicts` includes detailed print statements
        # about whether AI suggestions were applied or if the file was updated.
        # We'll rely on its return value for overall success of processing that file.
        
        original_file_content = ""
        try:
            with open(f_path, "r", encoding="utf-8") as f:
                original_file_content = f.read()
        except Exception:
            pass # Error will be handled in process_file_conflicts or if it can't read

        if process_file_conflicts(client, f_path):
            # Check if file was actually modified by AI
            try:
                with open(f_path, "r", encoding="utf-8") as f_after:
                    if f_after.read() != original_file_content:
                        any_ai_modifications_applied = True
            except Exception:
                pass # If reading after fails, assume not modified or error already reported
        else:
            all_files_processed_successfully = False
            print(f"WARNING: Errors encountered while processing {os.path.basename(f_path)}. It may not have been updated correctly.")

    print("\n--- AIMerge Processing Summary ---")
    if not conflicted_f_paths: # Should have been caught earlier, but as a safeguard.
        print("No conflicted files were found to process.")
    elif all_files_processed_successfully:
        if any_ai_modifications_applied:
            print("INFO: All conflicted files processed. Some files were modified with Gemini AI suggestions.")
            print("Please review the changes, then `git add .` and continue your merge (e.g., `git merge --continue`).")
        else:
            print("INFO: All conflicted files processed. No Gemini AI suggestions were applied to any file.")
            print("Original conflict markers remain where AI suggestions were not chosen or could not be generated.")
            print("You may need to resolve conflicts manually. Afterwards, `git add .` and continue your merge.")
    else:
        print("WARNING: Some files encountered errors during processing.")
        print("Review the logs above. You may need to resolve conflicts manually in affected files.")
        print("After resolving and saving, `git add .` and continue your merge.")

    return 0 if all_files_processed_successfully else 1


# Ensure all helper functions (load_api_key, save_api_key, get_gemini_client,
# find_git_repo_root, find_conflicted_files, parse_conflict_hunks, get_ai_resolution)
# are defined above main or imported. For brevity, I'm assuming they are present
# and using the versions from our previous discussions.
# You'll need to copy them into this script if they aren't already.
if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)
