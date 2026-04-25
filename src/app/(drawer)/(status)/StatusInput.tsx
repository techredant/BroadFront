import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import axios from "axios";
import { useLevel } from "@/context/LevelContext";
import * as ImagePicker from "expo-image-picker";
import Video from "react-native-video";

/* =======================
   CONFIG
======================= */
const BASE_URL = "https://cast-api-zeta.vercel.app";

export default function StatusInput() {
  const [status, setStatus] = useState("");
  const [bgIndex, setBgIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const { userDetails } = useLevel();
  const { theme, isDark } = useTheme();
  const [linkData, setLinkData] = useState<any>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [cast, setCast] = useState("");
  const [media, setMedia] = useState<
    { uri: string; type: "image" | "video" }[]
  >([]);

  const backgrounds = [
    "#1e293b",
    "#2563eb",
    "#16a34a",
    "#dc2626",
    "#7c3aed",
    "#ea580c",
  ];

  /* =======================
     🚀 POST STATUS
  ======================= */
  const handlePostStatus = async () => {
    if ((!status.trim() && media.length === 0) || loading) return;

    try {
      setLoading(true);

      // ✅ upload all media first
      const uploadedMedia = [];

      for (const item of media) {
        const url = await uploadToCloudinary(item.uri, item.type);
        if (url) uploadedMedia.push(url);
      }

      const payload = {
        userId: userDetails?.clerkId,
        lastName: userDetails?.lastName,
        firstName: userDetails?.firstName,
        nickname: userDetails?.nickname,
        caption: status,
        media: uploadedMedia, // ✅ REAL DATA NOW
        backgroundColor: backgrounds[bgIndex],
      };

      await axios.post(`${BASE_URL}/api/status`, payload);

      setStatus("");
      setMedia([]); // reset
      router.push("/(drawer)/(tabs)");
    } catch (err: any) {
      console.log("POST STATUS ERROR:", err?.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = cast.match(urlRegex);

    if (!urls?.length) {
      setLinkData(null);
      return;
    }

    const url = urls[0];
    setLinkLoading(true);

    fetch(url)
      .then((res) => res.text())
      .then((html) => {
        const title = html.match(/<title>(.*?)<\/title>/i)?.[1];
        const desc = html.match(
          /<meta\s+name=["']description["']\s+content=["'](.*?)["']/i,
        )?.[1];
        const img = html.match(
          /<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i,
        )?.[1];

        setLinkData({
          url,
          title: title || "No title",
          description: desc || "",
          images: img ? [img] : [],
        });
      })
      .catch(() =>
        setLinkData({ url, title: "Preview unavailable", images: [] }),
      )
      .finally(() => setLinkLoading(false));
  }, [cast]);

  /* =======================
         MEDIA PICKERS
      ======================= */
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      setMedia((prev) => [
        ...prev,
        ...result.assets.map((a) => ({
          uri: a.uri,
          type: a.type as "image" | "video",
        })),
      ]);
    }
  };

  const takePhotoOrVideo = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      quality: 1,
    });

    if (!result.canceled) {
      setMedia((prev) => [
        ...prev,
        {
          uri: result.assets[0].uri,
          type: result.assets[0].type as "image" | "video",
        },
      ]);
    }
  };

  const removeMedia = (uri: string) =>
    setMedia((prev) => prev.filter((m) => m.uri !== uri));

  const uploadToCloudinary = async (uri: string, type: "image" | "video") => {
    const data = new FormData();
    data.append("file", {
      uri,
      type: type === "video" ? "video/mp4" : "image/jpeg",
      name: type === "video" ? "upload.mp4" : "upload.jpg",
    } as any);
    data.append("upload_preset", "MediaCast");
    data.append("cloud_name", "ds25oyyqo");

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/ds25oyyqo/${type}/upload`,
        { method: "POST", body: data },
      );
      const result = await res.json();
      return result.secure_url;
    } catch (err) {
      console.error("Cloudinary Upload Error:", err);
      return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: backgrounds[bgIndex] }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/(drawer)/(tabs)")}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Status</Text>

        <TouchableOpacity
          disabled={!status.trim() || loading}
          onPress={handlePostStatus}
          style={{ opacity: status.trim() && !loading ? 1 : 0.5 }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="send" size={26} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* INPUT */}
      <View style={styles.center}>
        <TextInput
          value={status}
          onChangeText={setStatus}
          placeholder="What's on your mind?"
          placeholderTextColor="rgba(255,255,255,0.6)"
          style={styles.input}
          multiline
          autoFocus
        />
      </View>
      {/* MEDIA PREVIEW */}
      {media.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {media.map((item, i) => (
            <View key={i} style={styles.preview}>
              {item.type === "image" ? (
                <Image
                  source={{ uri: item.uri }}
                  style={styles.media}
                  resizeMode="cover"
                />
              ) : (
                <Video source={{ uri: item.uri }} style={styles.media} />
              )}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeMedia(item.uri)}
              >
                <Ionicons name="close-circle" size={24} color="red" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
      {/* MEDIA ACTIONS */}
      <View style={styles.mediaActions}>
        <TouchableOpacity style={styles.mediaBtn} onPress={pickMedia}>
          <Ionicons name="image-outline" size={26} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.mediaBtn} onPress={takePhotoOrVideo}>
          <Ionicons name="camera-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* COLORS */}
      <View style={styles.colors}>
        {backgrounds.map((color, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setBgIndex(index)}
            style={[
              styles.colorDot,
              {
                backgroundColor: color,
                borderWidth: bgIndex === index ? 2 : 0,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

/* =======================
   STYLES
======================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 30,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  input: {
    color: "#fff",
    fontSize: 28,
    textAlign: "center",
    lineHeight: 38,
  },

  colors: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingBottom: 30,
  },

  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderColor: "#fff",
  },
  mediaActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 25,
    marginBottom: 20,
  },

  mediaBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  preview: { marginRight: 10, position: "relative" },
  media: { width: 250, height: 250, borderRadius: 12 },
  removeButton: { position: "absolute", top: 5, right: 5 },
});
