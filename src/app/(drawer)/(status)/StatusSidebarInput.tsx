import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import axios from "axios";
import { useLevel } from "@/context/LevelContext";

/* =======================
   CONFIG
======================= */
const BASE_URL = "https://cast-api-zeta.vercel.app";

export default function StatusSidebarInput() {
  const [status, setStatus] = useState("");
  const [bgIndex, setBgIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const { userDetails } = useLevel();
  const { theme, isDark } = useTheme();

  const backgrounds = [
    "#1e293b",
    "#2563eb",
    "#16a34a",
    "#dc2626",
    "#7c3aed",
    "#ea580c",
  ];

  /* =======================
     🚀 POST STATUS
  ======================= */
  const handlePostStatus = async () => {
    if (!status.trim() || loading) return;

    try {
      setLoading(true);

      const payload = {
        userId: userDetails?.clerkId,
        lastName: userDetails?.lastName,
        firstName: userDetails?.firstName,
        nickname: userDetails?.nickname,
        caption: status,
        media: [], // ready for images/videos later
      };

      await axios.post(`${BASE_URL}/api/status`, payload);

      setStatus("");
      router.back();
    } catch (err: any) {
      console.log("POST STATUS ERROR:", err?.message);
    } finally {
      setLoading(false);
    }
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
          disabled={!status.trim() || loading}
          onPress={handlePostStatus}
          style={{ opacity: status.trim() && !loading ? 1 : 0.5 }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="send" size={26} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* INPUT */}
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

      {/* COLORS */}
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
