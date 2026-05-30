import React from "react";
import { useUser } from "@clerk/clerk-expo";
import { useLevel } from "@/context/LevelContext";
import { AgoraRtcProvider } from "@/rtc/AgoraRtcContext";
import { registerCallVideoClient } from "@/utils/callSessionRegistry";
import { CallRingBridge } from "@/components/call/CallRingBridge";
import { useEffect } from "react";
import { useAgoraRtc } from "@/rtc/AgoraRtcContext";

function RegisterClient() {
  const { client } = useAgoraRtc();
  useEffect(() => {
    registerCallVideoClient(client as never);
    return () => registerCallVideoClient(null);
  }, [client]);
  return null;
}

/** Keeps Agora RTC connected for the whole signed-in app session. */
export function GlobalAgoraRtcProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const { userDetails } = useLevel();
  const clerkId = userDetails?.clerkId ?? user?.id;

  return (
    <AgoraRtcProvider userId={clerkId}>
      <RegisterClient />
      <CallRingBridge />
      {children}
    </AgoraRtcProvider>
  );
}

/** @deprecated Use GlobalAgoraRtcProvider */
export const GlobalStreamVideoProvider = GlobalAgoraRtcProvider;
