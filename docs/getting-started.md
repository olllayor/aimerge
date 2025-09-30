# Getting Started with AIMerge

This guide walks you through installing AIMerge, connecting to OpenRouter, and resolving your first merge conflict.

## 1. Prerequisites

| Requirement | Minimum | Why it matters |
| --- | --- | --- |
| Node.js | 18.x | Required for the TypeScript CLI and native `fetch` support |
| Git | 2.x | AIMerge shells out to Git for conflict detection and staging |
| pnpm *(recommended)* | 8.x+ | Efficient dependency manager used in this repo |
| OpenRouter account | Free tier is enough | Supplies the AI models that power AIMerge |

## 2. Install AIMerge from source

```bash
# Clone the repository
git clone https://github.com/olllayor/aimerge.git
cd aimerge

# Install dependencies and build the CLI
pnpm install
pnpm build
```

> Prefer running from source without building? Use `pnpm dev` for live TypeScript execution via `tsx`.

## 3. Get an OpenRouter API key

1. Create or log into your account at [openrouter.ai/keys](https://openrouter.ai/keys).
2. Click **Create key** and copy the generated token.
3. Ensure a free model is enabled (e.g. `google/gemini-flash-1.5` or `mistralai/mistral-7b-instruct`).

## 4. Provide the API key to AIMerge

Choose one of the following options:

### Option A – Persist the key via the CLI

```bash
aimerge config set-key sk-or-v1-...
```

This stores the key in your OS-specific config directory (e.g. `~/.config/aimerge/config.json`).

### Option B – Export environment variables

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."      # required
export AIMERGE_MODEL="google/gemini-flash-1.5" # optional preferred model
```

Environment variables override stored values for the current shell session.

## 5. Trigger a merge conflict (optional sandbox)

```bash
# Create a sample repo
git init aimerge-demo
cd aimerge-demo

echo "console.log('main');" > app.js
git add app.js
git commit -m "Initial commit"

git checkout -b feature
cat <<'EOF' > app.js
console.log('feature');
EOF
git commit -am "Feature change"

git checkout main
cat <<'EOF' > app.js
console.log('main conflict');
EOF
git commit -am "Main change"

git merge feature  # expect a conflict in app.js
```

## 6. Resolve conflicts with AIMerge

```bash
# From the repo root with conflicts
aimerge
```

What you’ll see:

1. A banner confirming AIMerge is running.
2. A spinner indicating the AI is “thinking” while the model resolves each conflict.
3. A chat-style box with the proposed merged code. Use the prompt to accept (`y`), skip (`s`), edit (`e`), or decline (`n`).
4. A success summary once the file is resolved and staged.

## 7. Verify the results

```bash
git status
cat app.js
```

Review the merged file and commit when you’re satisfied:

```bash
git commit -m "Resolve conflicts with AIMerge"
```

## 8. Next steps

- Explore more CLI options in the [CLI Reference](cli-reference.md).
- Configure defaults and caches in [Configuration & Storage](configuration.md).
- Run AIMerge non-interactively using tips in [Advanced Usage](advanced-usage.md).

You’re ready to merge smarter and faster—enjoy AIMerge! 🎉
