// SJG-DATA-10 — Conversation.id + ConversationTurn.id factory.
//
// W-c01: replaced the wave-04 `crypto.randomUUID()` strategy with the
// admitted Crockford-base32 ULID strategy. ULID delivers monotonic,
// lexicographically-sortable ids without depending on a host-provided
// UUID factory, which keeps the renderer working in environments that
// lack `crypto.randomUUID` while still avoiding `Date.now()+Math.random()`
// collision risk.

import { newConversationId, newConversationTurnId } from '../ids/index.ts';

export { newConversationId, newConversationTurnId };
