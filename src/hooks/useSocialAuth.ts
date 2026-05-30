import { useSSO } from "@clerk/clerk-expo";
import type { OAuthStrategy } from "@clerk/types";
import { useState } from "react";
import { Alert } from "react-native";
import * as Linking from "expo-linking";
import { getAuthProviderLabel } from "@/constants/authProviders";

const useSocialAuth = () => {
  const [loadingStrategy, setLoadingStrategy] = useState<OAuthStrategy | null>(
    null,
  );
  const { startSSOFlow } = useSSO();

  const handleSocialAuth = async (strategy: OAuthStrategy) => {
    if (loadingStrategy) return;

    setLoadingStrategy(strategy);
    const providerLabel = getAuthProviderLabel(strategy);

    try {
      const redirectUrl = Linking.createURL("/");

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (error: unknown) {
      console.log("Social auth error:", error);
      const message =
        error instanceof Error ? error.message : String(error ?? "");

      const hint =
        message.includes("not enabled") || message.includes("not found")
          ? `\n\nEnable ${providerLabel} under Clerk Dashboard → User & Authentication → Social connections.`
          : "";

      Alert.alert(
        `${providerLabel} sign-in failed`,
        `Could not complete sign-in. Please try again.${hint}`,
      );
    } finally {
      setLoadingStrategy(null);
    }
  };

  return { handleSocialAuth, loadingStrategy };
};

export default useSocialAuth;
