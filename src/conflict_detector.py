import subprocess

def find_conflicts():
    """Detect files with merge conflicts using Git"""
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "--diff-filter=U"],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.splitlines()
    except subprocess.CalledProcessError as e:
        if "not a git repository" in e.stderr.lower():
            raise Exception("Not a Git repository")
        return []