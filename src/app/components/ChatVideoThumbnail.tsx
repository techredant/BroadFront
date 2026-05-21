import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
type ChatVideoThumbnailProps = {
  thumb_url?: string;
  style?: object;
  imageStyle?: object;
};

export function ChatVideoThumbnail({
  thumb_url,
  style,
  imageStyle,
}: ChatVideoThumbnailProps) {
  if (!thumb_url) return null;

  return (
    <View style={[styles.root, style, imageStyle]}>
      <Image
        source={{ uri: thumb_url }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View style={styles.play}>
        <Ionicons name="play" size={28} color="#000" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: "hidden",
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  play: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3,
  },
});
