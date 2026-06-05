// Shared calendar provenance. Both engines derive their calendar from the
// tyme4ts / lunar-typescript family; this version is stamped on
// NatalCanonicalization.ephemeris_version and each MethodProfile.ephemeris_version.
// Bump when the calendar library changes the ephemeris; dependent caches and
// persisted readings are then flagged stale (ephemeris_missing).
export const CALENDAR_EPHEMERIS_VERSION = 'tyme4ts-1.5.0' as const;
