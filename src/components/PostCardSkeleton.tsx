import React from "react";
import { View } from "react-native";
import { MotiView } from "moti";
import { useTheme } from "@/context/ThemeContext";

export const PostCardSkeleton = () => {
    const { theme } = useTheme()
  return (
    <View style={{ padding: 12, marginBottom: 12 }}>
      {/* HEADER */}
      <MotiView
        from={{ opacity: 0.3 }}
        animate={{ opacity: 1 }}
        transition={{ loop: true, type: "timing", duration: 800 }}
        style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.card,
          }}
        />

        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ width: "40%", height: 10, backgroundColor: theme.card }} />
          <View style={{ width: "30%", height: 10, backgroundColor: theme.card }} />
        </View>
      </MotiView>

      {/* TEXT */}
      <View style={{ marginTop: 12, gap: 6 }}>
        <View style={{ height: 10, backgroundColor: theme.card, width: "100%" }} />
        <View style={{ height: 10, backgroundColor: theme.card, width: "85%" }} />
        <View style={{ height: 10, backgroundColor: theme.card, width: "70%" }} />
      </View>

      {/* MEDIA GRID */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <View
          style={{
            flex: 1,
            height: 120,
            borderRadius: 10,
            backgroundColor: theme.card,
          }}
        />
        <View
          style={{
            flex: 1,
            height: 120,
            borderRadius: 10,
            backgroundColor: theme.card,
          }}
        />
      </View>

      {/* ACTIONS */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <View style={{ width: 30, height: 15, backgroundColor: theme.card }} />
        <View style={{ width: 30, height: 15, backgroundColor: theme.card }} />
        <View style={{ width: 30, height: 15, backgroundColor: theme.card }} />
        <View style={{ width: 30, height: 15, backgroundColor: theme.card }} />
      </View>
    </View>
  );
};
