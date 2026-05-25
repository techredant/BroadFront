import { useCallback, useEffect, useMemo, useRef } from "react";
import { useUser } from "@clerk/clerk-expo";
import {
  Chat,
  OverlayProvider,
  useCreateChatClient,
} from "stream-chat-expo";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { getStreamTheme } from "@/lib/theme";
import { ChatStreamImage } from "@/components/ChatStreamImage";
import { ChatMemberProfilesProvider } from "@/context/ChatMemberProfilesContext";
import { API_PUBLIC_URL } from "@/constants/api";
import {
  buildStreamDisplayName,
  upsertStreamUser,
} from "@/utils/streamUser";

const API_URL = API_PUBLIC_URL;
const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY!;

async function getStreamToken(userId: string, userDetail: any) {
  const res = await fetch(`${API_URL}/api/stream/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      name: `${userDetail?.firstName ?? ""} ${userDetail?.lastName ?? ""} ${userDetail?.nickName ?? ""} ${userDetail?.companyName ?? ""}`.trim(),
      image: userDetail?.image,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token fetch failed: ${res.status}`);
  }

  const data = await res.json();

  if (!data.token) {
    throw new Error("No token returned from backend");
  }

  return data.token;
}

type ChatWrapperProps = {
  userDetail: any;
  children: React.ReactNode;
};

function buildDisplayName(userDetail: any, userId: string) {
  if (!userDetail) return "Member";
  return buildStreamDisplayName({
    clerkId: userId,
    firstName: userDetail.firstName,
    lastName: userDetail.lastName,
    companyName: userDetail.companyName,
    nickName: userDetail.nickName,
  });
}

function ConnectedChat({
  userId,
  userDetail,
  children,
}: {
  userId: string;
  userDetail: any;
  children: React.ReactNode;
}) {
  const { theme, isDark } = useTheme();
  const userDetailRef = useRef(userDetail);
  userDetailRef.current = userDetail;

  // Only reconnect when the signed-in user changes — not on every profile field update.
  const userData = useMemo(
    () => ({
      id: userId,
      name: buildDisplayName(userDetail, userId),
      image: userDetail?.image,
    }),
    [userId],
  );

  // Must be referentially stable or useCreateChatClient reconnects in a loop.
  const tokenProvider = useCallback(
    () => getStreamToken(userId, userDetailRef.current),
    [userId],
  );

  const chatClient = useCreateChatClient({
    apiKey: STREAM_API_KEY,
    userData,
    tokenOrProvider: tokenProvider,
  });

  useEffect(() => {
    if (!chatClient || !userId) return;

    const displayName = buildDisplayName(userDetailRef.current, userId);
    void upsertStreamUser({
      userId,
      name: displayName,
      image: userDetailRef.current?.image,
    }).catch(() => {});

    const onMessage = (event: { message?: { id?: string; text?: string; user?: { id?: string; name?: string } }; cid?: string }) => {
      const msg = event.message;
      const senderId = msg?.user?.id;
      if (!msg?.id || !senderId || senderId !== userId) return;

      const channelId = event.cid?.includes(":")
        ? event.cid.split(":")[1]
        : undefined;
      if (!channelId) return;

      void fetch(`${API_PUBLIC_URL}/api/stream/notify-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: msg.id,
          channelId,
          channelType: "messaging",
          senderId,
          text: msg.text,
          senderName: msg.user?.name,
        }),
      }).catch(() => {});
    };

    chatClient.on("message.new", onMessage);
    return () => {
      chatClient.off("message.new", onMessage);
    };
  }, [chatClient, userId]);

  const streamTheme = useMemo(
    () => getStreamTheme(isDark, theme),
    [isDark, theme],
  );

  if (!chatClient) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="small" color={theme.text} />
      </View>
    );
  }

  return (
    <OverlayProvider key={isDark ? "dark" : "light"} value={{ style: streamTheme }}>
      <Chat client={chatClient} ImageComponent={ChatStreamImage}>
        <ChatMemberProfilesProvider>{children}</ChatMemberProfilesProvider>
      </Chat>
    </OverlayProvider>
  );
}

export const ChatWrapper = ({ userDetail, children }: ChatWrapperProps) => {
  const { user } = useUser();
  const { theme } = useTheme();
  const userId = userDetail?.clerkId ?? user?.id;

  if (!userId) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="small" color={theme.text} />
      </View>
    );
  }

  return (
    <ConnectedChat key={userId} userId={userId} userDetail={userDetail}>
      {children}
    </ConnectedChat>
  );
};

export default ChatWrapper;
