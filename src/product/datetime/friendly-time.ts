// Small presentation helpers that bridge the stored UTC ISO timestamps and
// the friendlier inputs / labels shown to the user. Records keep storing an
// ISO UTC string (e.g. `2026-05-29T09:28:16Z`); these helpers let the UI show
// and edit that value in the user's local time without exposing raw ISO text.

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

// ISO UTC string -> value for an `<input type="datetime-local">` (local time,
// minute precision, no zone). Returns '' for an unparseable input.
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  );
}

// `<input type="datetime-local">` value (local time) -> ISO UTC string for
// storage. Returns '' when the field is empty or unparseable.
export function localInputToIso(local: string): string {
  if (!local) return '';
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// ISO UTC string -> friendly local-time label for read-only display, e.g.
// `2026年5月29日 17:28`. Falls back to the raw value if unparseable.
export function formatIsoForDisplay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  );
}
