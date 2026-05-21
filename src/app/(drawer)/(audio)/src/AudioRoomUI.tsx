import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PermissionRequestsPanel } from "./PermissionsRequestsPanel";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AudioRoomDescription from "./AudioRoomDescription";
import AudioRoomParticipants from "./AudioRoomParticipants";
import AudioRoomControlsPanel from "./AudioRoomControlsPanel";
import AudioPresenterBanner from "./AudioPresenterBanner";
import AudioScreenShareBar from "./AudioScreenShareBar";
import { MediaColors, MediaGradients } from "@/constants/mediaTheme";

type Props = { goToHomeScreen: () => void; isHost?: boolean };

export const AudioRoomUI = ({ goToHomeScreen, isHost = false }: Props) => {
  const insets = useSafeAreaInsets();

  const leaveCall = () => {
    goToHomeScreen();
  };

  return (
    <LinearGradient
      colors={[...MediaGradients.audioRoom]}
      style={styles.root}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={leaveCall} style={styles.backBtn}>
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.topLabel}>Audio room</Text>
        <View style={{ width: 40 }} />
      </View>

      <AudioRoomDescription />
      <PermissionRequestsPanel />
      <AudioScreenShareBar />
      <AudioPresenterBanner />
      <AudioRoomParticipants isHost={isHost} />

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <AudioRoomControlsPanel isHost={isHost} />
        <Pressable style={styles.leaveBtn} onPress={leaveCall}>
          <Ionicons name="exit-outline" size={20} color="#fff" />
          <Text style={styles.leaveText}>Leave</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MediaColors.glass,
    alignItems: "center",
    justifyContent: "center",
  },
  topLabel: { color: MediaColors.textSecondary, fontSize: 12, fontWeight: "600" },
  bottomBar: {
    paddingHorizontal: 20,
    gap: 12,
  },
  leaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: MediaColors.glassBorder,
  },
  leaveText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
