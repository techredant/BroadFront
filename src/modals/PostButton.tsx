import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export function PostButton() {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <Pressable style={styles.fab} onPress={() => router.replace("/input")}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center", // center horizontally
    pointerEvents: "box-none", // let touches pass to tabs if not on button
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 35,
    backgroundColor: "#1F2937", // or theme.primary
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30, // slightly above tab bar
    elevation: 10,
    zIndex: 20,
  },
});
