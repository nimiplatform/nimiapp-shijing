# Release Process

ShiJing (时镜) ships as a Tauri 2 desktop app for macOS, Windows, and Linux.

This document describes the manual / GitHub-Actions release flow for the
standalone single-app layout.

## Triggers

There are two ways to start a release:

1. **Tag push** — push an annotated tag matching `v[0-9]+.[0-9]+.[0-9]+` (or
   pre-release `vX.Y.Z-rc.N`) to `main`. The workflow runs with `publish=true`
   and produces a published GitHub Release.
2. **Manual dispatch** — run `release.yml` from the Actions UI with:
   - `version`: the semver string (with or without leading `v`)
   - `publish`: `false` → dry-run, artifacts go to workflow run outputs only.
     `true` → publish a real GitHub Release at tag `vX.Y.Z`.

The default for manual dispatch is `publish=false`.

## Versioning

Semantic Versioning ([semver.org](https://semver.org/)).

- **MAJOR** — Incompatible schema/migration, breaking a persisted
  `ShiJingSpace` snapshot on disk, or removing a publicly admitted SJG-*
  contract.
- **MINOR** — New feature, new admitted contract (new SJG-* ID, new
  ReadingKind/Scope, new tab), new spec table entries.
- **PATCH** — Bug fix, dependency bump, internal refactor with no contract
  change.

Pre-releases use `vX.Y.Z-rc.N` / `vX.Y.Z-beta.N`.

The version string lives in three places that **must stay in lockstep**:

| File | Field |
|------|-------|
| `package.json` | `"version"` |
| `src-tauri/tauri.conf.json` | `"version"` |
| `src-tauri/Cargo.toml` | `[package].version` |

## Pre-flight Checklist

1. **Lockstep version bump**

   ```bash
   NEW_VERSION=0.2.0
   npm version --no-git-tag-version "$NEW_VERSION"
   sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json
   sed -i '' "s/^version = \".*\"/version = \"$NEW_VERSION\"/" src-tauri/Cargo.toml
   ```

2. **Update CHANGELOG.md** — promote `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD`,
   open a fresh `[Unreleased]` above it.

3. **Run the full local verification**:

   ```bash
   pnpm install
   pnpm nimicoding:doctor
   pnpm typecheck
   pnpm test
   pnpm lint
   pnpm run build
   (cd src-tauri && cargo check)
   ```

4. **Commit, tag, push**:

   ```bash
   git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml CHANGELOG.md
   git commit -m "release: v$NEW_VERSION"
   git tag -a "v$NEW_VERSION" -m "ShiJing v$NEW_VERSION"
   git push origin main
   git push origin "v$NEW_VERSION"
   ```

5. **Monitor the release workflow** — once all three platform builds succeed,
   the GitHub Release is published automatically.

## Governance projection sync

If `@nimiplatform/nimi-coding` ships a new minor/major version, bump it in
`package.json` and rerun:

```bash
pnpm install
pnpm exec nimicoding sync --apply
pnpm nimicoding:doctor
```

Commit the updated `.nimi/{config,contracts,methodology}/**` files alongside
the `package.json` bump in the same release.

## Hotfix

For a hotfix off a published release:

```bash
git checkout -b hotfix/vX.Y.(Z+1) vX.Y.Z
# apply fix, run pre-flight checklist
git tag -a "vX.Y.$((Z+1))" -m "ShiJing vX.Y.$((Z+1)) hotfix"
git push origin "hotfix/vX.Y.$((Z+1))" "vX.Y.$((Z+1))"
```

Open a PR from `hotfix/*` into `main` so the fix lands on the main line.
