# Releasing

All five packages (`@tts2go/core`, `@tts2go/react`, `@tts2go/vue`, `@tts2go/svelte`, `@tts2go/vanilla`) are versioned and released together. Publishing is fully automated via GitHub Actions when code is pushed to `main`.

## Before you merge

### 1. Create a changeset

From the repo root, run:

```sh
pnpm changeset
```

This interactive prompt will ask you:

- **Which packages changed?** — Select all affected packages. Because all packages are in a `fixed` group, they will all be bumped to the same version regardless of selection, but you should still list the ones that actually changed.
- **Bump type?** — `patch` (bug fix), `minor` (new feature), or `major` (breaking change).
- **Summary** — A short description of the change (this becomes the changelog entry).

This creates a markdown file in `.changeset/` (e.g. `.changeset/cool-feature.md`). **Commit this file with your PR.**

A changeset file looks like this:

```md
---
"@tts2go/core": minor
"@tts2go/react": minor
"@tts2go/vue": minor
"@tts2go/svelte": minor
"@tts2go/vanilla": minor
---

Description of what changed.
```

### 2. Verify your PR passes CI

The CI workflow runs on every PR to `main`. It builds all packages and runs the `@tts2go/core` test suite. Make sure it's green before merging.

### 3. Do NOT manually edit version numbers

You do **not** need to update `version` fields in any `package.json`. The release workflow handles this automatically using the changeset files.

## What happens on merge

When your PR is merged to `main`, the release workflow (`.github/workflows/release.yml`) runs automatically:

1. Installs dependencies and builds all packages
2. Runs `changeset version` — reads the `.changeset/*.md` files, bumps all `package.json` versions, and deletes the consumed changeset files
3. Publishes all packages to npm via `pnpm -r publish --no-git-checks`

If there are no pending changesets, the workflow is a no-op (nothing gets published).

## Quick reference

| What | Where |
|---|---|
| Add a changeset | `pnpm changeset` |
| Changeset config | `.changeset/config.json` |
| Release workflow | `.github/workflows/release.yml` |
| CI workflow | `.github/workflows/ci.yml` |
| NPM auth | `NPM_TOKEN` GitHub Actions secret |
| Package versions | Each `packages/*/package.json` (managed by changesets) |

## Troubleshooting

- **`E403` on publish** — The `NPM_TOKEN` secret is expired or lacks publish permissions. Generate a new granular access token on npmjs.com for the `tts2go` account and update the GitHub Actions secret.
- **Packages not publishing** — Ensure there is at least one `.changeset/*.md` file (other than `config.json`) committed. No changeset = no version bump = no publish.
- **Version mismatch between packages** — All packages are in a `fixed` group in `.changeset/config.json`, so they should always share the same version. If they drift, run `pnpm changeset version` locally to reconcile.
