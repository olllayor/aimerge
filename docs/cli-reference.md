# CLI Reference

This reference covers every command, flag, and prompt AIMerge exposes.

## Command overview

| Command | Description |
| --- | --- |
| `aimerge` | Resolve merge conflicts in the current Git repository |
| `aimerge --auto` | Accept all AI resolutions without prompting |
| `aimerge --no-interactive` | Show summaries but skip user prompts (implied by `--auto`) |
| `aimerge --model <model>` | Prefer a specific OpenRouter model for this run |
| `aimerge config set-key <apiKey>` | Persist an OpenRouter API key to disk |
| `aimerge config use-model <modelId>` | Remember a preferred model for future runs |
| `aimerge config show` | Display stored configuration + active overrides |
| `aimerge config clear-cache` | Delete the cached OpenRouter model list |

> All config subcommands support OS-specific config locations described in [Configuration & Storage](configuration.md).

## Global options

| Flag | Type | Default | Purpose |
| --- | --- | --- | --- |
| `--auto` | boolean | `false` | Accept AI resolutions without user confirmation. Still prints summaries. |
| `--interactive` | boolean | `true` | Toggle interactive review. Combine with `--auto` to suppress prompts. |
| `--model <id>` | string | stored preference or best free model | Force a specific OpenRouter model ID or alias for this execution. |
| `--help` | | | Show usage information. |

## Interactive prompts

During interactive runs each conflict presents:

```text
Accept? [y]es, [n]o, [e]dit, [s]kip (y)
```

| Choice | Result |
| --- | --- |
| `y` / Enter | Apply the AI proposal and continue. |
| `n` | Leave conflict markers untouched (counts as skipped). |
| `s` | Same as `n`, useful for clarity. |
| `e` | Opens the proposal in `$EDITOR`/`$VISUAL`, applies your edits on save. |

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success; conflicts resolved or none found. |
| `1` | An error occurred (e.g., API key missing, Git repo not detected). |

## Logging and output conventions

- **Spinner + chat bubble**: AI activity. Disable the typing animation with `AIMERGE_DISABLE_TYPING=1`.
- **Green checkmark**: File successfully resolved and staged.
- **Yellow highlights**: Conflicts skipped or needing attention.
- **Red errors**: Fatal issues; details follow immediately after the emoji.

## Combining flags

- `aimerge --auto --model mistralai/mistral-7b-instruct`
  - Forces a model and accepts every suggestion automatically.
- `AIMERGE_MODEL=google/gemini-flash-1.5 aimerge --auto`
  - Environment variable sets the model; flag still optional.
- `aimerge --interactive=false`
  - Non-interactive summaries only (useful for scripting).

## Environment variables affecting the CLI

| Variable | Effect |
| --- | --- |
| `OPENROUTER_API_KEY` | Overrides the stored API key when set. |
| `AIMERGE_MODEL` | Sets a default model ID unless `--model` is provided. |
| `AIMERGE_CONFIG_DIR` | Redirects config storage (great for tests/CI). |
| `AIMERGE_DISABLE_TYPING` | Any truthy value disables the typing animation. |
| `EDITOR` / `VISUAL` | Editor invoked when choosing the `e` option during review. |

## Sample sessions

### Example: Interactive session with edits

```bash

🔍 Found 2 conflicted file(s):
  • src/utils.ts
  • tests/utils.test.ts

📄 Processing src/utils.ts (1 conflicts)
🤖 Resolving conflict 1/1 with google/gemini-flash-1.5
┌─ 🤖 AIMerge ─────────────────────────────┐
│ function sum(a: number, b: number) {     │
│   return a + b;                          │
│ }                                        │
└──────────────────────────────────────────┘
Accept? [y]es, [n]o, [e]dit, [s]kip (y)
```

### Example: Batch mode via CI

```bash
OPENROUTER_API_KEY="$SECRET" \
AIMERGE_MODEL=mistralai/mistral-7b-instruct \
aimerge --auto --interactive=false
```

Integrate this command into a pre-commit hook or CI pipeline to attempt auto-resolution, letting developers review staged results afterwards.
Refer back to this page whenever you need a refresher on what the CLI can do.
