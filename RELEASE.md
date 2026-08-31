# ShiJing release path

ShiJing uses the same third-party Nimi App path as every ordinary catalog App. Nimi ownership does not create a release or install shortcut.

```text
public repository
  -> protected v<version> tag
  -> tag-triggered nimi-app-release workflow
  -> immutable GitHub Release
  -> publisher-fork registry PR
  -> reviewed registry main
  -> Runtime install
  -> Desktop exact Host launch
```

## Local preparation

Keep `package.json`, `nimi.app.yaml`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` and `.nimi` identity/submission inputs on the same exact semantic version. Then run:

```bash
pnpm install
pnpm exec nimi-app sync
pnpm exec nimi-app check
pnpm exec nimi-app test
pnpm exec nimi-app build --target windows-x86_64
pnpm exec nimi-app pack --target windows-x86_64
```

Local pack output is explicitly development-unsigned and cannot be admitted as a production target.

## GitHub prerequisites

- The repository is public.
- A repository ruleset protects `v*` tags.
- GitHub immutable releases are enabled.
- `GITHUB_REPOSITORY_ADMIN_TOKEN` has repository Administration read permission so the workflow can verify, but not mutate, those settings.
- The tag-only `build --production` step applies the publisher PFX to the exact declared Windows Host; `pack --production` only re-verifies Authenticode and rejects unsigned bytes.

Manual workflow dispatch is dry-run only, including when a tag ref is selected, and creates no tag, Release or registry mutation. Production starts only from the protected version-tag push, and the workflow creates or safely resumes the exact draft, attaches the aggregate candidate plus every declared target `.nimiapp` without clobbering assets, then publishes and verifies the immutable Release.

The first pilot Release declares Windows only. macOS may be built ordinarily without a production claim; signed/notarized/stapled macOS enters only through a later version whose immutable descriptor declares that target. Team ID and Apple credentials affect only macOS native signing/notarization and its production pack/release acceptance.

`nimi-app publish` is the eventual preflight/tag/observation/registry-PR command. Until the shared installed Tauri/Kit carrier, GitHub orchestration and repository prerequisites are implemented and verified, production check/publish fail closed and no manual substitute is allowed.
