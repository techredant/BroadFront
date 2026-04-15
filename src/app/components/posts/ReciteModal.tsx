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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import Video from "react-native-video";
import { MediaViewerModal } from "./MediaViewModal";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";

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
                      @{postCard.reciteNickName || postCard.user?.nickName}
                    </Text>
                  </View>
                </View>

                <Text numberOfLines={3} style={styles.caption}>
                  {postCard.caption}
                </Text>
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
