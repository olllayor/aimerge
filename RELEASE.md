# Release Instructions for AIMerge (npm distribution)

This project now ships as a Node.js package published to npm. Follow this checklist whenever you cut a new release, whether it’s a bugfix or a feature update.

## Prerequisites

- Maintainer access to the npm package (`aimerge`).
- `pnpm` installed and configured (`pnpm setup` run once so the global bin directory exists).
- Clean working tree on the branch you intend to release from (prefer `main`).

## 1. Prepare the codebase

1. Review outstanding changes with `git status` and ensure only release-ready commits remain.
2. Update documentation/CHANGELOG if necessary.
3. Run the quality gates:

   ```bash
   pnpm lint
   pnpm test
   pnpm build
   ```

## 2. Bump the version

Use semantic versioning:

- Bugfix: `pnpm version patch`
- Backwards-compatible feature: `pnpm version minor`
- Breaking change: `pnpm version major`

`pnpm version` updates `package.json`, creates a git tag, and writes to the lockfile automatically. Commit the version bump (pnpm creates the commit for you; amend as needed for release notes).

## 3. Dry-run the package

Optionally inspect the tarball that will be published:

```bash
pnpm build
pnpm pack
tar -tzf aimerge-<version>.tgz   # verify contents
rm aimerge-<version>.tgz
```

## 4. Authenticate once per machine

```bash
pnpm login
```

If the project enforces 2FA, have your one-time password ready. Authentication persists, so you only need to repeat this when tokens expire.

## 5. Publish

```bash
pnpm publish --access public
```

If your `publish-branch` config differs from the current branch, pnpm will prompt; confirm only when releasing intentionally from a feature branch.

## 6. Push commits and tags

```bash
git push origin HEAD
git push origin --tags
```

Create a GitHub Release using the new tag and include highlights plus upgrade notes.

## 7. Smoke-test the published package

In a clean environment (e.g., a new terminal or `npx` call), verify installation:

```bash
pnpm add aimerge@latest
pnpm exec aimerge --help
```

## Releasing a quick bugfix

1. Implement and test the fix.
2. `pnpm version patch`
3. `pnpm publish --access public`
4. Push commits/tags and update release notes.

That’s it—every release follows the same flow, with the version bump conveying the scope of change.
