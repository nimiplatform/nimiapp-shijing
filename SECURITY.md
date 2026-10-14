# Security

## Credential custody

- Do not store Realm credentials, Runtime access tokens, or refresh tokens in this repository or in app-local storage, and do not implement app-local login or OAuth flows.
- **Runtime** owns app registration, active session admission, operation access enforcement, and Nimi credential custody. **Desktop** provides exact Electron Host supervision, process lifecycle management, and user management entrypoints.

## Nimi client

- Use the local-app client constructed in `src/shell/local-development/shijing-local-app-runtime.ts` via the host-bound `createNimiClient` paired with `createNimiLocalAppStandardShellSurface`.
- Do not use legacy `tauri-ipc` transport, direct bare Runtime or Realm requests, or parallel client construction paths.

## Permission posture

- Treat `app_access` declarations in `nimi.app.yaml` as requested scope declarations, not self-granted operational authorization. Runtime enforces active session admission and operation access, Registry/Platform governs catalog review and approved release descriptors, and any separate Integration standing resource permissions remain independent.
- Fail closed when a required capability or contract surface is unavailable.
