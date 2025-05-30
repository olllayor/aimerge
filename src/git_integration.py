import subprocess

def stage_resolution(file_path):
    """Stage resolved file in Git"""
    subprocess.run(
        ["git", "add", file_path],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )