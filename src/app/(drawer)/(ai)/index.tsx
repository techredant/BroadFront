import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import axios from "axios";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";
import { SafeAreaView } from "react-native-safe-area-context";

const BASE_URL = "https://cast-api-zeta.vercel.app";

export default function AIChatScreen() {
  const { theme } = useTheme();
  const { userDetails } = useLevel();

  const channelId = userDetails?.clerkId;

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentReady, setAgentReady] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: "ai-welcome",
      role: "ai",
      text: "Hello 👋 I'm your AI assistant. Ask me anything.",
    },
  ]);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const startAgent = async () => {
      if (!channelId) return;

      try {
        await axios.post(`${BASE_URL}/api/ai/start-ai-agent`, {
          channel_id: channelId,
          channel_type: "messaging",
          platform: "mobile",
        });
        setAgentReady(true);
      } catch (error) {
        console.log("❌ AI Agent start failed", error);
        setAgentReady(false);
      }
    };

    startAgent();
  }, [channelId]);

  /* ---------------- SEND MESSAGE ---------------- */
  const sendMessage = async () => {
    if (!input.trim() || !channelId) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      text: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    if (!agentReady) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "ai",
          text: "The AI agent is not ready yet. Please wait a moment and try again.",
        },
      ]);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${BASE_URL}/api/ai/chat`, {
        channel_id: channelId,
        message: userMsg.text,
      });

      const aiMsg = {
        id: Date.now().toString() + "-ai",
        role: "ai",
        text: res.data?.reply || "No response",
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.log("❌ AI CHAT ERROR:", err?.response?.data);
      console.log("STATUS:", err?.response?.status);
      console.log("MESSAGE:", err?.message);

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "ai",
          text:
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            "AI error occurred",
        },
      ]);
    } finally {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* CHAT */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf: item.role === "user" ? "flex-end" : "flex-start",
              backgroundColor: item.role === "user" ? "#4f46e5" : theme.card,
              padding: 10,
              margin: 5,
              borderRadius: 10,
              maxWidth: "80%",
            }}
          >
            <Text style={{ color: item.role === "user" ? "#fff" : theme.text }}>
              {item.text}
            </Text>
          </View>
        )}
        contentContainerStyle={{ padding: 12 }}
      />

      {/* INPUT */}
      <View style={styles.inputBar}>
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          placeholder="Message AI..."
          placeholderTextColor={theme.subtext}
          style={[styles.input, { color: theme.text }]}
        />

        <Pressable
          onPress={sendMessage}
          style={styles.sendBtn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700" }}>Send</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  inputBar: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
  },
  sendBtn: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 10,
  },
});
