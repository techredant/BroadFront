import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import Video from "react-native-video";
import { Image } from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "https://cast-api-zeta.vercel.app";
const DURATION = 5000;

export default function Viewer() {
  const { user } = useLocalSearchParams();

  const [statuses, setStatuses] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const progress = useRef(new Animated.Value(0)).current;

  const current = statuses[currentIndex];
  const userId = Array.isArray(user) ? user[0] : user;

  /* =========================
     FETCH STATUSES
  ========================= */
  useEffect(() => {
    fetch(`${BASE_URL}/api/status/user/${user}`)
      .then((res) => res.json())
      .then((data) => {
        const sorted = data.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        setStatuses(sorted);
      });
  }, [user]);

  /* =========================
     MARK AS VIEWED
  ========================= */
  useEffect(() => {
     if (!current?._id || !userId) return;

    axios.put(`${BASE_URL}/api/status/${current._id}/view`, {
      userId: String(user),
    });
  }, [currentIndex]);

  /* =========================
     AUTO PROGRESS
  ========================= */
  useEffect(() => {
    if (!statuses.length) return;

    progress.setValue(0);

    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) handleNext();
    });
  }, [currentIndex, statuses]);

  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((p) => p + 1);
    } else {
      router.back();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((p) => p - 1);
    }
  };

  const isVideo = current?.media?.[0]?.includes(".mp4");

  if (!current) return null;

  return (
    <View style={styles.container}>
      {/* ================= BACK BUTTON ================= */}
      <Pressable
        style={styles.backBtn}
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/(drawer)/(tabs)");
          }
        }}
      >
        <Ionicons name="arrow-back" size={26} color="#fff" />
      </Pressable>

      {/* ================= PROGRESS ================= */}
      <View style={styles.progressContainer}>
        {statuses.map((_, i) => (
          <View key={i} style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width:
                    i === currentIndex
                      ? progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        })
                      : i < currentIndex
                        ? "100%"
                        : "0%",
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* ================= CONTENT ================= */}
      {isVideo ? (
        <Video
          source={{ uri: current.media[0] }}
          style={styles.media}
          resizeMode="cover"
        />
      ) : current.media?.length ? (
        <Image source={{ uri: current.media[0] }} style={styles.media} />
      ) : (
        <View
          style={[
            styles.textContainer,
            { backgroundColor: current.backgroundColor || "#000" },
          ]}
        >
          <Text style={styles.text}>{current.caption}</Text>
        </View>
      )}

      {/* ================= TOUCH ================= */}
      <View style={styles.touchRow}>
        <Pressable style={styles.left} onPress={handlePrev} />
        <Pressable style={styles.right} onPress={handleNext} />
      </View>
    </View>
  );
}

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  backBtn: {
    position: "absolute",
    top: 50,
    left: 15,
    zIndex: 100,
  },

  media: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },

  textContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  text: {
    color: "#fff",
    fontSize: 28,
    textAlign: "center",
  },

  progressContainer: {
    flexDirection: "row",
    position: "absolute",
    top: 50,
    left: 10,
    right: 10,
    gap: 4,
    zIndex: 10,
  },

  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  progressFill: {
    height: 3,
    backgroundColor: "#fff",
  },

  touchRow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    flexDirection: "row",
  },

  left: { flex: 1 },
  right: { flex: 1 },
});
