# 🤖 AIMerge · AI-Powered Merge Conflict Resolution for Git

> **New:** AIMerge now runs on Node.js + TypeScript and uses OpenRouter to tap into free, high-context AI models automatically.

AIMerge is your command-line co-pilot for merging hairy Git conflicts. It highlights conflicts in color, shows AI reasoning in a chat-style panel, and lets you accept, edit, or skip each suggestion with confidence.

## ✨ What you get

- 🔍 **Conflict discovery** – Detects all conflicted files in your repo in seconds.
- 🎨 **Readable diffs** – Rich, color-coded summaries of current vs. incoming changes.
- 🤖 **OpenRouter integration** – Automatically picks the best *free* model (highest context window) using the OpenRouter catalog.
- 💬 **AI “thinking” UI** – Animated terminal spinner and chat bubble output so you can watch the model work.
- 🖊️ **Interactive & auto modes** – Review every resolution or run fully hands-off.
- 🛟 **Safety rails** – Backups, easy restores, Git staging, and per-conflict editing in your favorite `$EDITOR`.
- 🧠 **Configurable defaults** – Persist API keys, preferred models, and cached model lists across runs.

## 🧰 Requirements

- **Node.js 18+** (for native `fetch` and ES modules)
- **Git** available on your `PATH`
- An **OpenRouter API key** (free-tier works great)

## 🚀 Installation

```bash
# Clone and install dependencies
git clone https://github.com/olllayor/aimerge.git
cd aimerge
pnpm install

# Optional: build distributable output
pnpm build
```

You can run the CLI directly with `pnpm`/`npx`:

```bash
pnpm aimerge
# or
pnpm dev   # hot reload via tsx
```

Once the package is published you’ll also be able to install it globally:

```bash
pnpm add -g aimerge
# or
npm install -g aimerge
```

## 🔑 Get an OpenRouter API key (free models)

1. Visit [openrouter.ai/keys](https://openrouter.ai/keys) and create a key.
2. Ensure at least one free-tier model is enabled (e.g. `google/gemini-flash-1.5`, `mistralai/mistral-7b-instruct`).
3. Copy the key and store it with AIMerge:

```bash
# Persist the key in ~/.config/aimerge/config.json (or OS equivalent)
aimerge config set-key sk-or-v1-...
```

> Prefer environment variables? Export `OPENROUTER_API_KEY` and AIMerge will pick it up automatically. Set `AIMERGE_MODEL` if you always want a specific model.

## 🧭 Usage

Resolve merge conflicts from the root of your Git repo:

```bash
aimerge
```

What happens next:

1. **Discovery** – AIMerge finds every file with conflict markers.
2. **Model selection** – We call the OpenRouter models endpoint, filter to free options, and pick the one with the largest context window. The chosen model is displayed in the header.
3. **Resolution loop** – For each conflict:
   - A spinner shows the AI is "thinking".
   - The proposed merge appears in a chat-style box.
   - Choose to `[y]es`, `[n]o`, `[e]dit`, or `[s]kip`.
4. **Commit-ready output** – Accepted resolutions replace the conflict markers, the file is staged, and a summary is printed.

### Useful flags

```bash
aimerge --auto                       # Accept every AI resolution without prompting
aimerge --no-interactive             # Quick batch mode (still prints summaries)
aimerge --model mistral/...          # Force a specific OpenRouter model
aimerge --no-auto-resolve-trivial    # Disable automatic trivial conflict resolution
aimerge --min-confidence 0.8         # Set minimum confidence threshold (0-1)
```

### Conflict Classification

AIMerge automatically classifies each conflict:

- **Trivial** (✨ auto-resolved by default): Whitespace-only, comment-only, import reordering
- **Semantic** (⚡): Variable value changes, simple code changes
- **Logic Collision** (⚠️ dangerous): Return value conflicts, control flow changes, function redefinitions

Logic collisions always require manual approval, regardless of confidence score.

### Confidence Scoring

Each AI resolution gets a confidence score (0-100%) based on:

- Conflict classification (trivial = higher confidence)
- Resolution length and structure
- Syntax validity
- Code preservation from both sides
- Absence of confusion markers (TODOs, conflict markers)

Resolutions with low confidence (<70%) automatically trigger interactive review.

### Configuration commands

```bash
aimerge config show           # Inspect stored + active configuration
aimerge config use-model <id> # Persist a preferred model override
aimerge config clear-cache    # Remove cached OpenRouter model listings
```

## 🎛️ How AIMerge chooses models

On every run we:

1. Load cached model metadata (12-hour TTL) if available.
2. Fetch the live catalog from OpenRouter (falls back to cache if offline).
3. Filter to models with `prompt` and `completion` pricing equal to zero.
4. Sort by `top_provider.context_length` and pick the top entry (or your preferred model if configured).
5. Display the model name, ID, and context window so you know exactly what’s being used.

## 🧪 Developing & testing

```bash
pnpm dev         # Run the CLI in watch mode
pnpm build       # Emit compiled JS into dist/
pnpm test        # Run Vitest unit tests
pnpm lint        # Type-check the project (tsc --noEmit)
```

Key directories:

```text
├── ts/src/              # TypeScript source (CLI, OpenRouter, Git helpers)
├── ts/tests/            # Vitest unit tests
├── dist/                # Compiled output after pnpm build
└── tests/fixtures/      # Sample merge conflict files reused by tests
```

## ⚙️ Environment variables

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Overrides the stored API key. |
| `AIMERGE_MODEL` | Force a specific model without using CLI flags. |
| `AIMERGE_CONFIG_DIR` | Custom config directory (useful for testing). |
| `AIMERGE_DISABLE_TYPING` | Set to `1` to disable chat typing animation. |

## ❓ Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Not a Git repository` | Run AIMerge inside a Git repo with active conflicts. |
| `OpenRouter request failed` | Confirm your API key is valid and rate limits aren’t exceeded. Try `aimerge config clear-cache` to refresh model metadata. |
| Empty AI response | Skip the conflict or re-run; some free models occasionally decline responses. |
| Editor not opening with `[e]` | Ensure `$EDITOR` or `$VISUAL` is set (e.g. `export EDITOR="code -w"`). |

## 🛡️ Safety notes

- AIMerge writes a timestamped backup before touching each file and restores automatically on errors.
- Changes are staged but never committed—review with `git diff --cached` before finishing.
- Free models are great for most codebases, but you can opt into paid models for larger contexts or better accuracy.

## 🤝 Contributing

We welcome pull requests! A good checklist:

1. Fork the repo and create a feature branch.
2. `pnpm install && pnpm lint && pnpm test` before opening the PR.
3. Include CLI screenshots or recordings when you tweak the UI.

## 📄 License

MIT © [olllayor](https://github.com/olllayor)
