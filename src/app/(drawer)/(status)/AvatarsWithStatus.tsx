import { View, Image, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

interface AvatarWithStatusProps {
  imageUrl?: string;
  hasStatus?: boolean;
  size?: number;
  onPress?: () => void;
}

export function AvatarWithStatus({
  imageUrl,
  hasStatus = false,
  size = 56,
  onPress,
}: AvatarWithStatusProps) {
  const fallbackImage =
    "https://ui-avatars.com/api/?name=User&background=22c55e&color=fff";

  return (
    <Pressable
      onPress={onPress || (() => router.push("/StatusInput"))}
      hitSlop={10}
      style={{ alignItems: "center", width: size + 20, marginTop: 10 }}
    >
      <View style={{ width: size, height: size }}>
        {/* Ring */}
        <View
          style={{
            position: "absolute",
            width: size + 6,
            height: size + 6,
            borderRadius: (size + 6) / 2,
            borderWidth: 2,
            borderColor: hasStatus ? "#f43f5e" : "#E5E7EB",
            alignSelf: "center",
            top: -3,
          }}
        />

        {/* Avatar */}
        <Image
          source={{ uri: imageUrl || fallbackImage }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: "#eee",
            alignSelf: "center",
          }}
        />

        {/* Plus badge */}
        {!hasStatus && (
          <View style={styles.plusBadge}>
            <Feather name="plus" size={12} color="#fff" />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  plusBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#22c55e",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
