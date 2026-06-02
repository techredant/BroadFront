/** Must match backend `clerkIdToUid` in agoraToken.service.js */
export function clerkIdToUid(clerkId: string): number {
  let hash = 0;
  const str = String(clerkId || "0");
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 2147483646) + 1;
}

export function uidMatchesClerkId(uid: number, clerkId?: string | null): boolean {
  if (!clerkId) return false;
  return uid === clerkIdToUid(clerkId);
}
