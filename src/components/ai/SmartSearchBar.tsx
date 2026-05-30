import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useSmartSearch } from "@/hooks/useSmartSearch";
import { ContextCard } from "@/components/ai/ContextCard";

export function SmartSearchBar({
  userId,
  county,
}: {
  userId?: string;
  county?: string;
}) {
  const { theme } = useTheme();
  const [q, setQ] = useState("");
  const { answer, loading, results, search } = useSmartSearch();

  const run = () => {
    if (!q.trim()) return;
    void search({ q, county, userId, mode: "answer" });
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.bar, { borderColor: theme.border }]}>
        <Ionicons name="sparkles-outline" size={18} color="#3797F0" />
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={run}
          placeholder="Search promises, debates, counties..."
          placeholderTextColor={theme.subtext}
          style={[styles.input, { color: theme.text }]}
          returnKeyType="search"
        />
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Voice search",
              "Voice search is supported by the AI voice endpoint once the recorder UX supplies an audio URL.",
            )
          }
        >
          <Ionicons name="mic-outline" size={20} color={theme.subtext} />
        </TouchableOpacity>
        <TouchableOpacity onPress={run}>
          {loading ? (
            <ActivityIndicator size="small" color="#3797F0" />
          ) : (
            <Ionicons name="search" size={20} color="#3797F0" />
          )}
        </TouchableOpacity>
      </View>

      {!!answer && (
        <View style={[styles.answer, { backgroundColor: theme.card }]}>
          <Text style={[styles.answerTitle, { color: theme.text }]}>
            AI answer
          </Text>
          <Text style={[styles.answerText, { color: theme.subtext }]}>
            {answer}
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sources}
        renderItem={({ item }) => (
          <View style={styles.sourceCard}>
            <ContextCard
              label={item.entityType}
              title={item.title}
              excerpt={item.excerpt}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  bar: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 14 },
  answer: { borderRadius: 16, padding: 12, gap: 4 },
  answerTitle: { fontWeight: "800" },
  answerText: { fontSize: 13, lineHeight: 18 },
  sources: { gap: 10 },
  sourceCard: { width: 240 },
});
