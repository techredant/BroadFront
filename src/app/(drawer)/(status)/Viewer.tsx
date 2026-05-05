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
import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "@/context/ThemeContext";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";

const BASE_URL = "https://cast-api-zeta.vercel.app";
const { width, height } = Dimensions.get("window");

export default function Viewer() {
  const { user } = useLocalSearchParams();

  const [statuses, setStatuses] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [duration, setDuration] = useState(5000);
  const [menuOpen, setMenuOpen] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const userId = Array.isArray(user) ? user[0] : user;
  const current = statuses[currentIndex];
  const isVideo = current?.media?.[0]?.includes(".mp4");
  const { theme } = useTheme();

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
     RESET ON INDEX CHANGE
  ========================= */
  useEffect(() => {
    setVideoLoading(true);
    setDuration(5000);
    progress.setValue(0);
    animationRef.current?.stop();
  }, [currentIndex]);

  /* =========================
     FAILSAFE (prevents freeze)
  ========================= */
  useEffect(() => {
    const t = setTimeout(() => {
      setVideoLoading(false);
    }, 3000);

    return () => clearTimeout(t);
  }, [currentIndex]);

  /* =========================
     PROGRESS (PAUSES WITH MENU)
  ========================= */
  useEffect(() => {
    if (!statuses.length || paused || videoLoading || menuOpen) return;

    progress.setValue(0);

    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false,
    });

    animationRef.current = anim;

    anim.start(({ finished }) => {
      if (finished) handleNext();
    });

    return () => anim.stop();
  }, [currentIndex, duration, paused, videoLoading, menuOpen]);

  /* =========================
     VIDEO / IMAGE LOAD
  ========================= */
  const handleVideoLoad = (meta: any) => {
    setVideoLoading(false);
    setDuration(meta.duration * 1000);
  };

  const handleImageLoad = () => {
    setVideoLoading(false);
    setDuration(5000);
  };

  /* =========================
     CONTROLS
  ========================= */
  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((p) => p + 1);
    } else {
      router.replace("/(drawer)/(tabs)");
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((p) => p - 1);
    }
  };

  const handlePause = () => {
    if (!menuOpen) {
      setPaused(true);
      animationRef.current?.stop();
    }
  };

  const handleResume = () => {
    if (!menuOpen) {
      setPaused(false);
    }
  };

  /* =========================
     LOADING SCREEN
  ========================= */
  if (!current) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* BACK */}
      <Pressable
        style={[styles.backBtn, { backgroundColor: theme.card, borderRadius: 50, padding: 10 }]}
        onPress={() => router.replace("/(drawer)/(tabs)")}
      >
        <Ionicons name="arrow-back" size={26} color={theme.text} />
      </Pressable>

      {/* PROGRESS */}
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

      {/* MENU */}
      <View style={styles.menuWrapper}>
        <Menu
          onOpen={() => {
            setMenuOpen(true);
            setPaused(true);
          }}
          onClose={() => {
            setMenuOpen(false);
            setPaused(false);
          }}
        >
          <MenuTrigger>
           
            <View style={{ backgroundColor: theme.card, borderRadius: 50, padding: 10}}>
              <Feather name="more-vertical" size={22} color={theme.text} />
            </View>
          </MenuTrigger>

          <MenuOptions
            customStyles={{
              optionsContainer: {
                borderRadius: 12,
                paddingVertical: 6,
                width: 180,
                backgroundColor: "#fff",
              },
            }}
          >
            <MenuOption onSelect={() => alert("Save")}>
              <View style={styles.menuItem}>
                <Feather name="bookmark" size={16} />
                <Text>Save</Text>
              </View>
            </MenuOption>

            <MenuOption onSelect={() => alert("Share")}>
              <View style={styles.menuItem}>
                <Feather name="share-2" size={16} />
                <Text>Share</Text>
              </View>
            </MenuOption>

            <MenuOption onSelect={() => alert("Report")}>
              <View style={styles.menuItem}>
                <Feather name="flag" size={16} color="red" />
                <Text style={{ color: "red" }}>Report</Text>
              </View>
            </MenuOption>
          </MenuOptions>
        </Menu>
      </View>

      {/* CONTENT */}
      <Pressable
        style={styles.container}
        onLongPress={handlePause}
        onPressOut={handleResume}
      >
        {/* MEDIA */}
        {current.media?.length > 0 &&
          (isVideo ? (
            <Video
              source={{ uri: current.media[0] }}
              style={styles.media}
              resizeMode="contain"
              paused={paused || menuOpen}
              onLoad={handleVideoLoad}
              onLoadStart={() => setVideoLoading(true)}
            />
          ) : (
            <Image
              source={{ uri: current.media[0] }}
              style={styles.media}
              resizeMode="contain"
              onLoadStart={() => setVideoLoading(true)}
              onLoadEnd={handleImageLoad}
            />
          ))}

        {/* LOADER */}
        {videoLoading && (
          <ActivityIndicator size="large" color="#fff" style={styles.loader} />
        )}

        {/* TEXT */}
        {current.caption && (
          <View
            style={[
              styles.textContainer,
              {
                justifyContent:
                  current.media?.length > 0 ? "flex-end" : "center",
                paddingBottom: current.media?.length > 0 ? 80 : 0,
                backgroundColor:
                  current.media?.length > 0
                    ? "transparent"
                    : current.backgroundColor,
              },
            ]}
          >
            <Text style={styles.text}>{current.caption}</Text>
          </View>
        )}
      </Pressable>

      {/* TOUCH NAV */}
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
    top: 60,
    left: 15,
    zIndex: 100,
  },

  media: {
    width,
    height,
    position: "absolute",
  },

  textContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
  },

  text: {
    color: "#fff",
    fontSize: 28,
    textAlign: "center",
    paddingHorizontal: 20,
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  touchRow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    flexDirection: "row",
  
  },

  left: { flex: 1 },
  right: { flex: 1 },

  menuWrapper: {
    position: "absolute",
    top: 60,
    right: 15,
    zIndex: 200,
    borderRadius: 50
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
  },
});
