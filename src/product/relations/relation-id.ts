// SJG-DATA-04 — Relation.id factory. Uses platform crypto.randomUUID
// (browser + Node 24). No Math.random fallback; if the primitive is
// absent the factory throws so id quality never silently degrades.

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

export function newRelationId(): string {
  return platformCrypto().randomUUID();
}
