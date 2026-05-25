// Wave-8 — Person.id factory. Generates a unique non-empty opaque id
// using the platform crypto.randomUUID() (browser + Node 24). No
// Math.random fallback; if the platform refuses to provide randomUUID
// the factory throws so a missing primitive never silently degrades
// id quality.

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

export function newPersonId(): string {
  return platformCrypto().randomUUID();
}
