import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  StyleSheet,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { createPoll } from "@/services/pollsApi";
import type { PollLevelType } from "@/types/poll";
const LEVELS: { type: PollLevelType; label: string; value: (u: Record<string, string>) => string }[] = [
  { type: "national", label: "National (Kenya)", value: () => "Kenya" },
  { type: "county", label: "County", value: (u) => u.county || "Kenya" },
  { type: "constituency", label: "Constituency", value: (u) => u.constituency || u.county || "Kenya" },
  { type: "ward", label: "Ward", value: (u) => u.ward || u.constituency || "Kenya" },
];

const DURATIONS = [
  { label: "1 hour", hours: 1 },
  { label: "6 hours", hours: 6 },
  { label: "1 day", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
];

export default function CreatePollScreen() {
  const { user } = useUser();
  const { userDetails } = useLevel();
  const { theme } = useTheme();
  const { liveCallId } = useLocalSearchParams<{ liveCallId?: string }>();

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [levelIdx, setLevelIdx] = useState(1);
  const [durationHours, setDurationHours] = useState(24);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const userLoc = useMemo(
    () => ({
      county: userDetails?.county ?? "",
      constituency: userDetails?.constituency ?? "",
      ward: userDetails?.ward ?? "",
    }),
    [userDetails],
  );

  const onSubmit = async () => {
    if (!user?.id) return;
    const trimmed = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || trimmed.length < 2) {
      Alert.alert("Poll", "Add a question and at least 2 options.");
      return;
    }

    const level = LEVELS[levelIdx];
    const expiresAt = new Date(
      Date.now() + durationHours * 60 * 60 * 1000,
    ).toISOString();

    setSubmitting(true);
    try {
      const poll = await createPoll({
        userId: user.id,
        question: question.trim(),
        options: trimmed.slice(0, 4),
        levelType: level.type,
        levelValue: level.value(userLoc),
        expiresAt,
        isAnonymous,
        verifiedOnly,
        liveCallId: liveCallId ? String(liveCallId) : undefined,
      });
      if (liveCallId) {
        router.back();
      } else {
        router.replace({
          pathname: "/(drawer)/polls/[id]",
          params: { id: poll._id },
        });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not create poll";
      Alert.alert("Poll", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      {liveCallId ? (
        <Text style={{ color: "#FE2C55", marginBottom: 12, fontWeight: "600" }}>
          Live stream poll
        </Text>
      ) : null}

      <Text style={[styles.label, { color: theme.subtext }]}>Question</Text>
      <TextInput
        value={question}
        onChangeText={setQuestion}
        placeholder="What should Kenya prioritize?"
        placeholderTextColor={theme.subtext}
        maxLength={280}
        multiline
        style={[
          styles.input,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.card },
        ]}
      />

      <Text style={[styles.label, { color: theme.subtext, marginTop: 16 }]}>
        Options (2–4)
      </Text>
      {options.map((opt, i) => (
        <TextInput
          key={i}
          value={opt}
          onChangeText={(t) => {
            const next = [...options];
            next[i] = t;
            setOptions(next);
          }}
          placeholder={`Option ${i + 1}`}
          placeholderTextColor={theme.subtext}
          maxLength={100}
          style={[
            styles.input,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.card, marginBottom: 8 },
          ]}
        />
      ))}
      {options.length < 4 ? (
        <Pressable
          onPress={() => setOptions([...options, ""])}
          style={{ marginBottom: 16 }}
        >
          <Text style={{ color: "#1d9bf0", fontWeight: "600" }}>+ Add option</Text>
        </Pressable>
      ) : null}

      <Text style={[styles.label, { color: theme.subtext }]}>Geography (IEBC)</Text>
      <View style={styles.chips}>
        {LEVELS.map((l, i) => (
          <Pressable
            key={l.type}
            onPress={() => setLevelIdx(i)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  levelIdx === i ? "#1d9bf0" : theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Text
              style={{
                color: levelIdx === i ? "#fff" : theme.text,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {l.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: theme.subtext, fontSize: 12, marginBottom: 12 }}>
        Target: {LEVELS[levelIdx].value(userLoc)}
      </Text>

      <Text style={[styles.label, { color: theme.subtext }]}>Duration</Text>
      <View style={styles.chips}>
        {DURATIONS.map((d) => (
          <Pressable
            key={d.hours}
            onPress={() => setDurationHours(d.hours)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  durationHours === d.hours ? "#1d9bf0" : theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Text
              style={{
                color: durationHours === d.hours ? "#fff" : theme.text,
                fontSize: 13,
              }}
            >
              {d.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text style={{ color: theme.text, flex: 1 }}>Anonymous poll</Text>
        <Switch value={isAnonymous} onValueChange={setIsAnonymous} />
      </View>
      <View style={styles.switchRow}>
        <Text style={{ color: theme.text, flex: 1 }}>Verified voters only</Text>
        <Switch value={verifiedOnly} onValueChange={setVerifiedOnly} />
      </View>

      <Pressable
        onPress={() => void onSubmit()}
        disabled={submitting}
        style={[styles.submit, { opacity: submitting ? 0.6 : 1 }]}
      >
        <Text style={styles.submitText}>
          {submitting ? "Creating…" : "Create poll"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  submit: {
    backgroundColor: "#1d9bf0",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
