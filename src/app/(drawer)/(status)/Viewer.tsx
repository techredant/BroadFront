import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import Video from "react-native-video";
import { Image } from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

const BASE_URL = "https://cast-api-zeta.vercel.app";
const DURATION = 5000;

const { width, height } = Dimensions.get("window");

export default function Viewer() {
  const { user } = useLocalSearchParams();

  const [statuses, setStatuses] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
 
  const [paused, setPaused] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const progressValue = useRef(0);

  const userId = Array.isArray(user) ? user[0] : user;
  const current = statuses[currentIndex];

  useFocusEffect(
    useCallback(() => {
      // Screen is focused
      setPaused(false);

      return () => {
        // Screen is unfocused (user left)
        setPaused(true);
        animationRef.current?.stop();
      };
    }, []),
  );

  /* =========================
     FETCH STATUSES
  ========================= */
  useEffect(() => {
    fetch(`${BASE_URL}/api/status/user/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        const sorted = data.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setStatuses(sorted);
      });
  }, [userId]);

  /* =========================
     MARK AS VIEWED
  ========================= */
  useEffect(() => {
    if (!current?._id || !userId) return;

    axios.put(`${BASE_URL}/api/status/${current._id}/view`, {
      userId: String(userId),
    });
  }, [currentIndex]);

  /* =========================
     AUTO PROGRESS (WITH PAUSE)
  ========================= */
  useEffect(() => {
    if (!statuses.length) return;
    if (paused) return;

    progress.setValue(progressValue.current);

    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION * (1 - progressValue.current),
      useNativeDriver: false,
    });

    animationRef.current = anim;

    progress.addListener(({ value }) => {
      progressValue.current = value;
    });

    anim.start(({ finished }) => {
      if (finished) {
        progressValue.current = 0;
        handleNext();
      }
    });

    return () => {
      progress.removeAllListeners();
      anim.stop();
    };
  }, [currentIndex, statuses,  paused]);

  /* =========================
     CONTROLS
  ========================= */
  const handleNext = () => {
    progressValue.current = 0;
    progress.setValue(0);

    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((p) => p + 1);
    } else {
      router.replace("/(drawer)/(tabs)");
    }
  };

  const handlePrev = () => {
    progressValue.current = 0;
    progress.setValue(0);

    if (currentIndex > 0) {
      setCurrentIndex((p) => p - 1);
    }
  };

  const handlePause = () => {
    setPaused(true);
    animationRef.current?.stop();
  };

  const handleResume = () => {
    setPaused(false);
  };

  const isVideo = current?.media?.[0]?.endsWith(".mp4");

  useEffect(() => {
    if (!current) {
      animationRef.current?.stop();
      progressValue.current = 0;
      progress.setValue(0);
    }
  }, [current]);

 if (!current) {
   return (
     <View style={styles.loader}>
       <ActivityIndicator size="large" color="#fff" />
     </View>
   );
 }



  return (
    <View style={styles.container}>
      {/* BACK BUTTON */}
      <Pressable
        style={styles.backBtn}
        onPress={() => router.replace("/(drawer)/(tabs)")}
      >
        <Ionicons name="arrow-back" size={26} color="#fff" />
      </Pressable>

      {/* PROGRESS BARS */}
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

      {/* CONTENT */}
      <View style={styles.container}>
        {/* MEDIA */}
        {current.media?.length > 0 &&
          (isVideo ? (
            <Video
              source={{ uri: current.media[0] }}
              style={styles.media}
              resizeMode="contain"
              paused={paused}
            />
          ) : (
            <Image
              source={{ uri: current.media[0] }}
              style={styles.media}
              resizeMode="contain"
            />
          ))}

        {/* TEXT */}
        {current.caption ? (
          <View style={styles.textContainer}>
            <Text style={styles.text}>{current.caption}</Text>
          </View>
        ) : null}
      </View>

      {/* TOUCH CONTROLS */}
      <View style={styles.touchRow}>
        <Pressable
          style={styles.left}
          onPress={handlePrev}
          onLongPress={handlePause}
          onPressOut={handleResume}
        />
        <Pressable
          style={styles.right}
          onPress={handleNext}
          onLongPress={handlePause}
          onPressOut={handleResume}
        />
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
    width,
    height,
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

  loader: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
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
