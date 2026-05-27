import { useEffect, useRef } from "react";
import { useAudioPlayer, type AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";

const incomingSource = require("@/assets/notifications/inComing.wav");
const outgoingSource = require("@/assets/notifications/outgoing.wav");

function safeStop(player: AudioPlayer) {
  try {
    player.pause();
  } catch {
    /* native player may already be released */
  }
  void player.seekTo(0).catch(() => {});
}

export function useCallRingtone(enabled: boolean, isIncoming: boolean) {
  const incomingPlayer = useAudioPlayer(incomingSource);
  const outgoingPlayer = useAudioPlayer(outgoingSource);
  const player = isIncoming ? incomingPlayer : outgoingPlayer;
  const idlePlayer = isIncoming ? outgoingPlayer : incomingPlayer;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    safeStop(idlePlayer);

    if (!enabled) {
      safeStop(player);
      return;
    }

    player.loop = true;
    try {
      player.play();
    } catch (err) {
      if (enabledRef.current) {
        console.log("Failed to play ringtone:", err);
      }
    }

    let vibrationInterval: ReturnType<typeof setInterval> | undefined;

    if (isIncoming) {
      vibrationInterval = setInterval(() => {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
      }, 1500);
    }

    return () => {
      safeStop(player);
      if (vibrationInterval) {
        clearInterval(vibrationInterval);
      }
    };
  }, [enabled, isIncoming, player, idlePlayer]);

  return null;
}
