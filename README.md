# 🤖 AIMerge - AI-Powered Git Merge Conflict Resolver

![Python](https://img.shields.io/badge/python-3.9+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-beta-orange.svg)

AIMerge is an intelligent Git merge conflict resolver that uses Google Gemini AI to automatically suggest and resolve merge conflicts. Say goodbye to manually resolving complex merge conflicts!

## ✨ Features

- 🔍 **Automatic Conflict Detection** - Scans your Git repository for merge conflicts
- 🤖 **AI-Powered Resolution** - Uses Google Gemini to intelligently resolve conflicts
- 🎨 **Color-Coded Diffs** - Beautiful terminal output with syntax highlighting
- 💬 **Interactive Mode** - Review, edit, or accept AI suggestions
- ⚡ **Auto Mode** - Batch resolve multiple conflicts automatically
- 🔒 **Safe Backups** - Automatically backs up files before making changes
- 📊 **Progress Tracking** - Shows resolution statistics and progress

## 🚀 Installation

### Using pip (recommended):
```bash
pip install aimerge
```

### Using uv:
```bash
uv add aimerge
```

### From source:
```bash
git clone https://github.com/olllayor/aimerge.git
cd aimerge
pip install -e .
```

## 🔧 Setup

1. **Get a Google Gemini API Key:**
   - Visit [Google AI Studio](https://makersuite.google.com/)
   - Create a new API key
   - Keep it handy for the next step

2. **Configure AIMerge:**
   ```bash
   # Set your API key (one-time setup)
   aimerge --set-api-key YOUR_GEMINI_API_KEY
   
   # Or set as environment variable
   export GEMINI_API_KEY="your-api-key-here"
   ```

## 📖 Usage

### Basic Usage
Navigate to your Git repository with merge conflicts and run:

```bash
aimerge
```

### Interactive Mode (default)
```bash
aimerge
```
- Review each conflict individually
- Choose to accept, skip, or edit AI suggestions
- Get colored diffs showing the changes

### Auto Mode (batch processing)
```bash
aimerge --auto
```
- Automatically resolves all conflicts without prompts
- Great for trusted repositories or batch processing

### Help
```bash
aimerge --help
```

## 🎯 How It Works

1. **Detection**: AIMerge scans your Git repository for files with merge conflicts
2. **Analysis**: Each conflict is analyzed with surrounding context
3. **AI Resolution**: Google Gemini generates intelligent merge suggestions
4. **Review**: You can review, edit, or accept each suggestion
5. **Application**: Resolved conflicts are applied and staged in Git

## 📋 Example Workflow

```bash
# You have merge conflicts after a git merge
$ git merge feature-branch
Auto-merging src/utils.py
CONFLICT (content): Merge conflict in src/utils.py

# Run AIMerge to resolve conflicts
$ aimerge
INFO: AIMerge initialized with your Google Gemini API key.
INFO: Found 1 conflicted file: src/utils.py

╭─ Conflict 1/1 in src/utils.py ─╮
│ Current (HEAD):                 │
│ def calculate_sum(a, b):        │
│     return a + b                │
│                                 │
│ Incoming (feature-branch):      │
│ def calculate_sum(a, b, c=0):   │
│     return a + b + c            │
│                                 │
│ AI Suggestion:                  │
│ def calculate_sum(a, b, c=0):   │
│     """Calculate sum with optional third parameter."""  │
│     return a + b + c            │
╰─────────────────────────────────╯

Accept this resolution? [y/n/e/s]: y

✅ Resolved 1/1 conflicts
```

## 🛠️ Configuration

AIMerge supports several configuration options:

### Environment Variables
```bash
export GEMINI_API_KEY="your-api-key"     # Required: Your Gemini API key
export AIMERGE_MODEL="gemini-1.5-pro"    # Optional: Specific model version
```

### Command Line Options
```bash
aimerge --help                    # Show help
aimerge --set-api-key KEY         # Set API key
aimerge --auto                    # Auto-resolve all conflicts
aimerge --model gemini-1.5-flash  # Use specific model
```

## 🧪 Development

### Setting Up Development Environment
```bash
git clone https://github.com/olllayor/aimerge.git
cd aimerge

# Install with development dependencies
pip install -e ".[dev]"

# Or using uv
uv sync
```

### Running Tests
```bash
pytest
```

### Project Structure
```
aimerge/
├── src/
│   ├── cli.py                 # Main CLI interface
│   ├── conflict_detector.py   # Git conflict detection
│   ├── conflict_parser.py     # Conflict parsing logic
│   ├── gemini_resolver.py     # AI resolution logic
│   └── git_integration.py     # Git operations
├── tests/                     # Test suite
└── pyproject.toml            # Project configuration
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

- AIMerge is in beta. Always review AI suggestions before accepting them.
- Keep backups of important code before using auto-mode.
- AI suggestions may not always be perfect - use your judgment.

## 🙏 Acknowledgments

- Google Gemini AI for providing the intelligent conflict resolution
- The Git community for making version control awesome
- All contributors and users of this project

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/olllayor/aimerge/issues)
- **Discussions**: [GitHub Discussions](https://github.com/olllayor/aimerge/discussions)

---

Made with ❤️ for developers who hate merge conflicts