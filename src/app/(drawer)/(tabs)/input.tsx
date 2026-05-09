import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useUser } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFollowContext } from "@/context/FollowContext";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import Video from "react-native-video";

function LinkPreviewCard({ preview, theme }: any) {
  if (!preview) return null;

  return (
    <Pressable
      onPress={() => Linking.openURL(preview.url)}
      style={{
        marginHorizontal: 12,
        marginTop: 10,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: theme.border || "#ddd",
        backgroundColor: theme.card,
      }}
    >
      {/* IMAGE FULL WIDTH */}
      {preview.image && (
        <Image
          source={{ uri: preview.image }}
          style={{
            width: "100%",
            height: 200,
          }}
          resizeMode="cover"
        />
      )}

      {/* TEXT BELOW IMAGE */}
      <View style={{ padding: 10 }}>
        <Text
          numberOfLines={2}
          style={{ fontWeight: "700", color: theme.text, fontSize: 14 }}
        >
          {preview.title}
        </Text>

        {!!preview.description && (
          <Text
            numberOfLines={3}
            style={{ color: theme.subtext, marginTop: 6, fontSize: 12 }}
          >
            {preview.description}
          </Text>
        )}

        <Text
          numberOfLines={1}
          style={{
            color: theme.primary,
            marginTop: 8,
            fontSize: 11,
          }}
        >
          {preview.url}
        </Text>
      </View>
    </Pressable>
  );
}

export default function InputScreen() {
  const [cast, setCast] = useState("");
  const [media, setMedia] = useState<
    { uri: string; type: "image" | "video" }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [postError, setPostError] = useState("");
  const [accountType, setAccountType] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<any[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);

  const { user } = useUser();
  const { currentLevel } = useLevel();
  const { theme, isDark } = useTheme();
  const { members } = useFollowContext();

  const [mentionResults, setMentionResults] = useState<any[]>([]);

  const extractMentionQuery = (text: string) => {
    const match = text.match(/(?:^|\s)@([A-Za-z0-9_]*)$/);
    return match ? match[1] : null;
  };

  useEffect(() => {
    const query = extractMentionQuery(cast);
    if (query === null) {
      setMentionResults([]);
      return;
    }

    const lower = query.toLowerCase();

    const filtered = members
      .filter((member: any) => {
        const nick = member.nickName?.toLowerCase() || "";
        const first = member.firstName?.toLowerCase() || "";
        const last = member.lastName?.toLowerCase() || "";

        if (!lower) return true;
        return (
          nick.startsWith(lower) ||
          first.startsWith(lower) ||
          last.startsWith(lower) ||
          nick.includes(lower) ||
          first.includes(lower) ||
          last.includes(lower)
        );
      })
      .slice(0, 6);

    setMentionResults(filtered);
  }, [cast, members]);

  const handleMentionSelect = (member: any) => {
    const mentionPattern = /(?:^|\s)@([A-Za-z0-9_]*)$/;
    const match = cast.match(mentionPattern);
    if (!match) return;

    const start = match.index ?? 0;

    // replace the whole "@something" with "@nickname"
    const newText =
      cast.substring(0, start) +
      match[0].replace(/@([A-Za-z0-9_]*)$/, `@${member.nickName} `);

    setCast(newText);
    setMentionResults([]);
  };

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
      setLinkData([]);
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

        setLinkData([
          {
            url,
            title: title || "No title",
            description: desc || "",
            images: img ? [img] : [],
          },
        ]);
      })
      .catch(() =>
        setLinkData([{ url, title: "Preview unavailable", images: [] }]),
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

  const sendNotification = async (token: any, title: string, body: string) => {
    console.log("🔥 sendNotification CALLED");
    try {
      console.log("📨 Sending notification to token:", token);

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: token,
          sound: "notification_sound.wav",
          title,
          body,
          data: { screen: "post" },
        }),
      });

      const result = await response.json();

      console.log("📩 Expo push response:", result);

      if (result?.data?.status === "ok") {
        console.log("✅ Notification sent successfully");
      } else {
        console.log("⚠️ Notification not accepted:", result);
      }

      return result;
    } catch (err) {
      console.log("❌ Notification error:", err);
    }
  };

  const handlePost = async (
    postType: "post" | "recast" | "recite" = "post",
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
      const safeLinkData = linkData.length
        ? [
            {
              url: linkData[0].url,
              title: linkData[0].title || "",
              description: linkData[0].description || "",
              image: linkData[0].images?.[0] || "",
            },
          ]
        : [];

      const urlRegex = /(https?:\/\/[^\s]+)/g;

      const cleanCaption = cast.replace(urlRegex, "").trim();
      const mentionMatches = cast.match(/@([A-Za-z0-9_]+)/g) || [];

      const mentions = mentionMatches
        .map((m) => {
          const nick = m.replace("@", "").toLowerCase();

          const user = members.find(
            (u: any) =>
              u.nickName?.toLowerCase() === nick ||
              u.nickName?.toLowerCase().includes(nick),
          );

          return user
            ? {
                userId: user.clerkId,
                nickName: user.nickName,
              }
            : null;
        })
        .filter(Boolean);

      console.log("📢 Mentions extracted:", mentions);

      const payload = {
        userId: user.id,
        caption: cleanCaption,
        mentions,
        media: uploadedUrls,
        levelType,
        levelValue,
        linkPreview: safeLinkData,
        type: postType,
        contentType: uploadedUrls?.length ? "media" : "text", // ✅ ADD THIS
        originalPostId: originalPostId || null,
      };

      const res = await axios.post(
        `https://cast-api-zeta.vercel.app/api/posts`,
        payload,
      );

      /* ===========================
         LOAD USER SETTINGS
      =========================== */
      // Example: notify followers OR another user
      // You must fetch real tokens from backend
      const recipientToken = res.data?.recipientToken;

      if (recipientToken) {
        console.log("🚀 Triggering notification...");

        await sendNotification(
          recipientToken,
          "New Post 📢",
          `${user.firstName || "Someone"} posted something new`,
        );
      }
      // console.log("✅ Post saved:", res.data);

      // Reset state
      setCast("");
      setMedia([]);
      setLinkData([]);
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

      {mentionResults.length > 0 && /(?:^|\s)@([A-Za-z0-9_]*)$/.test(cast) && (
        <View
          style={[
            styles.mentionList,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          {mentionResults.map((member) => (
            <Pressable
              key={member.clerkId}
              onPress={() => handleMentionSelect(member)}
              style={styles.mentionItem}
            >
              <Image
                source={{ uri: member.image }}
                style={styles.mentionAvatar}
              />
              <View style={styles.mentionTextWrapper}>
                <Text style={[styles.mentionName, { color: theme.text }]}>
                  {member.nickName}
                </Text>
                <Text style={[styles.mentionMeta, { color: theme.subtext }]}>
                  {" "}
                  {member.firstName} {member.lastName}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={takePhotoOrVideo}>
          <Ionicons name="camera" size={24} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={pickMedia}>
          <Ionicons name="image" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* LINK PREVIEW */}
      {linkData.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.linkPreview,
            {
              borderColor: theme.border,
              backgroundColor: theme.card,
            },
          ]}
          onPress={() => Linking.openURL(item.url)}
          activeOpacity={0.9}
        >
          {/* IMAGE FULL WIDTH */}
          {item.image && item.image.startsWith("http") ? (
            <Image source={{ uri: item.image }} style={styles.linkImageFull} />
          ) : (
            <View
              style={[styles.linkImageFull, { backgroundColor: theme.border }]}
            />
          )}

          {/* TEXT BELOW IMAGE */}
          <View style={styles.linkContentFull}>
            <Text
              style={[styles.linkTitle, { color: theme.text }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            {!!item.description && (
              <Text
                style={[styles.linkDesc, { color: theme.subtext }]}
                numberOfLines={3}
              >
                {item.description}
              </Text>
            )}

            <Text
              style={[styles.linkUrl, { color: theme.primary }]}
              numberOfLines={1}
            >
              {item.url}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setLinkData([])}
            style={styles.linkClose}
          >
            <Ionicons name="close" size={18} color={theme.text} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      {/* MEDIA PREVIEW */}
      {media.length > 0 && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {media.map((item, i) => {
            return (
              <View
                key={i}
                style={[
                  styles.preview,
                  {
                    width: "100%",
                  },
                ]}
              >
                {item.type === "image" ? (
                  <Image
                    source={{ uri: item.uri }}
                    style={[
                      styles.media,
                      {
                        width: "100%",
                        height: 250,
                      },
                    ]}
                    resizeMode="cover"
                  />
                ) : (
                  <Video
                    source={{ uri: item.uri }}
                    style={[
                      styles.media,
                      {
                        width: "100%",
                        height: 250,
                      },
                    ]}
                    resizeMode="cover"
                  />
                )}

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeMedia(item.uri)}
                >
                  <Ionicons name="close-circle" size={24} color="red" />
                </TouchableOpacity>
              </View>
            );
          })}
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
  linkPreview: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 12,
    position: "relative",
  },

  linkImageFull: {
    width: "100%",
    height: 200,
  },

  linkContentFull: {
    padding: 12,
  },

  linkTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },

  linkDesc: {
    fontSize: 13,
    marginBottom: 6,
  },

  linkUrl: {
    fontSize: 11,
  },

  linkClose: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    padding: 4,
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

  linkImage: {
    width: 100,
    height: 100,
  },
  linkContent: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
  },
  mentionList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginBottom: 10,
    maxHeight: 240,
  },
  mentionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  mentionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: "#eee",
  },
  mentionTextWrapper: {
    flex: 1,
  },
  mentionName: {
    fontWeight: "700",
  },
  mentionMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});
