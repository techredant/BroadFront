/** In-memory market live session — survives stack navigation to product detail. */

export type MarketLiveSession = {
  callId: string;
  isHost: boolean;
  hostClerkId?: string;
  roomTitle?: string;
  level?: string;
  productId?: string;
  productTitle?: string;
  productPrice?: number;
  productImage?: string;
};

let activeSession: MarketLiveSession | null = null;

export function getActiveMarketLiveSession(): MarketLiveSession | null {
  return activeSession;
}

export function setActiveMarketLiveSession(
  session: MarketLiveSession | null,
): void {
  activeSession = session;
}

export function clearActiveMarketLiveSession(): void {
  activeSession = null;
}

export function shouldPreserveMarketLiveCall(callId: string): boolean {
  return activeSession?.callId === callId;
}
