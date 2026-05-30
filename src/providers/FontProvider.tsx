import React, { useEffect } from "react";
import { StyleSheet, Text, TextInput, type TextProps } from "react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { fontForWeight, fonts } from "@/constants/typography";

let patched = false;

function patchGlobalText() {
  if (patched) return;
  patched = true;

  const TextCtor = Text as typeof Text & {
    render?: (props: TextProps, ref: React.Ref<Text>) => React.ReactNode;
    __broadcastFontPatched?: boolean;
  };

  if (TextCtor.render && !TextCtor.__broadcastFontPatched) {
    TextCtor.__broadcastFontPatched = true;
    const originalRender = TextCtor.render.bind(TextCtor);
    TextCtor.render = function render(props, ref) {
      const flat = StyleSheet.flatten(props.style);
      const fontFamily = fontForWeight(flat?.fontWeight);
      return originalRender(
        { ...props, style: [{ fontFamily }, props.style] },
        ref,
      );
    };
    return;
  }

  // Fallback: base family; bold may synthesize on iOS
  Text.defaultProps = Text.defaultProps ?? {};
  Text.defaultProps.style = { fontFamily: fonts.regular };

  TextInput.defaultProps = TextInput.defaultProps ?? {};
  TextInput.defaultProps.style = { fontFamily: fonts.regular };
}

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (loaded) patchGlobalText();
  }, [loaded]);

  if (!loaded) return null;

  return <>{children}</>;
}
