# AIMerge - AI-Powered Git Conflict Resolution with Google Gemini

AIMerge is a command-line tool that assists developers in resolving Git merge conflicts using the power of Google Gemini. It analyzes conflicted sections of code and proposes a merged version, helping to streamline the conflict resolution process.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Python 3.x** (3.7 or higher recommended)
*   **Git** (version 2.x or higher recommended)
*   **pip** (Python package installer, usually comes with Python)

## Setup Instructions

1.  **Clone the Repository**:
    If you have Git, you can clone the repository:
    ```bash
    git clone <repository_url> # Replace <repository_url> with the actual URL
    cd aimerge
    ```
    (Alternatively, if distributed as source files, download and extract them.)

2.  **Install Dependencies**:
    Navigate to the project directory (e.g., `aimerge`) and install the required Python packages:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Set Up Your Google API Key**:
    AIMerge requires a Google API key to access the Gemini models. You can obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).

    You can set up your API key in one of two ways:

    *   **Environment Variable (Recommended)**:
        Set the `GOOGLE_API_KEY` environment variable in your shell:
        ```bash
        export GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY"
        ```
        (On Windows, you might use `set GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY` in Command Prompt or `$env:GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY"` in PowerShell.)
        This method is generally more secure and convenient for regular use.

    *   **Using the Script Argument**:
        You can set the API key directly when running the script. This will save the key to a local configuration file (`~/.aimerge/google_api_key.txt`) for future use.
        ```bash
        python aimerge.py --set-api-key YOUR_GOOGLE_API_KEY
        ```
        Replace `YOUR_GOOGLE_API_KEY` with your actual key. The script will confirm if the key was saved successfully.

## Usage Instructions

1.  **Navigate to Your Repository**:
    Open your terminal and change to the root directory of your Git repository that has active merge conflicts.

2.  **Run AIMerge**:
    Execute the script:
    ```bash
    python aimerge.py
    ```

3.  **Interactive Conflict Resolution**:
    *   The script will automatically detect conflicted files.
    *   For each conflict hunk, it will display:
        *   The `OURS (HEAD)` version of the code.
        *   The `THEIRS` version of the code.
        *   A `GEMINI AI PROPOSAL` for the merged code.
    *   You will be prompted to:
        ```
        Apply Gemini AI suggestion? (y)es / (n)o, keep original conflict:
        ```
        *   Enter `y` to accept the AI's suggestion for that hunk. The suggested code will replace the conflict block.
        *   Enter `n` to reject the AI's suggestion. The original Git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) for that hunk will be kept, and you'll need to resolve it manually later.

4.  **After Running the Script**:
    *   **Review Changes**: Open the modified files in your code editor. Carefully review the changes made by AIMerge, especially where AI suggestions were applied.
    *   **Manual Resolution (if needed)**: If you rejected any AI suggestions or if the AI couldn't resolve a conflict, you'll need to manually edit those files to fix the remaining conflicts.
    *   **Stage Changes**: Once you are satisfied with the resolutions, add the files to Git's staging area:
        ```bash
        git add .
        ```
        (Or `git add <specific_file>` for each resolved file).
    *   **Continue Merge**: Complete the merge process (e.g., if you were in the middle of a `git merge` or `git rebase`):
        ```bash
        git merge --continue
        ```
        Or `git rebase --continue`, etc., depending on the Git operation that caused the conflicts.

## Simplification Notes

AIMerge is designed to be a straightforward tool. It focuses on:
*   Leveraging Google Gemini to provide intelligent suggestions for merge conflicts.
*   Offering a simple, interactive command-line experience.
*   Allowing users to quickly accept AI proposals or skip them on a hunk-by-hunk basis.

The goal is to speed up the often tedious process of resolving merge conflicts, not to replace careful review by the developer. Always review AI-generated code.
