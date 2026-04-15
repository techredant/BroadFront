import { useSSO } from "@clerk/clerk-expo";
import { useState } from "react";
import { Alert } from "react-native";
import * as Linking from "expo-linking";

const useSocialAuth = () => {
  const [loadingStrategy, setLoadingStrategy] = useState<string | null>(null);
  const { startSSOFlow } = useSSO();

  const handleSocialAuth = async (
    strategy: "oauth_google" | "oauth_apple" | "oauth_github",
  ) => {
    if (loadingStrategy) return;

    setLoadingStrategy(strategy);

    try {
      const redirectUrl = Linking.createURL("/");

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl, // 🔥 THIS IS WHAT YOU WERE MISSING
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (error) {
      console.log("💥 Error in social auth:", error);
      Alert.alert("Error", "Failed to sign in. Please try again.");
    } finally {
      setLoadingStrategy(null);
    }
  };

  return { handleSocialAuth, loadingStrategy };
};

export default useSocialAuth;
