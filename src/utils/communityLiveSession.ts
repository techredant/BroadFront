/** In-memory community live session — host can re-enter their stream after backing out. */

export type CommunityLiveSession = {
  callId: string;
  isHost: boolean;
  roomTitle?: string;
  level?: string;
};

let activeSession: CommunityLiveSession | null = null;

export function getActiveCommunityLiveSession(): CommunityLiveSession | null {
  return activeSession;
}

export function setActiveCommunityLiveSession(
  session: CommunityLiveSession | null,
): void {
  activeSession = session;
}

export function clearActiveCommunityLiveSession(): void {
  activeSession = null;
}

export function isActiveCommunityHost(callId: string, userId?: string): boolean {
  return (
    Boolean(userId) &&
    activeSession?.callId === callId &&
    activeSession.isHost === true &&
    activeSession !== null
  );
}
