import { useEffect } from "react";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";

const incomingSource = require("@/assets/notifications/inComing.wav");
const outgoingSource = require("@/assets/notifications/outgoing.wav");

export function useCallRingtone(
  enabled: boolean,
  isIncoming: boolean
) {
  const player = useAudioPlayer(
    isIncoming ? incomingSource : outgoingSource
  );

  useEffect(() => {
    // 🔥 stop ringtone safely
    if (!enabled) {
      try {
        player.pause();
      } catch {}

      try {
        player.seekTo(0);
      } catch {}

      return;
    }

    // 🔥 enable loop
    player.loop = true;

    // 🔥 play ringtone
    try {
      player.play();
    } catch (err) {
      console.log("Failed to play ringtone:", err);
    }

    // 🔥 vibration only for incoming calls
    let vibrationInterval: NodeJS.Timeout | undefined;

    if (isIncoming) {
      vibrationInterval = setInterval(() => {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
      }, 1500);
    }

    return () => {
      // 🔥 cleanup safely
      try {
        player.pause();
      } catch {}

      try {
        player.seekTo(0);
      } catch {}

      if (vibrationInterval) {
        clearInterval(vibrationInterval);
      }
    };
  }, [enabled, isIncoming]);

  return null;
}