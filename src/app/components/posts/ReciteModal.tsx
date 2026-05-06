// reciteModal.tsx

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import Video from "react-native-video";
import { MediaViewerModal } from "./MediaViewModal";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

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

/* ---------------- FACEBOOK STYLE LINK CARD ---------------- */
function LinkPreviewCard({ preview, theme }: any) {
  if (!preview?.url) return null;

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
      {!!preview.image && (
        <Image
          source={{ uri: preview.image }}
          style={{ width: "100%", height: 180 }}
        />
      )}

      <View style={{ padding: 10 }}>
        <Text
          numberOfLines={2}
          style={{ fontWeight: "700", color: theme.text }}
        >
          {preview.title || "Link"}
        </Text>

        {!!preview.description && (
          <Text
            numberOfLines={2}
            style={{ color: theme.subtext, marginTop: 4 }}
          >
            {preview.description}
          </Text>
        )}

        <Text
          numberOfLines={1}
          style={{ color: theme.primary, marginTop: 6, fontSize: 12 }}
        >
          {preview.url}
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
  itemSize,
}: ReciteModalProps) {
  const styles = createStyles(theme);

  const [quoteText, setQuoteText] = useState("");
  const [inputHeight, setInputHeight] = useState(80);
  const [isMuted, setIsMuted] = useState(true); // default mute

  const isDisabled = quoteText.trim().length === 0;
  const charsLeft = MAX_CHARS - quoteText.length;

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [expandedStates, setExpandedStates] = useState<{
    [key: string]: boolean;
  }>({});

  // /* ---------------- PINCH ZOOM ---------------- */
  const pinchScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      pinchScale.value = e.scale;
    })
    .onEnd(() => {
      pinchScale.value = withSpring(1);
    });

  const pinchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pinchScale.value }],
  }));

  const openMedia = (index: number) => {
    setSelectedIndex(index);
    setModalVisible(true);
  };
  const text = postCard.quote ? postCard.quote : postCard.caption;
  const isExpanded = expandedStates[postCard._id];

  const toggleExpand = (postId: string) => {
    setExpandedStates((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const detectedUrl = extractUrls(postCard.linkPreview)[0];

    const linkPreview = Array.isArray(postCard.linkPreview)
      ? postCard.linkPreview[0]
      : postCard.linkPreview || null;

  return (
    <>
      <Modal
        visible={quoteVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setQuoteVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          {/* HEADER */}
          <View style={styles.header}>
            <Pressable onPress={() => setQuoteVisible(false)}>
              <Feather name="x" size={28} color={theme.text} />
            </Pressable>

            <Text style={styles.headerTitle}>Recite</Text>

            <Pressable
              onPress={() => handleRecite(quoteText)}
              disabled={isDisabled || loadingRecite}
              style={{ marginLeft: "auto" }}
            >
              <Text
                style={[
                  styles.postBtn,
                  (isDisabled || loadingRecite) && { opacity: 0.4 },
                ]}
              >
                {loadingRecite ? "Reciting..." : "Recite"}
              </Text>
            </Pressable>
          </View>

          {/* STICKY INPUT */}
          <View style={styles.inputWrapper}>
            <TextInput
              value={quoteText}
              onChangeText={(text) => {
                setQuoteText(text);
              }}
              placeholder="Add your thoughts…"
              placeholderTextColor={theme.subtext}
              multiline
              autoFocus
              onContentSizeChange={(e) =>
                setInputHeight(Math.max(80, e.nativeEvent.contentSize.height))
              }
              style={[styles.input, { height: inputHeight }]}
            />

            <View style={styles.counterRow}>
              <Text
                style={{
                  color: charsLeft < 20 ? "#DC2626" : theme.subtext,
                  fontSize: 12,
                }}
              >
                {charsLeft}
              </Text>
            </View>
          </View>

          {/* CONTENT */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.previewCard}>
                <View style={styles.userRow}>
                  <Image
                    source={{
                      uri: postCard.reciteImage || postCard.user?.image,
                    }}
                    style={styles.avatar}
                  />
                  <View>
                    <Text style={styles.name}>
                      {postCard.reciteFirstName || postCard.user?.firstName}
                    </Text>
                    <Text style={styles.username}>
                      {postCard.reciteNickName || postCard.user?.nickName}
                    </Text>
                  </View>
                </View>

                <Text
                  numberOfLines={isExpanded ? undefined : 3}
                  style={{
                    color: theme.text,
                    paddingHorizontal: 12,
                    marginTop: 6,
                  }}
                >
                  {text}
                </Text>
                {text && text.length > 80 && (
                  <TouchableOpacity
                    onPress={() => toggleExpand(postCard._id)}
                    style={{ zIndex: 20, padding: 4 }}
                  >
                    <Text
                      style={{
                        color: theme.primary,
                        paddingHorizontal: 12,
                        marginTop: 4,
                        fontWeight: "600",
                      }}
                    >
                      {isExpanded ? "Show less" : "Show more"}
                    </Text>
                  </TouchableOpacity>
                )}
                {linkPreview && (
                  <LinkPreviewCard preview={linkPreview} theme={theme} />
                )}

                {/* 2. fallback: just URL (Facebook behavior) */}
                {!linkPreview && detectedUrl && (
                  <Pressable
                    onPress={() => Linking.openURL(detectedUrl)}
                    style={{
                      marginHorizontal: 12,
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                    }}
                  >
                    <Text style={{ color: theme.primary }}>{detectedUrl}</Text>
                  </Pressable>
                )}

                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {mediaList.slice(0, 4).map((uri: string, idx: number) => {
                    const remaining = mediaCount - 4;
                    const isLast = idx === 3 && remaining > 0;

                    const isSingle = mediaCount === 1;
                    const widthStyle = isSingle ? width - 28 : itemSize;
                    const heightStyle = isSingle ? 400 : itemSize;

                    const isVideo =
                      uri.endsWith(".mp4") || uri.endsWith(".mov");

                    return (
                      <Pressable
                        key={uri}
                        onPress={() => openMedia(idx)}
                        style={{
                          width: widthStyle,
                          height: heightStyle,
                          margin: 2,
                          borderRadius: 12,
                          overflow: "hidden",
                          position: "relative",
                          backgroundColor: "#000",
                        }}
                      >
                        {isVideo ? (
                          <>
                            <Video
                              source={{ uri }}
                              style={{ width: "100%", height: "100%" }}
                              resizeMode="cover"
                              muted={isMuted}
                              controls
                              pointerEvents="none" // ✅ allows touches to go through
                            />
                            {/* Transparent overlay to catch press */}
                            <TouchableOpacity
                              style={{
                                position: "absolute",
                                top: 10,
                                right: 10,
                                backgroundColor: "rgba(0,0,0,0.4)",
                                borderRadius: 20,
                                padding: 6,
                              }}
                              onPress={() => setIsMuted((prev) => !prev)}
                            >
                              <Ionicons
                                name={isMuted ? "volume-mute" : "volume-high"}
                                size={20}
                                color="#fff"
                              />
                            </TouchableOpacity>
                            <View
                              style={{
                                ...StyleSheet.absoluteFillObject,
                              }}
                            />
                          </>
                        ) : (
                          <Image
                            source={{ uri }}
                            style={{ width: "100%", height: "100%" }}
                          />
                        )}

                        {isLast && (
                          <View
                            style={{
                              ...StyleSheet.absoluteFillObject,
                              backgroundColor: "rgba(0,0,0,0.55)",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                color: "#fff",
                                fontSize: 32,
                                fontWeight: "bold",
                              }}
                            >
                              +{remaining}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* MEDIA MODAL */}
      <MediaViewerModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        mediaList={mediaList}
        selectedIndex={selectedIndex}
        post={postCard}
        pinchGesture={pinchGesture}
        pinchStyle={pinchStyle}
      />
    </>
  );
}

const createStyles = (theme: {
  border: any;
  text: any;
  primary: any;
  subtext: any;
  card: any;
}) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },

    headerTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 12,
    },

    postBtn: {
      color: theme.primary,
      fontWeight: "700",
      fontSize: 15,
    },

    inputWrapper: {
      paddingHorizontal: 16,
      paddingTop: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },

    replyingTo: {
      fontSize: 12,
      color: theme.subtext,
      marginBottom: 6,
    },

    input: {
      fontSize: 16,
      color: theme.text,
      textAlignVertical: "top",
    },

    counterRow: {
      alignItems: "flex-end",
      paddingVertical: 4,
    },

    previewCard: {
      padding: 12,
      backgroundColor: theme.card,
    },

    userRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 10,
    },

    name: {
      color: theme.text,
      fontWeight: "600",
    },

    username: {
      color: theme.subtext,
      fontSize: 13,
    },

    caption: {
      marginTop: 10,
      color: theme.text,
      lineHeight: 20,
    },
  });
