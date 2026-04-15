import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PermissionRequestsPanel } from "./PermissionsRequestsPanel";
import { useCall } from "@stream-io/video-react-native-sdk";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import AudioRoomDescription from "./AudioRoomDescription";
import AudioRoomParticipants from "./AudioRoomParticipants";
import AudioRoomControlsPanel from "./AudioRoomControlsPanel";
import { useTheme } from "@/context/ThemeContext";

type Props = { goToHomeScreen: () => void };

export const AudioRoomUI = ({ goToHomeScreen }: Props) => {
  const { theme } = useTheme();
  const call = useCall();

  const leaveCall = async () => {
    try {
      if (call?.state.callingState === "joined") {
        await call.leave();
      }
    } catch (e) {
      console.error("Leave error:", e);
    }

    goToHomeScreen();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AudioRoomDescription />
      <AudioRoomParticipants />
      <PermissionRequestsPanel />
      <AudioRoomControlsPanel />

      <Animated.View entering={FadeInDown.delay(700)}>
        <Pressable
          style={[styles.joinButton, { backgroundColor: theme.primary }]}
          onPress={leaveCall}
        >
          <Ionicons name="exit-outline" size={22} color={theme.background} />
          <Text style={[styles.joinText, { color: theme.background }]}>
            {" "}
            Leave Quietly
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    paddingBottom: 20,
  },
  joinText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "blue",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 6,
  },
  leaveText: {
    color: "black",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
