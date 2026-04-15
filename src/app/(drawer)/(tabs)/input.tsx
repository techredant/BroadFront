import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useUser } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import Video from "react-native-video";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function InputScreen() {
  const [cast, setCast] = useState("");
  const [media, setMedia] = useState<
    { uri: string; type: "image" | "video" }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [postError, setPostError] = useState("");
  const [accountType, setAccountType] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<any>(null);
  const [linkLoading, setLinkLoading] = useState(false);

  const { user } = useUser();
  const { currentLevel } = useLevel();
  const { theme, isDark } = useTheme();

  /* =======================
       ACCOUNT TYPE
    ======================= */
  useEffect(() => {
    if (user) {
      setAccountType(
        typeof user.unsafeMetadata?.accountType === "string"
          ? user.unsafeMetadata.accountType
          : "Personal Account",
      );
    }
  }, [user]);

  /* =======================
       LINK PREVIEW
    ======================= */
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

  /* =======================
       POST HANDLER
    ======================= */
  const handlePost = async (
    postType: "normal" | "recasted" | "recited" = "normal",
    originalPostId?: string,
  ) => {
    setPostError("");

    if (!user) return setPostError("You must be signed in to post.");
    // if (!cast && media.length === 0 && postType === "normal")
    //   return setPostError("Please add a caption or media before posting.");

    setLoading(true);

    try {
      // Upload media
      const uploadedUrls: string[] = [];
      for (let item of media) {
        const url = await uploadToCloudinary(item.uri, item.type);
        if (url) uploadedUrls.push(url);
      }

      const levelType =
        accountType === "Personal Account" && currentLevel?.type
          ? currentLevel.type
          : "organization";

      const levelValue =
        accountType === "Personal Account" && currentLevel?.value
          ? currentLevel.value
          : (user.publicMetadata?.companyName as string) || "Org";

      // Post payload
      const safeLinkData = linkData
        ? {
            url: linkData.url,
            title: linkData.title || "",
            description: linkData.description || "",
            images: linkData.images?.slice() || [],
          }
        : null;

      const payload = {
        userId: user.id,
        caption: cast,
        media: uploadedUrls,
        levelType,
        levelValue,
        linkPreview: safeLinkData,
        type: postType,
        originalPostId: originalPostId || null,
      };

      const res = await axios.post(
        `https://cast-api-zeta.vercel.app/api/posts`,
        payload,
      );

      // console.log("✅ Post saved:", res.data);

      // Reset state
      setCast("");
      setMedia([]);
      setLinkData(null);
      router.replace("/(drawer)/(tabs)");
    } catch (err: any) {
      console.error("❌ Post Error:", err.response?.data || err.message);
      setPostError("Something went wrong while posting. Check your network.");
    } finally {
      setLoading(false);
    }
  };

  /* =======================
       TITLE
    ======================= */
  const formattedTitle =
    currentLevel?.type === "home"
      ? "Home"
      : currentLevel?.value && currentLevel?.type
        ? `${capitalize(currentLevel.value)} ${capitalize(currentLevel.type)}`
        : "Update in your Profile";

  function capitalize(str?: string) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      {/* HEADER */}
      <View style={styles.header}>
        {/* <TouchableOpacity onPress={() => router.replace('/(drawer)/(tabs)')}>
                    <Ionicons name="close" size={28} color={theme.subtext} />
                </TouchableOpacity> */}
        <View></View>
        <Text
          style={[
            styles.headerTitle,
            { color: theme.text, textAlign: "center" },
          ]}
        >
          {accountType === "Personal Account"
            ? formattedTitle
            : (user?.publicMetadata?.companyName as string) || "Organization"}
        </Text>

        <TouchableOpacity
          disabled={!cast && media.length === 0}
          onPress={() => handlePost()}
          style={[
            styles.postButton,
            { opacity: cast || media.length ? 1 : 0.5 },
          ]}
        >
          {loading ? (
            <Text style={{ color: theme.text }}>Posting...</Text>
          ) : (
            <Text style={styles.postButtonText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      {postError ? <Text style={{ color: "red" }}>{postError}</Text> : null}

      {/* INPUT */}
      <TextInput
        placeholder="What's on your mind?"
        placeholderTextColor={theme.subtext}
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        multiline
        value={cast}
        onChangeText={setCast}
      />

      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={takePhotoOrVideo}>
          <Ionicons name="camera" size={24} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={pickMedia}>
          <Ionicons name="image" size={24} color={theme.text} />
        </TouchableOpacity>
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
    </SafeAreaView>
  );
}

/* =======================
   STYLES
======================= */
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // marginBottom: 15,
    marginTop: 20,
  },
  headerTitle: { fontWeight: "bold", fontSize: 18 },
  postButton: {
    backgroundColor: "blue",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  postButtonText: { color: "white", fontWeight: "bold" },
  preview: { marginRight: 10, position: "relative" },
  media: { width: 250, height: 250, borderRadius: 12 },
  removeButton: { position: "absolute", top: 5, right: 5 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    marginVertical: 20,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
});
