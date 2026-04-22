import { useEffect, useState } from "react";
import axios from "axios";
import { registerForPushNotificationsAsync } from "@/utils/notification";

export function usePushNotifications(userId?: string) {
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (!userId || registered) return;

    const setup = async () => {
      try {
        const token = await registerForPushNotificationsAsync();

        if (token) {
          await axios.post("https://cast-api-zeta.vercel.app/api/users/token", {
            userId,
            token,
          });

          setRegistered(true);
        }
      } catch (err) {
        console.error("Push registration failed:", err);
      }
    };

    setup();
  }, [userId, registered]);

  return { registered };
}
