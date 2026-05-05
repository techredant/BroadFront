// EditModal.tsx
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
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "@clerk/clerk-expo";

const MAX_CHARS = 280;

interface EditModalProps {
  editVisible: boolean;
  setEditVisible: (visible: boolean) => void;
  handleEdit: (data: {
    caption?: string;
    quote?: string;
    media: string[];
  }) => void;
  loadingEdit: boolean;
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

export function EditModal({
  editVisible,
  setEditVisible,
  handleEdit,
  loadingEdit,
  postCard,
  theme,
  mediaList,
  mediaCount,
  width,
  itemSize,
}: EditModalProps) {
  const styles = createStyles(theme);

  const [editText, setEditText] = useState("");
  const [inputHeight, setInputHeight] = useState(80);
  const [isMuted, setIsMuted] = useState(true); // default mute

  const isDisabled = editText.trim().length === 0;
  const charsLeft = MAX_CHARS - editText.length;
  const [image, setImage] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editedMedia, setEditedMedia] = useState<string[]>([]);
  const [editLinkPreview, setEditLinkPreview] = useState<any>(null);

  const normalizePreview = (preview: any) => {
    if (!preview) return null;
    if (Array.isArray(preview)) return preview.length ? preview[0] : null;
    return preview;
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos", "images"],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newMedia = result.assets.map((a) => a.uri);

      setEditedMedia((prev) => [...prev, ...newMedia]);
    }
  };

  const uploadToCloudinary = async (uri: string) => {
    const data = new FormData();

    data.append("file", {
      uri,
      type: "image/jpeg",
      name: "profile.jpg",
    } as any);

    data.append("upload_preset", "MediaCast");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/ds25oyyqo/image/upload",
      {
        method: "POST",
        body: data,
      },
    );

    const result = await res.json();
    return result.secure_url;
  };

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
  const { user } = useUser();

  const isQuotePost = !!postCard.quote;

  useEffect(() => {
    if (editVisible) {
      setEditText(postCard.quote ?? postCard.caption ?? "");
      setEditedMedia(postCard.media || []);
      setEditLinkPreview(normalizePreview(postCard.linkPreview));
    }
  }, [editVisible, postCard]);

  useEffect(() => {
    const url = extractUrls(editText)[0];

    if (!url) {
      setEditLinkPreview(null);
      return;
    }

    // optional: reuse existing preview if same URL
    if (editLinkPreview?.url === url) return;

    setEditLinkPreview({
      url,
      title: url,
      description: "",
      image: null,
    });
  }, [editText]);

  const isOwner = postCard?.reciteUserId === user?.id;
  const detectedUrl = extractUrls(postCard.linkPreview)[0];

  const linkPreview = Array.isArray(postCard.linkPreview)
    ? postCard.linkPreview[0]
    : postCard.linkPreview || null;

  return (
    <>
      <Modal
        visible={editVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          {/* HEADER */}
          <View style={styles.header}>
            <Pressable onPress={() => setEditVisible(false)}>
              <Feather name="x" size={28} color={theme.text} />
            </Pressable>

            <Text style={styles.headerTitle}>Edit</Text>

            <Pressable
              onPress={() =>
                handleEdit(
                  isQuotePost
                    ? {
                        quote: editText,
                        media: editedMedia,
                        // linkPreview: editLinkPreview, // 👈 ADD
                      }
                    : {
                        caption: editText,
                        media: editedMedia,
                        // linkPreview: editLinkPreview, // 👈 ADD
                      },
                )
              }
              disabled={isDisabled || loadingEdit}
              style={{ marginLeft: "auto" }}
            >
              <Text
                style={[
                  styles.postBtn,
                  (isDisabled || loadingEdit) && { opacity: 0.4 },
                ]}
              >
                {loadingEdit ? "Editing..." : "Edit"}
              </Text>
            </Pressable>
          </View>

          {/* CONTENT */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.previewCard}>
                <TextInput
                  value={editText}
                  onChangeText={(text) => {
                    setEditText(text);
                  }}
                  placeholderTextColor={theme.subtext}
                  multiline
                  autoFocus
                  onContentSizeChange={(e) =>
                    setInputHeight(
                      Math.max(80, e.nativeEvent.contentSize.height),
                    )
                  }
                  style={[styles.input, { height: inputHeight }]}
                />
                {isOwner && (
                  <Pressable onPress={pickMedia}>
                    <Text style={{ color: theme.primary }}>Add Media</Text>
                  </Pressable>
                )}
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {editedMedia.map((uri: string, idx: number) => {
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
                            {isOwner && (
                              <TouchableOpacity
                                style={{
                                  position: "absolute",
                                  top: 8,
                                  left: 8,
                                  backgroundColor: "rgba(0,0,0,0.6)",
                                  borderRadius: 20,
                                  padding: 6,
                                  zIndex: 99,
                                  opacity: isOwner ? 1 : 0,
                                }}
                                onPress={() => {
                                  setEditedMedia((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  );
                                }}
                              >
                                <Feather
                                  name="trash-2"
                                  size={16}
                                  color="#fff"
                                />
                              </TouchableOpacity>
                            )}
                          </>
                        ) : (
                          <>
                            <Image
                              source={{ uri }}
                              style={{ width: "100%", height: "100%" }}
                            />
                            {isOwner && (
                              <TouchableOpacity
                                style={{
                                  position: "absolute",
                                  top: 8,
                                  left: 8,
                                  backgroundColor: "rgba(0,0,0,0.6)",
                                  borderRadius: 20,
                                  padding: 6,
                                  zIndex: 99,
                                  opacity: isOwner ? 1 : 0,
                                }}
                                onPress={() => {
                                  setEditedMedia((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  );
                                }}
                              >
                                <Feather
                                  name="trash-2"
                                  size={16}
                                  color="#fff"
                                />
                              </TouchableOpacity>
                            )}
                          </>
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
                {postCard?.quote && (
                  <Text style={styles.caption}>{postCard.caption}</Text>
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
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* MEDIA MODAL */}
      <MediaViewerModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        mediaList={editedMedia}
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

    linkPreview: {
      borderWidth: 1,
      borderRadius: 12,
      overflow: "hidden",
      marginVertical: 12,
      flexDirection: "row",
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
    linkTitle: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 4,
    },
    linkDesc: {
      fontSize: 12,
      marginBottom: 4,
    },
    linkUrl: {
      fontSize: 11,
    },
    linkClose: {
      padding: 8,
      justifyContent: "center",
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
