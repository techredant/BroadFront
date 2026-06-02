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
          contentStyle: { backgroundColor: "transparent" },
          presentation: "transparentModal",
          animation: "fade_from_bottom",
          gestureEnabled: true,
        }}
      >
        <Stack.Screen
          name="Viewer"
          options={{
            presentation: "transparentModal",
            animation: "fade_from_bottom",
            contentStyle: { backgroundColor: "rgba(0,0,0,0.66)" },
          }}
        />
      </Stack>
    </ChatWrapper>
  );
}
