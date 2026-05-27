export type UserPresenceSnapshot = {
  isOnline: boolean;
  isLive: boolean;
};

type UserListener = () => void;

class PresenceStore {
  private onlineUsers = new Set<string>();
  private liveUsers = new Set<string>();
  private listeners = new Map<string, Set<UserListener>>();
  private snapshotCache = new Map<string, UserPresenceSnapshot>();

  subscribe(userId: string, listener: UserListener) {
    let set = this.listeners.get(userId);
    if (!set) {
      set = new Set();
      this.listeners.set(userId, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
      if (set && set.size === 0) {
        this.listeners.delete(userId);
      }
    };
  }

  getSnapshot(userId: string): UserPresenceSnapshot {
    const isOnline = this.onlineUsers.has(userId);
    const isLive = this.liveUsers.has(userId);
    const cached = this.snapshotCache.get(userId);
    if (
      cached &&
      cached.isOnline === isOnline &&
      cached.isLive === isLive
    ) {
      return cached;
    }
    const snapshot: UserPresenceSnapshot = { isOnline, isLive };
    this.snapshotCache.set(userId, snapshot);
    return snapshot;
  }

  private notify(userId: string) {
    this.listeners.get(userId)?.forEach((listener) => listener());
  }

  setUserOnline(userId: string, online: boolean) {
    const key = String(userId);
    const wasOnline = this.onlineUsers.has(key);
    if (online && !wasOnline) {
      this.onlineUsers.add(key);
      this.notify(key);
    } else if (!online && wasOnline) {
      this.onlineUsers.delete(key);
      this.notify(key);
    }
  }

  markUsersOnline(userIds: Iterable<string>) {
    for (const id of userIds) {
      this.setUserOnline(String(id), true);
    }
  }

  applyQueryResult(requestedIds: Iterable<string>, onlineUserIds: Iterable<string>) {
    const onlineSet = new Set(Array.from(onlineUserIds, String));
    for (const id of requestedIds) {
      const key = String(id);
      if (!key) continue;
      this.setUserOnline(key, onlineSet.has(key));
    }
  }

  applyOnlineSnapshot(userIds: string[]) {
    const next = new Set(userIds.map(String));
    const changed = new Set<string>();

    for (const id of this.onlineUsers) {
      if (!next.has(id)) changed.add(id);
    }
    for (const id of next) {
      if (!this.onlineUsers.has(id)) changed.add(id);
    }

    this.onlineUsers = next;
    changed.forEach((id) => this.notify(id));
  }

  setLiveUsers(userIds: Iterable<string>) {
    const next = new Set(Array.from(userIds, String));
    const changed = new Set<string>();

    for (const id of this.liveUsers) {
      if (!next.has(id)) changed.add(id);
    }
    for (const id of next) {
      if (!this.liveUsers.has(id)) changed.add(id);
    }

    this.liveUsers = next;
    changed.forEach((id) => this.notify(id));
  }
}

export const presenceStore = new PresenceStore();
