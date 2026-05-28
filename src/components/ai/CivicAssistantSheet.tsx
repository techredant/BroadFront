import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useCivicAssistant } from "@/hooks/useCivicAssistant";
import { ContextCard } from "@/components/ai/ContextCard";

export function CivicAssistantSheet({
  userId,
  county,
}: {
  userId?: string;
  county?: string;
}) {
  const { theme } = useTheme();
  const { ask, lastAnswer, loading } = useCivicAssistant();
  const [question, setQuestion] = useState("");

  const submit = async () => {
    if (!question.trim()) return;
    await ask({ question, userId, county });
  };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.background }]}>
      <View style={styles.inputRow}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask about elections, county issues, leaders..."
          placeholderTextColor={theme.subtext}
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.border },
          ]}
          multiline
        />
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() =>
            Alert.alert(
              "Voice civic assistant",
              "Voice upload is wired on the backend through /api/ai/civic/voice. The mobile recorder can send its audio URL here when recording UX is enabled.",
            )
          }
        >
          <Ionicons name="mic-outline" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, loading && styles.disabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {!!lastAnswer && (
        <ScrollView style={styles.answer} contentContainerStyle={styles.answerInner}>
          <Text style={[styles.answerText, { color: theme.text }]}>
            {lastAnswer.answer}
          </Text>
          {lastAnswer.sources.map((source) => (
            <ContextCard
              key={source.id}
              label={source.entityType}
              title={source.title}
              excerpt={source.excerpt}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 12, gap: 12 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#3797F0",
  },
  disabled: { opacity: 0.6 },
  answer: { maxHeight: 360 },
  answerInner: { gap: 10, paddingBottom: 16 },
  answerText: { fontSize: 15, lineHeight: 22 },
});
