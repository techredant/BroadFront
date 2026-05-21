import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useCall,
  useCallStateHooks,
  OwnCapability,
} from "@stream-io/video-react-native-sdk";
import { ToggleLiveButton } from "./ToggleLiveButton";
import { ToggleMicButton } from "./ToggleMicButton";
import { toggleCallScreenShare } from "@/utils/screenShareHelper";

type Props = { isHost?: boolean };

export default function AudioRoomControlsPanel({ isHost = false }: Props) {
  const call = useCall();
  const { useHasPermissions } = useCallStateHooks();
  const canModerate =
    isHost ||
    useHasPermissions(OwnCapability.MUTE_USERS) ||
    useHasPermissions(OwnCapability.UPDATE_CALL_PERMISSIONS);
  const hasSpeak = useHasPermissions(OwnCapability.SEND_AUDIO);
  const [mutingAll, setMutingAll] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [raisingHand, setRaisingHand] = useState(false);

  const muteAllOthers = () => {
    if (!call || !canModerate) return;

    Alert.alert(
      "Mute everyone",
      "Mute all other speakers in this room?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mute all",
          style: "destructive",
          onPress: async () => {
            setMutingAll(true);
            try {
              await call.muteOthers("audio");
            } catch (e) {
              console.error("Mute all error:", e);
              Alert.alert("Could not mute everyone", "Please try again.");
            } finally {
              setMutingAll(false);
            }
          },
        },
      ],
    );
  };

  const raiseHand = async () => {
    if (!call || hasSpeak) return;
    setRaisingHand(true);
    try {
      await call.requestPermissions({
        permissions: [OwnCapability.SEND_AUDIO],
      });
    } catch (e) {
      console.error("raise hand error:", e);
    } finally {
      setRaisingHand(false);
    }
  };

  const toggleScreenShare = async () => {
    if (!call || !canModerate) return;
    setSharing(true);
    try {
      await toggleCallScreenShare(call);
    } catch (e) {
      console.error("screen share error:", e);
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.container}>
      {canModerate && (
        <>
          <Pressable
            style={styles.secondaryBtn}
            onPress={toggleScreenShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="easel-outline" size={22} color="#fff" />
            )}
          </Pressable>
          <Pressable
            style={styles.muteAllBtn}
            onPress={muteAllOthers}
            disabled={mutingAll}
          >
            {mutingAll ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="volume-mute" size={22} color="#fff" />
            )}
          </Pressable>
        </>
      )}
      {!canModerate && !hasSpeak && (
        <Pressable
          style={styles.raiseHandBtn}
          onPress={raiseHand}
          disabled={raisingHand}
        >
          {raisingHand ? (
            <ActivityIndicator size="small" color="#7B2FF7" />
          ) : (
            <Ionicons name="hand-right" size={22} color="#7B2FF7" />
          )}
        </Pressable>
      )}
      <ToggleLiveButton />
      <ToggleMicButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingVertical: 8,
  },
  muteAllBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(239,68,68,0.85)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  secondaryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(37,244,238,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(37,244,238,0.45)",
  },
  raiseHandBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
