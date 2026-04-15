import { useEffect, useState } from "react";
import { Chat, OverlayProvider, useCreateChatClient } from "stream-chat-expo";
import { FullScreenLoader } from "./FullScreenLoader";
import { studyBuddyTheme } from "@/lib/theme";

const API_URL = "https://cast-api-zeta.vercel.app";
const STREAM_API_KEY = process.env.EXPO_PUBLIC_STREAM_API_KEY!;

// ✅ Token provider (single source of truth)
async function getStreamToken(userDetail: any) {
  console.log("🔥 REQUESTING TOKEN");

  const res = await fetch(`${API_URL}/api/stream/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: userDetail?.clerkId,
      name: `${userDetail?.firstName ?? ""} ${userDetail?.lastName ?? ""}`.trim(),
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
  const [clientReady, setClientReady] = useState(false);

  console.log("USER DETAIL:", userDetail);

  // ✅ Create client with dependency (IMPORTANT)
  const chatClient = useCreateChatClient(
    {
      apiKey: STREAM_API_KEY,
      userData: {
        id: userDetail?.clerkId, // only ID (backend controls name/image)
      },
      tokenOrProvider: async () => {
        console.log("🔥 FETCHING TOKEN");
        return await getStreamToken(userDetail);
      },
    },
    [userDetail?.clerkId], // 👈 forces re-init when user changes
  );

  // ✅ Force disconnect old session when user changes
  useEffect(() => {
    if (!chatClient) return;

    const reset = async () => {
      console.log("🔌 Disconnecting old user...");
      await chatClient.disconnectUser();
    };

    reset();
  }, [userDetail?.clerkId]);

  // ✅ Ready state
  useEffect(() => {
    if (chatClient) {
      setClientReady(true);
    }
  }, [chatClient]);

  if (!chatClient || !clientReady) {
    return <FullScreenLoader message="Connecting to chat..." />;
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
