# ShiJing Release Path

ShiJing (`0.1.10`) is an Electron Nimi App supervised by Nimi Desktop and uses the same release and admission path as every catalog App. Nimi ownership does not create a release or install shortcut.

```text
public repository
  -> protected annotated v<version> tag on canonical default branch
  -> .github/workflows/nimi-app-release.yml
  -> immutable GitHub Release
  -> publisher-fork registry PR
  -> reviewed registry main
  -> Runtime install
  -> Desktop supervised Electron launch
```

## Declared Targets

`.nimi/config/build-profile.yaml` declares two targets:

- `windows-x86_64`
- `macos-aarch64`

Linux and Intel macOS targets are not declared.

## Local Preparation

Keep `package.json` (currently `0.1.10`), `nimi.app.yaml`, `.nimi` identity/submission inputs, and any remaining `src-tauri/Cargo.toml` or `src-tauri/tauri.conf.json` version fields enforced by project checks on the exact same semantic version.

For local development candidate verification on Windows x86_64 (on an Apple Silicon Mac, replace `windows-x86_64` with `macos-aarch64`):

```bash
pnpm install --frozen-lockfile
pnpm exec nimi-app sync
pnpm exec nimi-app check
pnpm exec nimi-app test
pnpm exec nimi-app build --target windows-x86_64
pnpm exec nimi-app pack --target windows-x86_64
```

For formal production preparation on a machine matching the target platform:

```bash
pnpm exec nimi-app check --production
pnpm exec nimi-app build --target windows-x86_64 --production
pnpm exec nimi-app pack --target windows-x86_64 --production
```

Development `pack` output is a development candidate only and cannot be admitted as a production release target.

## GitHub Prerequisites and Workflow Behavior

- The repository is public.
- A repository ruleset protects `v*` tags against updates and deletion.
- GitHub immutable releases are enabled.
- `NIMI_REPOSITORY_ADMIN_TOKEN` is configured in repository Actions secrets with `Administration: read-only` permission so `.github/workflows/nimi-app-release.yml` can verify, without mutating, those repository settings.

Pull requests and `workflow_dispatch` runs only build and pack development candidates; they create no tag, GitHub Release, or registry change.

Production runs start only when an annotated `v*` tag matching `package.json` is pushed and its commit is on the canonical default branch. `.github/workflows/nimi-app-release.yml` runs per-target `check --production`, `build --production`, and `pack --production` for `windows-x86_64` and `macos-aarch64`, generates per-target GitHub attestations, aggregates the candidate metadata (`aggregate`), creates or safely resumes the draft Release without overwriting existing assets, and publishes and verifies the immutable GitHub Release.

## Signing Posture and Publishing

Native publisher posture allows `production-unsigned`, with a publisher ad-hoc seal on `macos-aarch64` rather than Apple Developer ID signing and notarization. `pack --production` checks and records the actual publisher signing posture instead of requiring a mandatory Windows PFX or Apple Developer ID certificate. Nimi does not counter-sign third-party code.

`@nimiplatform/app-tools` provides the shared `nimi-app publish` entry point for preflight checks, tagging, workflow observation, and registry PR preparation. Concrete release workflow runs, Registry review, and installed-runtime acceptance are verified separately and are not claimed as completed by this guide.
