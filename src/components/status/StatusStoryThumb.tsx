import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import {
<<<<<<< HEAD
=======
  buildCloudinaryUrl,
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
  isVideoMedia,
  resolveMediaUrl,
} from "@/utils/mediaUtils";
import { useVideoThumbnail } from "@/utils/videoThumbnail";
import { STATUS_AVATAR_INSET } from "@/constants/statusTheme";

const DEFAULT_CAPTION_BG = "#075E54";
<<<<<<< HEAD
=======
const STORY_THUMB_TARGET_WIDTH = 180;
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408

type Props = {
  status: { media?: string[]; caption?: string; backgroundColor?: string } | null;
  ringSize: number;
};

/** Inner circle: latest story media, or caption on its chosen background. */
export function StatusStoryThumb({ status, ringSize }: Props) {
  const inset = STATUS_AVATAR_INSET;
  const inner = ringSize - inset * 2;
  const radius = inner / 2;

  const mediaRaw = status?.media?.[0];
  const mediaUrl = mediaRaw ? resolveMediaUrl(mediaRaw) : null;
  const isVideo = mediaUrl ? isVideoMedia(mediaUrl) : false;
  const thumbUri = useVideoThumbnail(isVideo ? mediaUrl ?? undefined : undefined);
  const caption = (status?.caption ?? "").trim();
  const bg = status?.backgroundColor?.trim() || DEFAULT_CAPTION_BG;

  const frameStyle = {
    position: "absolute" as const,
    top: inset,
    left: inset,
    width: inner,
    height: inner,
    borderRadius: radius,
    overflow: "hidden" as const,
  };

  if (mediaUrl) {
    const previewUri = isVideo ? thumbUri ?? mediaUrl : mediaUrl;
<<<<<<< HEAD
    const optimizedPreview = previewUri;
=======
    const optimizedPreview =
      buildCloudinaryUrl(previewUri, { width: STORY_THUMB_TARGET_WIDTH }) ??
      previewUri;
>>>>>>> 028b46649010975e10f1eb37987fd5cf1adb4408
    return (
      <View style={frameStyle}>
        <Image
          source={{ uri: optimizedPreview }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        {isVideo ? (
          <View style={styles.videoBadge} pointerEvents="none">
            <Ionicons name="play" size={12} color="#fff" />
          </View>
        ) : null}
      </View>
    );
  }

  if (caption) {
    return (
      <View style={[frameStyle, styles.captionFrame, { backgroundColor: bg }]}>
        <Text style={styles.captionText} numberOfLines={4}>
          {caption}
        </Text>
      </View>
    );
  }

  return <View style={[frameStyle, { backgroundColor: bg }]} />;
}

const styles = StyleSheet.create({
  captionFrame: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  captionText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 11,
    width: "100%",
  },
  videoBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 2,
  },
});
