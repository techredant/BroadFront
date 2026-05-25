/**
 * Lightweight ref-based visibility notifier for the main feed.
 *
 * Why: tracking visible items in component state forces FlashList's
 * `renderItem`, `extraData`, and ancestor components to re-render on every
 * scroll. Instead, rows subscribe by id and only the previously-visible row +
 * newly-visible row receive a notification.
 *
 * This is intentionally a module-level singleton: there is only ever one main
 * feed at a time, and shared identity makes subscribers stable across renders.
 */

type Listener = (visible: boolean) => void;

const listeners = new Map<string, Set<Listener>>();
const visibleIds = new Set<string>();

function notify(id: string, visible: boolean) {
  const subs = listeners.get(id);
  if (!subs || subs.size === 0) return;
  for (const sub of subs) sub(visible);
}

export function subscribeToFeedVisibility(
  id: string,
  listener: Listener,
): () => void {
  let bucket = listeners.get(id);
  if (!bucket) {
    bucket = new Set();
    listeners.set(id, bucket);
  }
  bucket.add(listener);

  if (visibleIds.has(id)) listener(true);

  return () => {
    const subs = listeners.get(id);
    if (!subs) return;
    subs.delete(listener);
    if (subs.size === 0) listeners.delete(id);
  };
}

export function setVisibleFeedItems(nextIds: string[]) {
  const next = new Set(nextIds.filter(Boolean));

  for (const id of visibleIds) {
    if (!next.has(id)) {
      visibleIds.delete(id);
      notify(id, false);
    }
  }

  for (const id of next) {
    if (!visibleIds.has(id)) {
      visibleIds.add(id);
      notify(id, true);
    }
  }
}

export function isFeedItemVisible(id: string) {
  return visibleIds.has(id);
}
