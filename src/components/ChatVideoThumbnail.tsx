import {
  View,
  StyleSheet,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
type ChatVideoThumbnailProps = {
  thumb_url?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export function ChatVideoThumbnail({
  thumb_url,
  style,
  imageStyle,
}: ChatVideoThumbnailProps) {
  return (
    <View style={[styles.root, style]}>
      {!!thumb_url && (
        <Image
          source={{ uri: thumb_url }}
          style={[StyleSheet.absoluteFill, imageStyle]}
          contentFit="cover"
        />
      )}
      {!!thumb_url && (
        <View style={styles.play}>
          <Ionicons name="play" size={28} color="#000" />
        </View>
      )}
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
