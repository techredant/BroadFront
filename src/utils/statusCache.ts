import { sortStatusesForViewer } from "@/utils/statusUser";

const cache = new Map<string, any[]>();

export function seedStatusCache(userId: string, statuses: any[]) {
  if (!userId || statuses.length === 0) return;
  cache.set(userId, sortStatusesForViewer(statuses));
}

export function readStatusCache(userId: string): any[] | undefined {
  const hit = cache.get(userId);
  return hit?.length ? hit : undefined;
}

export function writeStatusCache(userId: string, statuses: any[]) {
  seedStatusCache(userId, statuses);
}
