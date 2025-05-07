#!/Users/macbookuz/Desktop/Projects/aimerge/.venv/bin/python

import os
import argparse
import subprocess
import re
from openai import OpenAI
from dotenv import load_dotenv  # Keep this if you use .env for your own dev convenience

# --- Configuration ---
CONFIG_DIR = os.path.join(os.path.expanduser("~"), ".aimerge")
API_KEY_FILE = os.path.join(CONFIG_DIR, "api_key.txt")


def load_api_key():
    """
    Loads the OpenAI API key.
    Priority:
    1. Environment variable OPENAI_API_KEY
    2. Key from ~/.aimerge/api_key.txt
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        print("INFO: Loaded API key from OPENAI_API_KEY environment variable.")
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


def get_openai_client(api_key_val):
    """Initializes and returns the OpenAI client if API key is valid."""
    if not api_key_val:
        return None
    try:
        client = OpenAI(api_key=api_key_val)
        client.models.list()  # Test API key
        print("INFO: OpenAI API key validated successfully.")
        return client
    except Exception as e:
        print(f"ERROR: OpenAI API key seems invalid or connection failed: {e}")
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
    """Gets a proposed resolution from OpenAI."""
    # Basic prompt, needs significant refinement!
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

    print("\nDEBUG: Sending prompt to OpenAI:")
    # print(prompt) # Can be very verbose
    print("OURS:\n" + ours)
    print("THEIRS:\n" + theirs)
    print("Asking AI for resolution...")

    try:
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",  # Or gpt-4 if budget allows and user prefers
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert software developer helping resolve Git merge conflicts.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        ai_suggestion = completion.choices[0].message.content.strip()
        # Potentially parse out explanation if we ask for it in a structured way
        return ai_suggestion, "AI explanation placeholder."  # TODO: Extract explanation
    except Exception as e:
        print(f"ERROR: OpenAI API call failed: {e}")
        return None, None


def process_file_conflicts(client, filepath):
    """Processes all conflicts in a single file, focusing only on AI resolution."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            original_content = f.read()
    except Exception as e:
        print(f"Error reading file {filepath}: {e}")
        return False

    new_content_parts = []
    # Use a list to easily get hunks and check for conflicts
    hunks = list(parse_conflict_hunks(original_content))

    # Check if any actual conflict hunks exist
    found_conflicts = any(hunk_data["type"] == "conflict" for hunk_data in hunks)
    if not found_conflicts:
        # This case should ideally not be hit if find_conflicted_files is accurate,
        # but good to handle. If the file was listed as conflicted but has no markers
        # (e.g., resolved manually before aimerge runs on it), we do nothing.
        # print(f"No conflict markers found in {filepath} by the parser.")
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
            print("AI PROPOSAL:")
            print(ai_suggestion)
            # print(f"AI Explanation: {ai_explanation}") # TODO
            print("-" * 20)

            while True:
                # Simplified choice: Apply AI or leave as is (manual/skip)
                choice = input(
                    "Apply AI suggestion? (y)es / (n)o, keep original conflict: "
                ).lower()
                if choice == "y":
                    new_content_parts.append(ai_suggestion)
                    modified_this_file = True
                    applied_ai_suggestion_for_this_hunk = True
                    print("AI suggestion marked for application.")
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
            print("AI could not provide a suggestion for this hunk.")
            new_content_parts.append(
                hunk_data["original_block"]
            )  # Keep original conflict

    if modified_this_file:
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write("".join(new_content_parts))
            print(f"\nINFO: Updated {filepath} with accepted AI resolutions.")
            return True
        except Exception as e:
            print(f"Error writing changes to {filepath}: {e}")
            return False
    elif found_conflicts:  # Conflicts were found, but no AI suggestions were applied
        print(
            f"\nINFO: No AI resolutions were applied to {filepath}. Original conflicts remain where AI was not used or failed."
        )
        return True  # Still considered success in terms of processing, just no changes made by AI

    return True  # Should be caught by "not found_conflicts" earlier if no conflicts


def main():
    parser = argparse.ArgumentParser(
        description="AIMerge - AI Powered Merge Conflict Resolver. Run with no arguments in a Git repo with conflicts."
    )
    parser.add_argument(
        "--set-api-key",
        metavar="YOUR_API_KEY",
        help="Set your OpenAI API key. Example: aimerge --set-api-key sk-...",
    )

    args = parser.parse_args()
    load_dotenv()

    if args.set_api_key:
        if save_api_key(args.set_api_key):
            print("API key set successfully.")
        else:
            print("Failed to save API key.")
        return 0

    api_key = load_api_key()
    if not api_key:
        print("ERROR: OpenAI API key not found.")
        print(
            "To set it up, run: `git aimerge --set-api-key YOUR_OPENAI_KEY_HERE`"
        )  # Updated to suggest git aimerge
        print("Or set the OPENAI_API_KEY environment variable.")
        print("Get your key from https://platform.openai.com/api-keys")
        return 1

    client = get_openai_client(api_key)
    if not client:
        return 1

    print("INFO: AIMerge initialized with your OpenAI API key.")

    repo_root = find_git_repo_root()
    if not repo_root:
        print("ERROR: Not inside a Git repository or Git is not installed.")
        return 1

    conflicted_f_paths = find_conflicted_files(repo_root)  # Renamed for clarity
    if not conflicted_f_paths:
        print("INFO: No conflicted files found in this Git repository.")
        return 0

    print(f"Found {len(conflicted_f_paths)} conflicted file(s):")
    for f_path in conflicted_f_paths:
        print(f"  - {os.path.relpath(f_path, repo_root)}")

    overall_success = True
    any_modifications_made_by_aimerge = False

    for f_path in conflicted_f_paths:
        print(f"\n>>> Processing conflicts in: {os.path.relpath(f_path, repo_root)}")
        # process_file_conflicts now returns True if processing occurred,
        # and implies modification if content was actually changed.
        # We need to know if it *tried* to modify and succeeded.
        # A better return might be a tuple: (processed_ok, was_modified)

        # For now, let's assume process_file_conflicts modifies the file directly
        # and its return indicates overall success of its operation on that file.
        # We'll check if the file was modified by seeing if 'modified_this_file' was true inside it.
        # This requires process_file_conflicts to perhaps return if it made changes.

        # Let's adjust process_file_conflicts to return if it modified the file.
        # process_file_conflicts(client, filepath) -> returns True if modified, False otherwise (or on error)

        # Simpler: process_file_conflicts returns a status (e.g. 'MODIFIED', 'NO_AI_APPLIED', 'ERROR')
        # For now, let's just check if any file processing leads to `modified_this_file = True`
        # This logic needs a bit of refinement for clarity on "overall success" vs "any changes made"

        if process_file_conflicts(
            client, f_path
        ):  # If processing itself didn't error out
            # To know if aimerge *actually* changed something, we'd need process_file_conflicts
            # to communicate that. For now, we assume if it runs without error, it "processed".
            # We will rely on the print statements from within process_file_conflicts.
            pass  # Handled by prints inside process_file_conflicts
        else:
            overall_success = False  # Mark if any file processing had an internal error

    # This final message needs to be smarter based on whether actual changes were written.
    # The current logic in process_file_conflicts handles prints about modification.
    if overall_success and conflicted_f_paths:
        print("\nINFO: AIMerge conflict processing round complete.")
        print(
            "Please review any changed files, then `git add .` and `git merge --continue` (or equivalent)."
        )
    elif not overall_success:
        print("\nWARNING: Some files encountered errors during processing.")

    return 0 if overall_success else 1


# Ensure all helper functions (load_api_key, save_api_key, get_openai_client,
# find_git_repo_root, find_conflicted_files, parse_conflict_hunks, get_ai_resolution)
# are defined above main or imported. For brevity, I'm assuming they are present
# and using the versions from our previous discussions.
# You'll need to copy them into this script if they aren't already.
if __name__ == "__main__":
    # (Copy paste all your helper functions here if not already in the file)
    # Example placeholder for one:
    def load_api_key():
        # ... your implementation ...
        api_key = os.getenv("OPENAI_API_KEY")  # Simplified for example
        if not api_key and os.path.exists(API_KEY_FILE):
            with open(API_KEY_FILE, "r") as f:
                api_key = f.read().strip()
        return api_key

    def save_api_key(key):  # Placeholder
        print(f"DEBUG: save_api_key({key}) called")
        try:
            os.makedirs(CONFIG_DIR, exist_ok=True)
            with open(API_KEY_FILE, "w") as f:
                f.write(key)
            os.chmod(API_KEY_FILE, 0o600)
            return True
        except:
            return False

    def get_openai_client(key):  # Placeholder
        print(f"DEBUG: get_openai_client({key}) called")
        if not key:
            return None
        try:
            client = OpenAI(api_key=key)
            client.models.list()
            return client
        except:
            return None

    def find_git_repo_root():  # Placeholder
        try:
            return subprocess.run(
                ["git", "rev-parse", "--show-toplevel"],
                capture_output=True,
                text=True,
                check=True,
            ).stdout.strip()
        except:
            return None

    def find_conflicted_files(root):  # Placeholder
        try:
            res = subprocess.run(
                ["git", "diff", "--name-only", "--diff-filter=U"],
                cwd=root,
                capture_output=True,
                text=True,
                check=True,
            ).stdout.strip()
            return [os.path.join(root, f) for f in res.split("\n") if f]
        except:
            return []

    def parse_conflict_hunks(content):  # Placeholder - Use your actual good parser
        print(f"DEBUG: parse_conflict_hunks called with content length {len(content)}")
        # This is a VERY DUMMY parser for the example to run. Replace with your actual regex parser.
        if "<<<<<<< HEAD" in content:
            parts = content.split("=======")
            if len(parts) == 2:
                ours_part, theirs_part_full = parts[0], parts[1]
                ours = (
                    ours_part.split("<<<<<<< HEAD\n", 1)[1]
                    if "<<<<<<< HEAD\n" in ours_part
                    else ours_part
                )
                theirs_match = re.search(
                    r"(.*?)\n>>>>>>> .*?\n", theirs_part_full, re.DOTALL
                )
                theirs = theirs_match.group(1) if theirs_match else theirs_part_full
                original_block = content  # For this dummy, the whole file is one block
                return [
                    {
                        "type": "conflict",
                        "ours": ours,
                        "theirs": theirs,
                        "original_block": original_block,
                    }
                ]
        return [{"type": "content", "content": content}]  # No conflict or parse failed

    def get_ai_resolution(client, ours, theirs, base=None, filename=""):  # Placeholder
        print(f"DEBUG: get_ai_resolution for {filename} called")
        if client:  # Simulate AI or actual call (ensure quota is fixed)
            # return f"AI RESOLVED:\n{ours}\nAND\n{theirs}", "AI explanation"
            return None, "AI failed"  # Simulate AI failure
        return None, None

    exit_code = main()
    exit(exit_code)
