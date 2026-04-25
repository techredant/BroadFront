import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ReactNode, useEffect, useRef } from "react";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useTheme } from "@/context/ThemeContext";
import Video from "react-native-video";

interface StatusItemProps {
  currentUserId?: string; // 👈 IMPORTANT for viewed logic
  userStatus: {
    userId: string;
    caption: string;
    backgroundColor: string;
    statuses: {
      backgroundColor: string;
      caption: ReactNode;
      media: any;
      id: string;
      viewed: boolean;
      views?: string[]; // 👈 add this (backend array of userIds)
      createdAt?: string;
    }[];
  };
  onOpen?: (userId: string) => void;
}

/* =========================
   STORY RING
========================= */
function StoryRing({
  size = 68,
  strokeWidth = 3,
  statuses = [],
  currentUserId,
}: any) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const total = statuses.length;

  const segment = circumference / Math.max(total, 1);
  const gap = 2;

  return (
    <Svg width={size} height={size} style={{ position: "absolute" }}>
      <Defs>
        <LinearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#60A5FA" />
          <Stop offset="50%" stopColor="#2563EB" />
          <Stop offset="100%" stopColor="#1D4ED8" />
        </LinearGradient>
      </Defs>

      {/* base ring */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#E5E7EB"
        strokeWidth={strokeWidth}
        fill="none"
      />

      {/* segments */}
      {statuses.map((s: any, i: number) => {
        const isViewed = currentUserId && s.views?.includes(currentUserId);

        return (
          <Circle
            key={s.id || i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isViewed ? "green" : "url(#blueGrad)"}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${segment - gap} ${circumference}`}
            strokeDashoffset={-i * segment}
            strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
}

/* =========================
   MAIN COMPONENT
========================= */
export function StatusItem({ userStatus, onOpen }: StatusItemProps) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const latestStatus = userStatus.statuses
    ?.slice()
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    )[0];

  const hasMedia = latestStatus?.media?.length > 0;
  const firstMedia = latestStatus?.media?.[0];

  const hasUnviewed = userStatus.statuses.some((s) => !s.viewed);

  const handlePress = () => {
    onOpen?.(userStatus.userId);
    router.push(`/Viewer?user=${userStatus.userId}`);
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={styles.wrapper}>
          <StoryRing
            size={68}
            strokeWidth={3}
            statuses={userStatus.statuses}
            currentUserId={userStatus.userId}
          />

          {/* MEDIA OR TEXT */}
          {latestStatus ? (
            hasMedia ? (
              firstMedia?.includes(".mp4") ? (
                <Video
                  source={{ uri: firstMedia }}
                  style={styles.media}
                  resizeMode="cover"
                  muted
                  repeat
                />
              ) : (
                <Image source={{ uri: firstMedia }} style={styles.media} />
              )
            ) : (
              <View
                style={[
                  styles.textBackground,
                  {
                    backgroundColor: latestStatus.backgroundColor || "#1e293b",
                  },
                ]}
              >
                <Text style={styles.textOnly} numberOfLines={2}>
                  {latestStatus.caption}
                </Text>
              </View>
            )
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: 70,
  },

  wrapper: {
    width: 68,
    height: 68,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderRadius: 34,
  },

  media: {
    width: 58,
    height: 58,
    borderRadius: 29,
    position: "absolute",
  },

  textBackground: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
  },

  textOnly: {
    color: "#fff",
    fontSize: 10,
    textAlign: "center",
    paddingHorizontal: 4,
    fontWeight: "600",
  },
});
