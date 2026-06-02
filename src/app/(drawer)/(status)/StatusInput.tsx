import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLevel } from "@/context/LevelContext";
import * as ImagePicker from "expo-image-picker";
import { uploadMediaItems } from "@/utils/mediaUpload";
import { imagePickerMediaOptions } from "@/utils/mediaUtils";
import Video from "react-native-video";
import { Image } from "expo-image";
import { WA_GREEN } from "@/constants/statusTheme";
import { postStatusWithOptimistic } from "@/utils/statusUpload";
import { refreshStatusList } from "@/utils/statusList";
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const TEXT_BACKGROUNDS = [
  "#075E54",
  "#128C7E",
  "#25D366",
  "#34B7F1",
  "#9C27B0",
  "#E91E63",
  "#FF5722",
  "#795548",
  "#607D8B",
  "#1a1a2e",
];

export default function StatusInput() {
  const [status, setStatus] = useState("");
  const [bgIndex, setBgIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const { userDetails } = useLevel();
  const insets = useSafeAreaInsets();
  const [media, setMedia] = useState<
    { uri: string; type: "image" | "video" }[]
  >([]);

  const hasMedia = media.length > 0;
  const canPost = status.trim().length > 0 || hasMedia;
  const bgColor = hasMedia ? "#000" : TEXT_BACKGROUNDS[bgIndex];

  const handlePostStatus = async () => {
    if (!canPost || loading) return;

    try {
      setLoading(true);

      await postStatusWithOptimistic(
        media,
        {
          userId: userDetails?.clerkId ?? "",
          lastName: userDetails?.lastName,
          firstName: userDetails?.firstName,
          companyName: userDetails?.companyName,
          nickName: userDetails?.nickName,
          image: userDetails?.image,
          caption: status.trim(),
          backgroundColor: TEXT_BACKGROUNDS[bgIndex],
        },
        uploadMediaItems,
      );

      void refreshStatusList({
        force: true,
        viewerId: userDetails?.clerkId,
      });

      setStatus("");
      setMedia([]);
      router.replace("/(drawer)/(tabs)");
    } catch (err: any) {
      console.log("POST STATUS ERROR:", err?.message);
    } finally {
      setLoading(false);
    }
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: false,
      ...imagePickerMediaOptions,
    });

    if (!result.canceled && result.assets[0]) {
      setMedia([
        {
          uri: result.assets[0].uri,
          type: result.assets[0].type as "image" | "video",
        },
      ]);
    }
  };

  const takePhotoOrVideo = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      ...imagePickerMediaOptions,
    });

    if (!result.canceled && result.assets[0]) {
      setMedia([
        {
          uri: result.assets[0].uri,
          type: result.assets[0].type as "image" | "video",
        },
      ]);
    }
  };

  const removeMedia = () => setMedia([]);

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconBtn}
            hitSlop={12}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.topActions}>
            {!hasMedia && (
              <TouchableOpacity
                onPress={() => setShowPalette((p) => !p)}
                style={styles.iconBtn}
              >
                <Ionicons name="color-palette-outline" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              disabled={!canPost || loading}
              onPress={handlePostStatus}
              style={[styles.sendBtn, { opacity: canPost ? 1 : 0.4 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {hasMedia ? (
          <View style={styles.mediaStage}>
            {media[0].type === "image" ? (
              <Image
                source={{ uri: media[0].uri }}
                style={styles.fullMedia}
                contentFit="contain"
              />
            ) : (
              <Video
                source={{ uri: media[0].uri }}
                style={styles.fullMedia}
                resizeMode="contain"
                repeat
                muted={false}
              />
            )}
            <TouchableOpacity style={styles.mediaClose} onPress={removeMedia}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.textStage}>
            <TextInput
              value={status}
              onChangeText={setStatus}
              placeholder="Type a status"
              placeholderTextColor="rgba(255,255,255,0.55)"
              style={styles.textInput}
              multiline
              autoFocus
              maxLength={700}
            />
          </View>
        )}

        {/* Color palette (text status) */}
        {showPalette && !hasMedia && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.palette}
          >
            {TEXT_BACKGROUNDS.map((color, index) => (
              <TouchableOpacity
                key={color}
                onPress={() => {
                  setBgIndex(index);
                  setShowPalette(false);
                }}
                style={[
                  styles.colorDot,
                  {
                    backgroundColor: color,
                    borderWidth: bgIndex === index ? 3 : 0,
                    borderColor: "#fff",
                  },
                ]}
              />
            ))}
          </ScrollView>
        )}

        {/* Bottom tools */}
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {hasMedia ? (
            <TextInput
              value={status}
              onChangeText={setStatus}
              placeholder="Add a caption…"
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={styles.captionInput}
              multiline
            />
          ) : (
            <View style={styles.tools}>
              <TouchableOpacity style={styles.tool} onPress={pickMedia}>
                <Ionicons name="images-outline" size={26} color="#fff" />
                <Text style={styles.toolLabel}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tool} onPress={takePhotoOrVideo}>
                <Ionicons name="camera-outline" size={26} color="#fff" />
                <Text style={styles.toolLabel}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tool}
                onPress={() => setShowPalette((p) => !p)}
              >
                <Ionicons name="text-outline" size={26} color="#fff" />
                <Text style={styles.toolLabel}>Text</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    zIndex: 10,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WA_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  textStage: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  textInput: {
    color: "#fff",
    fontSize: 31,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 42,
    minHeight: 120,
  },
  mediaStage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullMedia: {
    width: SCREEN_W,
    height: SCREEN_H * 0.65,
  },
  mediaClose: {
    position: "absolute",
    top: 8,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  palette: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  captionInput: {
    color: "#fff",
    fontSize: 15,
    minHeight: 44,
    maxHeight: 100,
  },
  tools: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  tool: {
    alignItems: "center",
    gap: 6,
  },
  toolLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
  },
});
