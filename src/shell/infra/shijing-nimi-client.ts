import type { NimiClient } from '@nimiplatform/sdk';

let shijingClient: NimiClient | null = null;

export function setShijingNimiClient(client: NimiClient | null): void {
  shijingClient = client;
}

export function hasShijingNimiClient(): boolean {
  return shijingClient !== null;
}

export function getShijingNimiClient(): NimiClient {
  if (!shijingClient) {
    throw new Error('ShiJing Nimi client is not initialized. Run bootstrap before using Runtime surfaces.');
  }
  return shijingClient;
}
