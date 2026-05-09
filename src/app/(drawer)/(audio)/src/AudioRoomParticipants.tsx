import React from "react";
import { useCallStateHooks } from "@stream-io/video-react-native-sdk";
import { StyleSheet, Text, View, FlatList, Image } from "react-native";
import { useTheme } from "@/context/ThemeContext";

export default function AudioRoomParticipants() {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();
  const { theme } = useTheme();

  if (!participants.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: theme.subtext }]}>
          No participants yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        numColumns={3}
        data={participants}
        keyExtractor={(item) => item.sessionId}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => {
          const hasImage = !!item.image;
          const displayName = item.name || "Guest";
          const initial = displayName.charAt(0).toUpperCase();

          return (
            <View style={styles.avatar}>
              {hasImage ? (
                <Image
                  style={[
                    styles.image,
                    item.isSpeaking && styles.activeSpeakerIndicator,
                  ]}
                  source={{ uri: item.image! }}
                />
              ) : (
                <View
                  style={[
                    styles.fallbackAvatar,
                    item.isSpeaking && styles.activeSpeakerIndicator,
                    { backgroundColor: theme.card },
                  ]}
                >
                  <Text style={[styles.initial, { color: theme.text }]}>{initial}</Text>
                </View>
              )}
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {displayName}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: 8,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 10,
  },
  avatar: {
    width: "31%",
    alignItems: "center",
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  fallbackAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontSize: 24,
    fontWeight: "700",
  },
  activeSpeakerIndicator: {
    borderWidth: 3,
    borderColor: "#22c55e",
  },
  name: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 80,
    textAlign: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
  },
});