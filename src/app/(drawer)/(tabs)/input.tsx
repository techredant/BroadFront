import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadMediaItems } from "@/utils/mediaUpload";
import {
  imagePickerMediaOptions,
  normalizePickerAsset,
} from "@/utils/mediaUtils";
import { MediaUploadError } from "@/utils/mediaUpload";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import axios from "axios";
import { useUser } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFollowContext } from "@/context/FollowContext";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { formatNickHandle, stripNickPrefix } from "@/utils/nickName";
import {
  buildOptimisticNewPost,
  normalizePostId,
} from "@/utils/buildSharePost";
import Video from "react-native-video";
import { Image } from "expo-image";

const { width: SCREEN_W } = Dimensions.get("window");
const H_PAD = 16;
const MEDIA_GAP = 8;
const MEDIA_COL = (SCREEN_W - H_PAD * 2 - MEDIA_GAP) / 2;
const MAX_CHARS = 500;
const MAX_MEDIA = 4;

function LinkPreviewCard({
  preview,
  theme,
  onRemove,
}: {
  preview: {
    url: string;
    title?: string;
    description?: string;
    images?: string[];
  };
  theme: any;
  onRemove?: () => void;
}) {
  const imageUri = preview.images?.[0];

  return (
    <Pressable
      onPress={() => Linking.openURL(preview.url)}
      style={[
        styles.linkCard,
        {
          borderColor: theme.border,
          backgroundColor: theme.card,
        },
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.linkImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View
          style={[styles.linkImage, { backgroundColor: theme.border }]}
        />
      )}
      <View style={styles.linkBody}>
        <Text style={[styles.linkTitle, { color: theme.text }]} numberOfLines={2}>
          {preview.title || "Link"}
        </Text>
        {!!preview.description && (
          <Text
            style={[styles.linkDesc, { color: theme.subtext }]}
            numberOfLines={2}
          >
            {preview.description}
          </Text>
        )}
        <Text style={[styles.linkUrl, { color: theme.subtext }]} numberOfLines={1}>
          {preview.url.replace(/^https?:\/\//, "")}
        </Text>
      </View>
      {onRemove && (
        <Pressable onPress={onRemove} style={styles.linkRemove} hitSlop={8}>
          <Ionicons name="close" size={16} color="#fff" />
        </Pressable>
      )}
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
  const { currentLevel, userDetails, prependPost, replacePost, removePost } =
    useLevel();
  const { theme, isDark } = useTheme();
  const { members } = useFollowContext();
  const insets = useSafeAreaInsets();

  const [mentionResults, setMentionResults] = useState<any[]>([]);

  const avatarUri =
    userDetails?.image ||
    user?.imageUrl ||
    "https://ui-avatars.com/api/?name=U&background=1D9BF0&color=fff";

  const charCount = cast.length;
  const charNearLimit = charCount > MAX_CHARS * 0.85;
  const charOverLimit = charCount > MAX_CHARS;
  const canPost =
    (cast.trim().length > 0 || media.length > 0) && !charOverLimit;

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
        const nick = stripNickPrefix(member.nickName).toLowerCase();
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
    const mentionPattern = /(^|\s)@([A-Za-z0-9_]*)$/;
    const match = cast.match(mentionPattern);
    if (!match) return;
    const startIndex = match.index ?? 0;
    const before = cast.slice(0, startIndex);
    setCast(`${before}@${stripNickPrefix(member.nickName)} `);
    setMentionResults([]);
  };

  useEffect(() => {
    if (user) {
      setAccountType(
        typeof user.unsafeMetadata?.accountType === "string"
          ? user.unsafeMetadata.accountType
          : "Personal Account",
      );
    }
  }, [user]);

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

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      ...imagePickerMediaOptions,
    });

    if (!result.canceled) {
      setMedia((prev) => [
        ...prev,
        ...result.assets.map((a) => normalizePickerAsset(a)),
      ]);
    }
  };

  const takePhotoOrVideo = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      ...imagePickerMediaOptions,
    });

    if (!result.canceled && result.assets[0]) {
      setMedia((prev) => [...prev, normalizePickerAsset(result.assets[0])]);
    }
  };

  const removeMedia = (uri: string) =>
    setMedia((prev) => prev.filter((m) => m.uri !== uri));

  const sendNotification = async (token: any, title: string, body: string) => {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
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
    } catch (err) {
      console.log("Notification error:", err);
    }
  };

  const handlePost = async (
    postType: "post" | "recast" | "recite" = "post",
    originalPostId?: string,
  ) => {
    setPostError("");
    if (!user) return setPostError("You must be signed in to post.");
    if (!canPost) return;

    setLoading(true);

    const levelType =
      accountType === "Personal Account" && currentLevel?.type
        ? currentLevel.type
        : "organization";

    const levelValue =
      accountType === "Personal Account" && currentLevel?.value
        ? currentLevel.value
        : (user.publicMetadata?.companyName as string) || "Org";

    const tempId = `temp-post-${Date.now()}`;

    try {
      const uploadedUrls = await uploadMediaItems(media);

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
      const mentionHandles = [
        ...new Set(
          (cast.match(/@+([A-Za-z0-9_]+)/g) || []).map((m) =>
            stripNickPrefix(m).toLowerCase(),
          ),
        ),
      ];
      const mentions = mentionHandles
        .map((handle) => {
          const member = members.find(
            (m: any) =>
              stripNickPrefix(m.nickName).toLowerCase() === handle,
          );
          if (!member?.clerkId) return null;
          return {
            userId: member.clerkId,
            nickName: stripNickPrefix(member.nickName),
          };
        })
        .filter(Boolean);

      const payload = {
        userId: user.id,
        caption: cleanCaption,
        mentions,
        media: uploadedUrls,
        levelType,
        levelValue,
        linkPreview: safeLinkData,
        type: postType,
        contentType: uploadedUrls?.length ? "media" : "text",
        originalPostId: originalPostId || null,
      };

      const optimistic = buildOptimisticNewPost({
        tempId,
        userDetails,
        clerkUser: user,
        caption: cleanCaption,
        mentions,
        media: uploadedUrls,
        linkPreview: safeLinkData,
        levelType,
        levelValue,
        type: postType,
        originalPostId: originalPostId || null,
      });
      prependPost(optimistic);

      const res = await axios.post(
        `https://cast-api-zeta.vercel.app/api/posts`,
        payload,
      );

      replacePost(tempId, normalizePostId(res.data));

      const recipientToken = res.data?.recipientToken;
      if (recipientToken) {
        await sendNotification(
          recipientToken,
          "New Post",
          `${user.firstName || "Someone"} posted something new`,
        );
      }

      setCast("");
      setMedia([]);
      setLinkData([]);
      router.replace("/(drawer)/(tabs)");
    } catch (err: any) {
      removePost(tempId);
      console.error("Post Error:", err.response?.data || err.message);
      if (err instanceof MediaUploadError) {
        setPostError(err.message);
      } else {
        setPostError(
          "Something went wrong. Check your connection and try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const audienceLabel = useMemo(() => {
    if (accountType !== "Personal Account") {
      return (user?.publicMetadata?.companyName as string) || "Organization";
    }
    if (currentLevel?.type === "home") return "Everyone · Home";
    if (currentLevel?.value && currentLevel?.type) {
      const v =
        currentLevel.value.charAt(0).toUpperCase() +
        currentLevel.value.slice(1);
      const t =
        currentLevel.type.charAt(0).toUpperCase() + currentLevel.type.slice(1);
      return `${v} · ${t}`;
    }
    return "Update location in profile";
  }, [accountType, currentLevel, user]);

  const displayName =
    userDetails?.nickName ||
    userDetails?.firstName ||
    user?.firstName ||
    "You";

  const mediaTileSize =
    media.length === 1 ? SCREEN_W - H_PAD * 2 : MEDIA_COL;

  const renderMediaTile = (
    item: { uri: string; type: "image" | "video" },
    size: number,
    index: number,
  ) => (
    <View
      key={`${item.uri}-${index}`}
      style={[styles.mediaTile, { width: size, height: size }]}
    >
      {item.type === "image" ? (
        <Image
          source={{ uri: item.uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <>
          <Video
            source={{ uri: item.uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            repeat
            muted
            paused={false}
          />
          <View style={styles.videoBadge}>
            <Ionicons name="play" size={18} color="#fff" />
          </View>
        </>
      )}
      <Pressable
        style={styles.mediaRemove}
        onPress={() => removeMedia(item.uri)}
        hitSlop={8}
      >
        <View style={styles.mediaRemoveInner}>
          <Ionicons name="close" size={16} color="#fff" />
        </View>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.background }]}
      edges={["top", "bottom"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />

      {/* Header stays fixed — not inside KeyboardAvoidingView */}
      <View
        style={[
          styles.topBar,
          { borderBottomColor: theme.border, backgroundColor: theme.background },
        ]}
      >
        <View style={styles.topBarSide}>
          <Pressable
            onPress={() => router.replace("/(drawer)/(tabs)")}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
        </View>

        <Text
          style={[styles.topTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          New cast
        </Text>

        <View style={[styles.topBarSide, styles.topBarSideRight]}>
          <Pressable
            disabled={!canPost || loading}
            onPress={() => handlePost()}
            style={({ pressed }) => [
              styles.postPill,
              {
                backgroundColor: canPost ? theme.primary : theme.border,
                opacity: loading ? 0.75 : pressed ? 0.9 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <Text
                style={[
                  styles.postPillText,
                  { color: canPost ? theme.primary : theme.subtext },
                ]}
              >
                Post
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.audienceRow}>
            <View
              style={[
                styles.audienceChip,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                },
              ]}
            >
              <Ionicons name="earth-outline" size={14} color={theme.primary} />
              <Text style={[styles.audienceText, { color: theme.primary }]}>
                {audienceLabel}
              </Text>
            </View>
            {charCount > 0 && (
              <Text
                style={[
                  styles.charCount,
                  {
                    color: charOverLimit
                      ? (theme.danger ?? "#ef4444")
                      : charNearLimit
                        ? "#f59e0b"
                        : theme.subtext,
                  },
                ]}
              >
                {charCount}/{MAX_CHARS}
              </Text>
            )}
          </View>

          {postError ? (
            <View style={styles.errorBanner}>
              <Ionicons
                name="alert-circle"
                size={16}
                color={theme.danger ?? "#ef4444"}
              />
              <Text style={styles.errorText}>{postError}</Text>
            </View>
          ) : null}

          <View style={styles.composerRow}>
            <Image
              source={{ uri: avatarUri }}
              style={[styles.avatar, { borderColor: theme.border }]}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View style={styles.composerCol}>
              <Text style={[styles.displayName, { color: theme.text }]}>
                {displayName}
              </Text>
              <TextInput
                placeholder="What's happening?"
                placeholderTextColor={theme.subtext}
                style={[styles.composerInput, { color: theme.text }]}
                multiline
                scrollEnabled
                value={cast}
                onChangeText={setCast}
                maxLength={MAX_CHARS + 20}
                autoFocus
              />
            </View>
          </View>

          {mentionResults.length > 0 &&
            /(?:^|\s)@([A-Za-z0-9_]*)$/.test(cast) && (
              <View
                style={[
                  styles.mentionSheet,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                  },
                ]}
              >
                <Text style={[styles.mentionHeader, { color: theme.subtext }]}>
                  Mention someone
                </Text>
                {mentionResults.map((member, idx) => (
                  <Pressable
                    key={member.clerkId}
                    onPress={() => handleMentionSelect(member)}
                    style={({ pressed }) => [
                      styles.mentionRow,
                      pressed && { backgroundColor: theme.background },
                      idx < mentionResults.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: member.image }}
                      style={styles.mentionAvatar}
                      contentFit="cover"
                    />
                    <View style={styles.mentionMeta}>
                      <Text style={[styles.mentionNick, { color: theme.text }]}>
                        {formatNickHandle(member.nickName)}
                      </Text>
                      <Text
                        style={[styles.mentionName, { color: theme.subtext }]}
                      >
                        {member.firstName} {member.lastName}
                      </Text>
                    </View>
                    <Ionicons
                      name="add-circle-outline"
                      size={22}
                      color={theme.primary}
                    />
                  </Pressable>
                ))}
              </View>
            )}

          {linkLoading && (
            <View
              style={[
                styles.linkLoading,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <ActivityIndicator size="small" color={theme.primary} />
              <Text
                style={{ color: theme.subtext, marginLeft: 10, fontSize: 12 }}
              >
                Loading link preview…
              </Text>
            </View>
          )}
          {linkData.map((item, index) => (
            <LinkPreviewCard
              key={index}
              preview={item}
              theme={theme}
              onRemove={() => setLinkData([])}
            />
          ))}

          {media.length > 0 && (
            <View style={styles.mediaSection}>
              <View style={styles.mediaSectionHeader}>
                <Text style={[styles.mediaSectionTitle, { color: theme.text }]}>
                  Attachments
                </Text>
                <Text
                  style={[styles.mediaSectionCount, { color: theme.subtext }]}
                >
                  {media.length}/{MAX_MEDIA}
                </Text>
              </View>
              <View
                style={[
                  styles.mediaGrid,
                  media.length === 1 && styles.mediaGridSingle,
                ]}
              >
                {media.map((item, i) =>
                  renderMediaTile(item, mediaTileSize, i),
                )}
                {media.length < MAX_MEDIA && (
                  <Pressable
                    onPress={pickMedia}
                    style={({ pressed }) => [
                      styles.addMediaSlot,
                      {
                        width: mediaTileSize,
                        height: mediaTileSize,
                        borderColor: theme.border,
                        backgroundColor: theme.card,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="add" size={32} color={theme.subtext} />
                    <Text
                      style={[styles.addMediaLabel, { color: theme.subtext }]}
                    >
                      Add
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {media.length === 0 && (
            <Pressable
              onPress={pickMedia}
              style={({ pressed }) => [
                styles.mediaEmptyCard,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.mediaEmptyIcon,
                  { backgroundColor: theme.background },
                ]}
              >
                <Ionicons
                  name="images-outline"
                  size={28}
                  color={theme.primary}
                />
              </View>
              <Text style={[styles.mediaEmptyTitle, { color: theme.text }]}>
                Add photos or video
              </Text>
              <Text style={[styles.mediaEmptyHint, { color: theme.subtext }]}>
                Up to {MAX_MEDIA} files · gallery or camera below
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <View
          style={[
            styles.toolbar,
            {
              borderTopColor: theme.border,
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <View style={styles.toolbarIcons}>
            <ToolbarButton
              icon="images-outline"
              label="Gallery"
              theme={theme}
              onPress={pickMedia}
            />
            <ToolbarButton
              icon="camera-outline"
              label="Camera"
              theme={theme}
              onPress={takePhotoOrVideo}
            />
            <ToolbarButton
              icon="at"
              label="Mention"
              theme={theme}
              onPress={() => setCast((t) => `${t}@`)}
              isAt
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ToolbarButton({
  icon,
  label,
  theme,
  onPress,
  isAt,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  theme: { primary: string; text: string; card: string; subtext: string };
  onPress: () => void;
  isAt?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolBtn,
        { backgroundColor: theme.card },
        pressed && { opacity: 0.75 },
      ]}
    >
      {isAt ? (
        <Text style={[styles.atBtn, { color: theme.primary }]}>@</Text>
      ) : (
        <Ionicons name={icon} size={22} color={theme.primary} />
      )}
      <Text style={[styles.toolLabel, { color: theme.subtext }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 12,
    paddingBottom: 16,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  topBarSide: {
    width: 88,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  topBarSideRight: {
    alignItems: "flex-end",
  },
  topTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  postPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    minWidth: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  postPillText: {
    fontWeight: "700",
    fontSize: 14,
    paddingHorizontal: 10,
  },
  audienceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  audienceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 1,
  },
  audienceText: {
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
  charCount: {
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "#e5e5e5",
  },
  composerCol: {
    flex: 1,
    minHeight: 140,
  },
  displayName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  composerInput: {
    fontSize: 18,
    lineHeight: 26,
    minHeight: 120,
    padding: 0,
    textAlignVertical: "top",
  },
  mentionSheet: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    overflow: "hidden",
  },
  mentionHeader: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  mentionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  mentionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#eee",
  },
  mentionMeta: { flex: 1 },
  mentionNick: { fontSize: 14, fontWeight: "700" },
  mentionName: { fontSize: 12, marginTop: 2 },
  linkLoading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginTop: 14,
  },
  linkImage: {
    width: "100%",
    height: 150,
  },
  linkBody: {
    padding: 12,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  linkDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  linkUrl: {
    fontSize: 11,
    marginTop: 6,
  },
  linkRemove: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaSection: {
    marginTop: 18,
  },
  mediaSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  mediaSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  mediaSectionCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: MEDIA_GAP,
  },
  mediaGridSingle: {
    justifyContent: "center",
  },
  mediaTile: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  videoBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  mediaRemove: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
  },
  mediaRemoveInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  addMediaSlot: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addMediaLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  mediaEmptyCard: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: "center",
  },
  mediaEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  mediaEmptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  mediaEmptyHint: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  toolbar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingHorizontal: H_PAD,
  },
  toolbarIcons: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 10,
  },
  toolBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  toolLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  atBtn: {
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 22,
  },
});
