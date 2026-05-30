import { Stack } from "expo-router";
import { useLevel } from "@/context/LevelContext";
import ChatWrapper from "@/components/ChatWrapper";

export default function StatusStackLayout() {
  const { userDetails } = useLevel();

  return (
    <ChatWrapper userDetail={userDetails}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#000" },
          animation: "fade",
          gestureEnabled: true,
        }}
      />
    </ChatWrapper>
  );
}
