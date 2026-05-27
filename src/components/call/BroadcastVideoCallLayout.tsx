import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import {
  ParticipantView,
  useCallStateHooks,
} from "@stream-io/video-react-native-sdk";
import { BroadcastFloatingLocalVideo } from "@/components/call/BroadcastFloatingLocalVideo";
import { BroadcastParticipantLabel } from "@/components/call/BroadcastParticipantLabel";

type RemotePeer = {
  name: string;
  image?: string;
};

type Props = {
  displayNames: Record<string, string>;
  remotePeer: RemotePeer;
};

/** WhatsApp-style 1:1 video: remote full screen, local mini window top-right. */
export function BroadcastVideoCallLayout({
  displayNames,
  remotePeer,
}: Props) {
  const { useLocalParticipant, useRemoteParticipants } = useCallStateHooks();
  const localParticipant = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const remoteParticipant = remoteParticipants[0];

  return (
    <View style={styles.root}>
      {remoteParticipant ? (
        <ParticipantView
          participant={remoteParticipant}
          style={styles.stage}
          objectFit="cover"
          ParticipantLabel={(props) => (
            <BroadcastParticipantLabel
              {...props}
              displayNames={displayNames}
            />
          )}
        />
      ) : localParticipant ? (
        <ParticipantView
          participant={localParticipant}
          style={styles.stage}
          objectFit="cover"
          mirror
          ParticipantLabel={null}
        />
      ) : (
        <WaitingForRemote remotePeer={remotePeer} />
      )}

      {localParticipant && remoteParticipant ? (
        <BroadcastFloatingLocalVideo
          participant={localParticipant}
          objectFit="cover"
          mirror
          ParticipantLabel={null}
        />
      ) : null}
    </View>
  );
}

function WaitingForRemote({ remotePeer }: { remotePeer: RemotePeer }) {
  return (
    <View style={styles.waiting}>
      {remotePeer.image ? (
        <Image
          source={{ uri: remotePeer.image }}
          style={styles.avatar}
          contentFit="cover"
        />
      ) : (
        <View style={styles.avatarFallback}>
          <Ionicons name="person" size={48} color="#fff" />
        </View>
      )}
      <Text style={styles.waitingName}>{remotePeer.name}</Text>
      <ActivityIndicator color="#3797F0" style={styles.spinner} />
      <Text style={styles.waitingText}>Connecting video…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
    borderWidth: 0,
  },
  waiting: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#0b0b0f",
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  avatarFallback: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  waitingName: {
    marginTop: 16,
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  spinner: {
    marginTop: 20,
  },
  waitingText: {
    marginTop: 10,
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
    fontWeight: "500",
  },
});
