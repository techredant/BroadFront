import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
  type SharedValue,
} from "react-native-reanimated";
import { useRouter } from "expo-router"; // ✅ FIXED
import { useLevel } from "@/context/LevelContext";

type LevelType =
  | "home"
  | "county"
  | "constituency"
  | "ward"
  | "ai"
  | "live"
  | "audio";

type ActionItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  offset: number;
};

function FloatingActionItem({
  action,
  progress,
  onPress,
}: {
  action: ActionItem;
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -progress.value * action.offset },
      { scale: progress.value },
    ],
    opacity: progress.value,
  }));

  return (
    <Animated.View style={[styles.actionContainer, animatedStyle]}>
      <Pressable style={styles.action} onPress={onPress}>
        {action.icon}
        <Text style={styles.actionText}>{action.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function FloatingLevelButton() {
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);
  const { userDetails, switchLevel } = useLevel();
  const router = useRouter(); // ✅ correct usage

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, { duration: 250 });
  }, [open]);

  const toggle = () => setOpen((prev) => !prev);

  const selectLevel = (type: LevelType) => {
    // ✅ close menu FIRST (no double toggle)
    setOpen(false);

    // 🔥 SPECIAL ROUTES
    if (type === "ai") {
      router.push("/(ai)"); // ✅ NO /index
      return;
    }

    if (type === "live") {
      setTimeout(() => {
        router.push("/(live)"); // ✅ NO /index
      }, 150);
      return;
    }

    if (type === "audio") {
      setTimeout(() => {
        router.push("/(audio)");
      }, 150);
      return;
    }

    // ✅ NORMAL STATE UPDATE
    const mapping: Record<LevelType, { type: string; value: string }> = {
      home: { type: "home", value: "home" },
      county: { type: "county", value: userDetails?.county ?? "county" },
      constituency: {
        type: "constituency",
        value: userDetails?.constituency ?? "constituency",
      },
      ward: { type: "ward", value: userDetails?.ward ?? "ward" },
      ai: { type: "ai", value: "ai" },
      live: { type: "live", value: "live" },
      audio: { type: "audioRoom", value: "audioRoom" },
    };

    switchLevel(mapping[type]);
  };

const isPersonal = userDetails?.accountType === "Personal Account";


const rawActions = [
  {
    key: "home",
    label: "Home",
    icon: <Ionicons name="home-outline" size={18} color="#fff" />,
    show: true,
  },

  {
    key: "county",
    label: "County",
    icon: <Feather name="map" size={18} color="#fff" />,
    show: isPersonal,
  },

  {
    key: "constituency",
    label: "Constituency",
    icon: <FontAwesome5 name="flag" size={16} color="#fff" />,
    show: isPersonal,
  },

  {
    key: "ward",
    label: "Ward",
    icon: <FontAwesome5 name="map-pin" size={16} color="#fff" />,
    show: isPersonal,
  },

  {
    key: "ai",
    label: "Chat AI",
    icon: <FontAwesome5 name="robot" size={16} color="#fff" />,
    show: true,
  },

  {
    key: "live",
    label: "Go Live",
    icon: <Ionicons name="radio-outline" size={16} color="#fff" />,
    show: true,
  },

  {
    key: "audio",
    label: "Join Audio",
    icon: <Ionicons name="mic-circle" size={22} color="#fff" />,
    show: true,
  },
];

const actions = rawActions
  .filter((action) => action.show)
  .map((action, index) => ({
    ...action,
    offset: index * 60,
  }));

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
    >
      {/* Overlay */}
      {open && <Pressable style={styles.overlay} onPress={toggle} />}

      {/* Actions */}
      {actions.map((action) => (
        <FloatingActionItem
          key={action.key}
          action={action}
          progress={progress}
          onPress={() => selectLevel(action.key as LevelType)}
        />
      ))}

      {/* FAB */}
      <Pressable style={styles.fab} onPress={toggle}>
        <Feather name="more-vertical" size={24} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 100,
    right: 10,
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    zIndex: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  actionContainer: {
    position: "absolute",
    bottom: 150,
    right: 20,
    zIndex: 15,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F2937",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 30,
    marginBottom: 10,
    elevation: 5,
  },
  actionText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "600",
    fontSize: 12,
  },
});
