import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { PostMediaGrid } from "./PostMediaGrid";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { formatNickHandle } from "@/utils/nickName";
import { PoliticalPalette } from "@/constants/politicalTheme";
import { useMediaViewer } from "@/context/MediaViewerContext";

const MAX_CHARS = 280;

interface ReciteModalProps {
  quoteVisible: boolean;
  setQuoteVisible: (visible: boolean) => void;
  handleRecite: (text: string) => void;
  loadingRecite: boolean;
  postCard: any;
  theme: any;
  mediaList: string[];
  mediaCount: number;
  width: number;
  itemSize: number;
}

const urlRegex = /(https?:\/\/[^\s]+)/g;
const extractUrls = (text: any = "") =>
  typeof text === "string" ? text.match(urlRegex) || [] : [];

function BriefingLinkCard({ preview, theme }: any) {
  if (!preview?.url) return null;

  return (
    <Pressable
      onPress={() => Linking.openURL(preview.url)}
      style={[styles.briefingCard, { borderColor: theme.border, backgroundColor: theme.background }]}
    >
      {!!preview.image && (
        <Image
          source={{ uri: preview.image }}
          style={styles.briefingImage}
          cachePolicy="memory-disk"
          contentFit="cover"
        />
      )}
      <View style={styles.briefingBody}>
        <Text style={[styles.briefingLabel, { color: PoliticalPalette.navy }]}>
          BRIEFING
        </Text>
        <Text numberOfLines={2} style={[styles.briefingTitle, { color: theme.text }]}>
          {preview.title || "External source"}
        </Text>
        {!!preview.description && (
          <Text numberOfLines={2} style={{ color: theme.subtext, marginTop: 4, fontSize: 11 }}>
            {preview.description}
          </Text>
        )}
        <Text numberOfLines={1} style={[styles.briefingUrl, { color: PoliticalPalette.navy }]}>
          {preview.url.replace(/^https?:\/\//, "")}
        </Text>
      </View>
    </Pressable>
  );
}

export function ReciteModal({
  quoteVisible,
  setQuoteVisible,
  handleRecite,
  loadingRecite,
  postCard,
  theme,
  mediaList,
  mediaCount,
  width,
}: ReciteModalProps) {
  const { openMediaViewer } = useMediaViewer();
  const [quoteText, setQuoteText] = useState("");
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});

  const isDisabled = quoteText.trim().length === 0;
  const charCount = quoteText.length;
  const gridWidth = width - 48;

  const openMedia = (index: number) => {
    openMediaViewer({
      posts: [{ ...postCard, media: mediaList }],
      postId: String(postCard?._id ?? postCard?.id ?? "recite-post"),
      mediaIndex: index,
    });
  };

  const originalText = postCard?.quote || postCard?.caption || "";
  const isExpanded = expandedStates[postCard._id];
  const toggleExpand = (id: string) => {
    setExpandedStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const linkPreview = Array.isArray(postCard?.linkPreview)
    ? postCard.linkPreview[0]
    : postCard?.linkPreview || null;
  const detectedUrl = !linkPreview ? extractUrls(originalText)[0] : null;

  const authorName =
    postCard?.reciteFirstName && postCard?.reciteLastName
      ? `${postCard.reciteFirstName} ${postCard.reciteLastName}`
      : postCard?.reciteCompanyName ||
        postCard?.user?.firstName ||
        "Original author";
  const authorHandle = formatNickHandle(
    postCard?.reciteNickName || postCard?.user?.nickName,
  );
  const authorImage = postCard?.reciteImage || postCard?.user?.image;

  useEffect(() => {
    if (!quoteVisible) {
      setQuoteText("");
    }
  }, [quoteVisible]);

  const onRecite = () => {
    if (!isDisabled && !loadingRecite) {
      handleRecite(quoteText.trim());
    }
  };

  return (
    <>
      <Modal
        visible={quoteVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setQuoteVisible(false)}
      >
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={["top"]}>
          {/* Header */}
          <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
            <View style={styles.handleBar} />
            <View style={styles.topBarRow}>
              <Pressable onPress={() => setQuoteVisible(false)} style={styles.iconBtn} hitSlop={12}>
                <Feather name="x" size={22} color={theme.text} />
              </Pressable>
              <View style={styles.topBarCenter}>
                <Text style={[styles.topTitle, { color: theme.text }]}>Recite</Text>
                <Text style={[styles.topSub, { color: theme.subtext }]}>
                  Share a statement with your audience
                </Text>
              </View>
              <View style={styles.iconBtn} />
            </View>
          </View>

          {/* Top composer */}
          <View
            style={[
              styles.composerTop,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.composerAccent} />
            <View style={styles.composerInner}>
              <View style={styles.composerMeta}>
                <View style={styles.reciteBadge}>
                  <MaterialCommunityIcons
                    name="format-quote-close"
                    size={14}
                    color={PoliticalPalette.navy}
                  />
                  <Text style={styles.reciteBadgeText}>YOUR RECITE</Text>
                </View>
                <Text
                  style={[
                    styles.charCount,
                    {
                      color:
                        MAX_CHARS - charCount < 20
                          ? PoliticalPalette.crimson
                          : theme.subtext,
                    },
                  ]}
                >
                  {charCount}/{MAX_CHARS}
                </Text>
              </View>

              <View
                style={[
                  styles.inputShell,
                  { backgroundColor: theme.background, borderColor: theme.border },
                ]}
              >
                <TextInput
                  value={quoteText}
                  onChangeText={setQuoteText}
                  placeholder="Add context to this statement…"
                  placeholderTextColor={theme.subtext}
                  multiline
                  autoFocus
                  maxLength={MAX_CHARS}
                  style={[styles.input, { color: theme.text }]}
                  textAlignVertical="top"
                />
              </View>

              <Pressable
                onPress={onRecite}
                disabled={isDisabled || loadingRecite}
                style={[
                  styles.reciteBtn,
                  {
                    backgroundColor:
                      isDisabled || loadingRecite
                        ? theme.border
                        : PoliticalPalette.navy,
                  },
                ]}
              >
                {loadingRecite ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="repeat" size={18} color="#fff" />
                    <Text style={styles.reciteBtnText}>Publish recite</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={[styles.sectionLabel, { color: theme.subtext }]}>
              ORIGINAL STATEMENT
            </Text>

            <View
              style={[
                styles.quoteCard,
                { borderColor: theme.border, backgroundColor: theme.card },
              ]}
            >
              <View style={styles.quoteHeader}>
                <Image
                  source={{ uri: authorImage }}
                  style={styles.avatar}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                />
                <View style={styles.authorMeta}>
                  <Text style={[styles.authorName, { color: theme.text }]} numberOfLines={1}>
                    {authorName}
                  </Text>
                  <Text style={[styles.authorHandle, { color: theme.subtext }]}>
                    {authorHandle}
                  </Text>
                </View>
              </View>

              {!!originalText && (
                <>
                  <Text
                    numberOfLines={isExpanded ? undefined : 5}
                    style={[styles.quoteBody, { color: theme.text }]}
                  >
                    {originalText}
                  </Text>
                  {originalText.length > 120 && (
                    <TouchableOpacity onPress={() => toggleExpand(postCard._id)}>
                      <Text style={[styles.readMore, { color: PoliticalPalette.navy }]}>
                        {isExpanded ? "Show less" : "Read full statement"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {linkPreview && <BriefingLinkCard preview={linkPreview} theme={theme} />}

              {!linkPreview && detectedUrl && (
                <Pressable
                  onPress={() => Linking.openURL(detectedUrl)}
                  style={[styles.urlChip, { borderColor: theme.border }]}
                >
                  <Feather name="external-link" size={14} color={PoliticalPalette.navy} />
                  <Text
                    numberOfLines={1}
                    style={[styles.urlText, { color: PoliticalPalette.navy }]}
                  >
                    {detectedUrl}
                  </Text>
                </Pressable>
              )}

              {mediaCount > 0 && (
                <View style={styles.mediaWrap}>
                  <PostMediaGrid
                    uris={mediaList}
                    containerWidth={gridWidth}
                    onPressItem={openMedia}
                    tileRadius={10}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.45)",
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  topBarCenter: { flex: 1, alignItems: "center" },
  topTitle: { fontSize: 16, fontWeight: "800" },
  topSub: { fontSize: 11, marginTop: 2, fontWeight: "600", textAlign: "center" },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  composerTop: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
  },
  composerAccent: {
    width: 4,
    backgroundColor: PoliticalPalette.gold,
  },
  composerInner: { flex: 1, padding: 12 },
  composerMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reciteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PoliticalPalette.goldSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  reciteBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: PoliticalPalette.navy,
  },
  charCount: { fontSize: 10, fontWeight: "600" },
  inputShell: {
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 88,
    maxHeight: 140,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 68,
    maxHeight: 120,
  },
  reciteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 12,
  },
  reciteBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  quoteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    overflow: "hidden",
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  authorMeta: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: "800" },
  authorHandle: { fontSize: 11, marginTop: 2, fontWeight: "600" },
  quoteBody: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
  readMore: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
  },
  briefingCard: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  briefingImage: { width: "100%", height: 140 },
  briefingBody: { padding: 10 },
  briefingLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  briefingTitle: { fontSize: 13, fontWeight: "800" },
  briefingUrl: { marginTop: 6, fontSize: 10, fontWeight: "600" },
  urlChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  urlText: { flex: 1, fontSize: 11, fontWeight: "600" },
  mediaWrap: { marginTop: 12 },
});
