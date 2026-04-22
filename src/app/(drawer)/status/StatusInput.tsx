import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";

/* =======================
   STATUS INPUT SCREEN
======================= */
export default function StatusInput() {
  const [status, setStatus] = useState("");
  const [bgIndex, setBgIndex] = useState(0);

  const { theme, isDark } = useTheme();

  const backgrounds = [
    "#1e293b", // slate
    "#2563eb", // blue
    "#16a34a", // green
    "#dc2626", // red
    "#7c3aed", // purple
    "#ea580c", // orange
  ];

  const handlePostStatus = () => {
    if (!status.trim()) return;
    console.log("Status posted:", status);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: backgrounds[bgIndex] }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Status</Text>

        <TouchableOpacity
          disabled={!status.trim()}
          onPress={handlePostStatus}
          style={{ opacity: status.trim() ? 1 : 0.5 }}
        >
          <Ionicons name="send" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* TEXT INPUT */}
      <View style={styles.center}>
        <TextInput
          value={status}
          onChangeText={setStatus}
          placeholder="What's on your mind?"
          placeholderTextColor="rgba(255,255,255,0.6)"
          style={styles.input}
          multiline
          autoFocus
        />
      </View>

      {/* COLOR PICKER */}
      <View style={styles.colors}>
        {backgrounds.map((color, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => setBgIndex(index)}
            style={[
              styles.colorDot,
              {
                backgroundColor: color,
                borderWidth: bgIndex === index ? 2 : 0,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

/* =======================
   STYLES
======================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  input: {
    color: "#fff",
    fontSize: 28,
    textAlign: "center",
    lineHeight: 38,
  },
  colors: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingBottom: 30,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderColor: "#fff",
  },
});
