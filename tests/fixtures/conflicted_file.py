# Sample file with merge conflict
CONFLICT_CONTENT = '''
def main():
    print("Hello World")
<<<<<<< HEAD
    print("Feature A added")
=======
    print("Feature B added")
>>>>>>> feature-branch
    return 0
'''

# Expected resolved content
RESOLVED_CONTENT = '''
def main():
    print("Hello World")
    print("Feature A added")
    print("Feature B added")
    return 0
'''