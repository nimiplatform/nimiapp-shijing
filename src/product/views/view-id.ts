// Wave-9 — View.id factory using crypto.randomUUID (browser+Node 24).
// Throws if the platform primitive is missing; no Math.random fallback.

interface CryptoLike {
  randomUUID(): string;
}

function platformCrypto(): CryptoLike {
  const c = (globalThis as { crypto?: CryptoLike }).crypto;
  if (!c || typeof c.randomUUID !== 'function') {
    throw new Error('crypto.randomUUID is not available in this environment');
  }
  return c;
}

export function newViewId(): string {
  return platformCrypto().randomUUID();
}
