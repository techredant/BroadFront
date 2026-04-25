import { useEffect, useRef } from "react";
import { Chat, OverlayProvider, useCreateChatClient } from "stream-chat-expo";
import { studyBuddyTheme } from "@/lib/theme";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";

const API_URL = "https://cast-api-zeta.vercel.app";
const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY!;

// ✅ Token provider
async function getStreamToken(userDetail: any) {
  const res = await fetch(`${API_URL}/api/stream/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: userDetail?.clerkId,
      name: `${userDetail?.firstName ?? ""} ${userDetail?.lastName ?? ""} ${userDetail?.nickName ?? ""}`.trim(),
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

export const ChatWrapper = ({ userDetail, children }: ChatWrapperProps) => {
  const prevUserId = useRef<string | null>(null);
  
const { theme } = useTheme()
  const chatClient = useCreateChatClient(
    {
      apiKey: STREAM_API_KEY,
      userData: {
        id: userDetail?.clerkId,
        name: `${userDetail?.firstName ?? ""} ${userDetail?.lastName ?? ""} ${userDetail?.nickName ?? ""}`.trim(),
        image: userDetail?.image,
      },
      tokenOrProvider: async () => {
        return await getStreamToken(userDetail);
      },
    },
    [userDetail?.clerkId],
  );

  // ✅ Disconnect ONLY when user actually changes
  useEffect(() => {
    if (!chatClient || !userDetail?.clerkId) return;

    if (prevUserId.current && prevUserId.current !== userDetail.clerkId) {
      console.log("🔌 Switching users, disconnecting old one...");
      chatClient.disconnectUser();
    }

    prevUserId.current = userDetail.clerkId;
  }, [userDetail?.clerkId, chatClient]);

  if (!chatClient) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background }}>
        <ActivityIndicator size={"small"} color={theme.text}/>
      </View>
    );
  }

  return (
    <OverlayProvider value={{ style: studyBuddyTheme }}>
      <Chat client={chatClient} style={studyBuddyTheme}>
        {children}
      </Chat>
    </OverlayProvider>
  );
};

export default ChatWrapper;
