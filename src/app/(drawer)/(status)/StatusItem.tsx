import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ReactNode, useRef, useState } from "react";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Video from "react-native-video";
import { useTheme } from "@/context/ThemeContext";

/* =========================
   STORY RING WITH PROGRESS
========================= */
function StoryRing({
  size = 68,
  strokeWidth = 3,
  statuses = [],
  currentUserId,
  forceViewed,
  activeIndex = -1,
  progress = 0,
}: any) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const total = Math.max(statuses.length, 1);
  const gap = 4;

  const segment = circumference / total;

  return (
    <Svg width={size} height={size} style={{ position: "absolute" }}>
      <Defs>
        <LinearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#60A5FA" />
          <Stop offset="100%" stopColor="#2563EB" />
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
        const viewed =
          forceViewed || (currentUserId && s.views?.includes(currentUserId));

        const isActive = i === activeIndex;

        const dashLength = segment - gap;

        return (
          <Circle
            key={s.id || i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={viewed ? "#9CA3AF" : "url(#blueGrad)"}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            opacity={1}
            strokeDasharray={`${dashLength} ${circumference}`}
            strokeDashoffset={-i * segment}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
    </Svg>
  );
}

/* =========================
   MAIN COMPONENT
========================= */
export function StatusItem({
  userStatus,
  onOpen,
  currentUserId,
  activeIndex,
  progress,
}: any) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const [localViewed, setLocalViewed] = useState(false);

  const latestStatus = userStatus.statuses?.[0];

  const hasMedia = latestStatus?.media?.length > 0;
  const firstMedia = latestStatus?.media?.[0];
  const {theme} = useTheme()

  const handlePress = () => {
    setLocalViewed(true); // 👈 instant grey
    onOpen?.(userStatus.userId);
    router.push(`/(status)/Viewer?user=${userStatus.userId}`);
  };

 
  

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={styles.wrapper}>
          <StoryRing
            statuses={userStatus.statuses}
            currentUserId={currentUserId}
            forceViewed={localViewed}
            activeIndex={activeIndex}
            progress={progress}
          />

          {/* MEDIA */}
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
        {/* 👇 USER NAME */}
        <Text
          style={{
            marginTop: 6,
            fontSize: 12,
            fontWeight: "500",
            textAlign: "center",
            width: 70,
            color:theme.text
          }}
          numberOfLines={1}
        >
          {latestStatus?.firstName}
        </Text>
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
