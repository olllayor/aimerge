# Release Instructions for AIMerge

## Publishing to PyPI

### Prerequisites
1. Create accounts on:
   - [PyPI](https://pypi.org/account/register/)
   - [TestPyPI](https://test.pypi.org/account/register/) (optional, for testing)

2. Generate API tokens:
   - Go to PyPI Account Settings → API tokens
   - Create a new token with scope "Entire account" 
   - Save the token securely (it starts with `pypi-`)

### Publishing Steps

1. **Test the package build:**
   ```bash
   cd /Users/macbookuz/Desktop/Projects/aimerge
   uv run python -m build
   uv run twine check dist/*
   ```

2. **Upload to TestPyPI (optional but recommended):**
   ```bash
   uv run twine upload --repository testpypi dist/*
   # Enter your TestPyPI API token when prompted
   ```

3. **Test installation from TestPyPI:**
   ```bash
   pip install --index-url https://test.pypi.org/simple/ --extra-index-url https://pypi.org/simple/ aimerge
   ```

4. **Upload to PyPI:**
   ```bash
   uv run twine upload dist/*
   # Enter your PyPI API token when prompted
   ```

5. **Verify installation:**
   ```bash
   pip install aimerge
   aimerge --help
   ```

### Alternative: Using GitHub Actions (Recommended)

Create `.github/workflows/publish.yml`:
```yaml
name: Publish to PyPI

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    - name: Install build dependencies
      run: |
        python -m pip install --upgrade pip
        pip install build twine
    - name: Build package
      run: python -m build
    - name: Publish to PyPI
      env:
        TWINE_USERNAME: __token__
        TWINE_PASSWORD: ${{ secrets.PYPI_API_TOKEN }}
      run: twine upload dist/*
```

Add your PyPI API token as a secret named `PYPI_API_TOKEN` in your repository settings.

## Creating a Release

1. **Update version in pyproject.toml** (if needed)
2. **Commit and push changes**
3. **Create a GitHub release:**
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
   Then create a release on GitHub using this tag.

## Package Status

✅ **Completed:**
- All bugs fixed and tests passing (19/19 tests)
- Package configuration optimized
- CLI tool working correctly
- GitHub repository up to date
- Documentation complete
- Build artifacts created and verified

✅ **Ready for Distribution:**
- PyPI-compatible package structure
- Proper entry points configured
- Dependencies correctly specified
- License and metadata included

## Installation Instructions for Users

Once published to PyPI, users can install with:
```bash
pip install aimerge
```

Or using uv:
```bash
uv add aimerge
```

## Usage Example

```bash
# Set up API key (one time)
aimerge --set-api-key your_gemini_api_key

# Use in a repository with merge conflicts
cd your_git_repo
aimerge  # Will automatically detect and resolve conflicts
```
