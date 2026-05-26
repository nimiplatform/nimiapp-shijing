const CROCKFORD32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTime(timeMs: number): string {
  let value = Math.floor(timeMs);
  let out = '';
  for (let i = 0; i < 10; i += 1) {
    out = CROCKFORD32[value % 32]! + out;
    value = Math.floor(value / 32);
  }
  return out;
}

function encodeRandom(bytes: Uint8Array): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5 && out.length < 16) {
      bits -= 5;
      out += CROCKFORD32[(buffer >> bits) & 31]!;
    }
  }
  if (out.length < 16 && bits > 0) {
    out += CROCKFORD32[(buffer << (5 - bits)) & 31]!;
  }
  return out.padEnd(16, '0');
}

export function newContextItemId(now: Date = new Date()): string {
  const cryptoLike = globalThis.crypto;
  if (!cryptoLike || typeof cryptoLike.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues is not available in this environment');
  }
  const random = new Uint8Array(10);
  cryptoLike.getRandomValues(random);
  return `${encodeTime(now.getTime())}${encodeRandom(random)}`;
}
