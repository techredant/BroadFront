import { useNotifications } from "@/context/notification";
import type { NotificationSection } from "@/types/notifications";

/** Convenience hook for the activity inbox screen. */
export function useNotificationCenter(section?: NotificationSection) {
  const ctx = useNotifications();

  if (section) {
    return {
      ...ctx,
      notifications: ctx.notifications.filter(
        (n) => section === "all" || n.category === section,
      ),
    };
  }

  return ctx;
}
