import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  remoteName: string;
  remoteImage?: string;
  isCaller: boolean;
  isVideoCall: boolean;
  controls: React.ReactNode;
};

export function BroadcastRingingCall({
  remoteName,
  remoteImage,
  isCaller,
  isVideoCall,
  controls,
}: Props) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        {remoteImage ? (
          <Image
            source={{ uri: remoteImage }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={44} color="rgba(255,255,255,0.9)" />
          </View>
        )}
        <Text style={styles.name} numberOfLines={2}>
          {remoteName}
        </Text>
        <Text style={styles.status}>
          {isCaller
            ? isVideoCall
              ? "Video calling…"
              : "Calling…"
            : isVideoCall
              ? "Incoming video call…"
              : "Incoming call…"}
        </Text>
        <View style={styles.controls}>{controls}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0b0b0f",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  name: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  status: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 36,
  },
  controls: {
    width: "100%",
    alignItems: "center",
  },
});
