// SJG-DATA-08 — Conversation.id + ConversationTurn.id factory. Uses
// platform crypto.randomUUID (browser + Node 24). No Math.random
// fallback; if the primitive is absent the factory throws so id
// quality never silently degrades.

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

export function newConversationId(): string {
  return platformCrypto().randomUUID();
}

export function newConversationTurnId(): string {
  return platformCrypto().randomUUID();
}
