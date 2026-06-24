# ShiJing Profile Presence Reveal Refactor Plan

## Goal

Gate passive viewing and editing of ShiJing self-profile sensitive fields behind
a short-lived Nimi presence verification result.

## Security Boundary

This change targets the casual-operation scenario: someone can operate the app
briefly on the user's machine and click into private profile data. It does not
claim protection against a local attacker who controls the computer, disk, or
runtime process.

The app must therefore:

- Render the archive profile locked by default.
- Avoid showing birth date, birth time, location/time-zone calibration, and
  derived meta text until presence verification succeeds.
- Use the same verification gate for "reveal full profile" and "edit".
- Keep the verified state short-lived and automatically relock on expiry.
- Fail closed when Nimi Runtime does not expose a formal presence-verification
  API. An existing logged-in Runtime session is not enough evidence.

## Implementation Slices

1. Profile masking contract:
   - Add a pure product helper that converts a `SelfProfileSummary` into a
     locked view without mutating the source summary.
   - Add copy for protected values and reveal/lock states.
   - Test that locked output does not contain fixture birth data.

2. Presence verification seam:
   - Add a product-level `PresenceVerificationClient` interface.
   - Inject it through `ShijingStoreProvider`.
   - Add a shell adapter that probes a future Runtime account method and
     returns `unavailable` when absent.

3. Final archive viewing gate:
   - Wire `SelfEditor` summary mode to the protected summary by default.
   - Add reveal/lock UI.
   - Make edit wait for the same verification gate before opening the drawer.
   - Relock and close the drawer when the verification TTL expires.

4. Verification:
   - `node --test test/self-profile-privacy.test.mjs test/profile-presence-verification.test.mjs test/settings-self.test.mjs`
   - `pnpm typecheck`
   - `pnpm test`
   - Whitespace scan over touched files.
