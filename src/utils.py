import os
import shutil
from datetime import datetime


def backup_file(file_path):
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    backup_path = f"{file_path}.aimerge_backup_{timestamp}"
    shutil.copy2(file_path, backup_path)
    return backup_path


def restore_backup(backup_path, original_path):
    """Restore file from backup"""
    if os.path.exists(backup_path):
        shutil.copy2(backup_path, original_path)
        os.remove(backup_path)
