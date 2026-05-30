import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import { useLevel } from "@/context/LevelContext";
import { fetchStreamToken } from "@/utils/streamToken";
import { registerCallVideoClient } from "@/utils/callSessionRegistry";
import { CallRingBridge } from "@/components/call/CallRingBridge";

const apiKey = process.env.EXPO_PUBLIC_STREAM_API_KEY!;
const STREAM_USER_KEY = "@broadcast/stream_push_user";

/** Keeps Stream Video connected for the whole signed-in app session. */
export function GlobalStreamVideoProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userDetails } = useLevel();
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const clientRef = useRef<StreamVideoClient | null>(null);

  useEffect(() => {
    const clerkId = userDetails?.clerkId;
    if (!clerkId) {
      setVideoClient(null);
      registerCallVideoClient(null);
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const displayName =
          `${userDetails.firstName ?? ""} ${userDetails.lastName ?? ""} ${userDetails.companyName ?? ""} ${userDetails.nickName ?? ""}`.trim() ||
          clerkId;

        const client = StreamVideoClient.getOrCreateInstance({
          apiKey,
          user: {
            id: clerkId,
            name: displayName,
            image: userDetails.image,
          },
          tokenProvider: () =>
            fetchStreamToken({
              userId: clerkId,
              name: displayName,
              image: userDetails.image,
            }),
        });

        void AsyncStorage.setItem(
          STREAM_USER_KEY,
          JSON.stringify({
            id: clerkId,
            name: displayName,
            image: userDetails.image,
          }),
        );

        if (!cancelled) {
          clientRef.current = client;
          registerCallVideoClient(client);
          setVideoClient(client);
        }
      } catch (err) {
        console.error("Failed to initialize global Stream Video:", err);
      }
    };

    void init();

    return () => {
      cancelled = true;
      clientRef.current?.disconnectUser().catch(() => {});
      clientRef.current = null;
      registerCallVideoClient(null);
      setVideoClient(null);
    };
  }, [
    userDetails?.clerkId,
    userDetails?.firstName,
    userDetails?.lastName,
    userDetails?.companyName,
    userDetails?.nickName,
    userDetails?.image,
  ]);

  if (!videoClient) {
    return <>{children}</>;
  }

  return (
    <StreamVideo client={videoClient}>
      <CallRingBridge />
      {children}
    </StreamVideo>
  );
}
