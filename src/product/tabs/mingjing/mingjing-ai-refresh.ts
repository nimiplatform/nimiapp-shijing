// MingJing AI-ready refresh decision.
//
// When the app-level AIConfig readiness edge fires (observed not-ready ->
// ready, i.e. the user finished AI setup and came back), MingJing refreshes
// its AI reading instead of leaving empty, failed, or stale content on
// screen. The edge only fires on a genuine transition observed while the tab
// is mounted, and a reading that is already fresh is never regenerated just
// because readiness flipped — generation stays fail-close through
// `generateReadingForStorage` either way.

export function shouldRefreshMingJingReadingForAiReady(input: {
  readonly previous: boolean | null;
  readonly current: boolean | null;
  readonly loading: boolean;
  readonly projectionReady: boolean;
  readonly persistenceReady: boolean;
  readonly hasReading: boolean;
  readonly stale: boolean;
  readonly hasFailure: boolean;
}): boolean {
  // Only the observed not-ready -> ready edge qualifies. null (unknown) on
  // either side means no reliable transition was seen.
  if (input.previous !== false || input.current !== true) return false;
  if (input.loading || !input.projectionReady || !input.persistenceReady) return false;
  return !input.hasReading || input.stale || input.hasFailure;
}
