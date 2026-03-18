# Releasing

All five packages (`@tts2go/core`, `@tts2go/react`, `@tts2go/vue`, `@tts2go/svelte`, `@tts2go/vanilla`) are versioned and released together. Versioning is done locally; CI only builds and publishes to npm.

## Before you push

### 1. Create a changeset

From the repo root, run:

```sh
pnpm changeset
```

This interactive prompt will ask you:

- **Which packages changed?** — Select all affected packages. Because all packages are in a `fixed` group, they will all be bumped to the same version regardless of selection, but you should still list the ones that actually changed.
- **Bump type?** — `patch` (bug fix), `minor` (new feature), or `major` (breaking change).
- **Summary** — A short description of the change (this becomes the changelog entry).

This creates a markdown file in `.changeset/` (e.g. `.changeset/cool-feature.md`).

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

### 2. Apply the version bump

```sh
pnpm changeset version
```

This reads the `.changeset/*.md` files, bumps all `package.json` versions, updates changelogs, and deletes the consumed changeset files.

### 3. Commit and push

Commit the version bumps (updated `package.json` files, changelogs, and deleted changeset files) and push to `main`.

## What happens on push

When you push to `main`, the release workflow (`.github/workflows/release.yml`) runs automatically:

1. Installs dependencies and builds all packages
2. Publishes all packages to npm via `pnpm -r publish --no-git-checks`

If the version on npm already matches the version in `package.json`, publish is a no-op for that package.

## Quick reference

| What | Where |
|---|---|
| Add a changeset | `pnpm changeset` |
| Apply version bump | `pnpm changeset version` |
| Changeset config | `.changeset/config.json` |
| Release workflow | `.github/workflows/release.yml` |
| CI workflow | `.github/workflows/ci.yml` |
| NPM auth | `NPM_TOKEN` GitHub Actions secret |
| Package versions | Each `packages/*/package.json` (managed locally via changesets) |

## Troubleshooting

- **`E403` on publish** — The `NPM_TOKEN` secret is expired or lacks publish permissions. Generate a new granular access token on npmjs.com for the `tts2go` account and update the GitHub Actions secret.
- **Packages not publishing** — Make sure you ran `pnpm changeset version` locally and committed the resulting version bumps before pushing. CI does not run `changeset version`.
- **Version mismatch between packages** — All packages are in a `fixed` group in `.changeset/config.json`, so they should always share the same version. If they drift, run `pnpm changeset version` locally to reconcile.
