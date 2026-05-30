import React from "react";
import { StyleSheet, Text, type TextProps } from "react-native";
import { fontForWeight } from "@/constants/typography";

/** Text with Inter weight mapping (X-style typography). */
export function AppText(props: TextProps) {
  const flat = StyleSheet.flatten(props.style);
  const fontFamily = fontForWeight(flat?.fontWeight);
  return <Text {...props} style={[{ fontFamily }, props.style]} />;
}
