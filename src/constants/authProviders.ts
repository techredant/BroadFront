import type { OAuthStrategy } from "@clerk/types";
import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

export type AuthProviderIcon = ComponentProps<typeof Ionicons>["name"];

export type AuthProviderConfig = {
  strategy: OAuthStrategy;
  label: string;
  icon: AuthProviderIcon;
  brandColor: string;
  tint?: string;
};

/** Enable Google, Facebook, and LinkedIn in Clerk Dashboard → Social connections */
export const AUTH_PROVIDERS: AuthProviderConfig[] = [
  {
    strategy: "oauth_google",
    label: "Google",
    icon: "logo-google",
    brandColor: "#EA4335",
    tint: "rgba(234,67,53,0.12)",
  },
  {
    strategy: "oauth_facebook",
    label: "Facebook",
    icon: "logo-facebook",
    brandColor: "#1877F2",
    tint: "rgba(24,119,242,0.14)",
  },
  {
    strategy: "oauth_linkedin",
    label: "LinkedIn",
    icon: "logo-linkedin",
    brandColor: "#0A66C2",
    tint: "rgba(10,102,194,0.14)",
  },
];

export function getVisibleAuthProviders(): AuthProviderConfig[] {
  return AUTH_PROVIDERS;
}

export function getAuthProviderLabel(strategy: string): string {
  return (
    AUTH_PROVIDERS.find((p) => p.strategy === strategy)?.label ?? "Account"
  );
}
