import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  formatProfileCountdown,
  isProfileUpdatePending,
  msUntilProfileUpdate,
  ProfileUserFields,
} from "@/utils/profileUpdate";

type Props = {
  userDetails?: ProfileUserFields | null;
  isBusiness?: boolean;
  theme: {
    text: string;
    subtext: string;
    primary: string;
    card: string;
    border: string;
    background: string;
  };
  onExpired?: () => void;
  compact?: boolean;
};

function getParts(user?: ProfileUserFields | null) {
  const diff = msUntilProfileUpdate(user);
  if (diff <= 0) return null;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    label: formatProfileCountdown(user),
  };
}

export function ProfileUpdateCountdown({
  userDetails,
  isBusiness = false,
  theme,
  onExpired,
  compact = false,
}: Props) {
  const [parts, setParts] = useState(() => getParts(userDetails));
  const pending = isProfileUpdatePending(userDetails);

  useEffect(() => {
    if (!userDetails) {
      setParts(null);
      return;
    }

    const tick = () => {
      const next = getParts(userDetails);
      setParts(next);
      if (!next) onExpired?.();
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [userDetails, onExpired]);

  if (!pending || !parts) return null;

  const pendingSub = isBusiness
    ? "Your current company name stays public until the timer ends. Photos update right away."
    : "Your current name and location stay public until the timer ends. Photos update right away.";

  return (
    <View
      style={[
        styles.pendingBox,
        compact && styles.pendingBoxCompact,
        { backgroundColor: theme.card, borderColor: theme.primary },
      ]}
    >
      <View style={styles.pendingHeader}>
        <Ionicons name="hourglass-outline" size={20} color={theme.primary} />
        <Text style={[styles.pendingTitle, { color: theme.text }]}>
          {isBusiness ? "Company name update scheduled" : "Profile update scheduled"}
        </Text>
      </View>

      <Text style={[styles.pendingSub, { color: theme.subtext }]}>
        {pendingSub}
      </Text>

      <View style={styles.timerRow}>
        <TimeBlock value={parts.hours} label="Hrs" theme={theme} compact={compact} />
        <Text style={[styles.colon, { color: theme.primary }]}>:</Text>
        <TimeBlock value={parts.minutes} label="Min" theme={theme} compact={compact} />
        <Text style={[styles.colon, { color: theme.primary }]}>:</Text>
        <TimeBlock value={parts.seconds} label="Sec" theme={theme} compact={compact} />
      </View>

      <Text style={[styles.liveIn, { color: theme.subtext }]}>
        Goes live in{" "}
        <Text style={{ color: theme.primary, fontWeight: "700" }}>
          {parts.label}
        </Text>
      </Text>
    </View>
  );
}

function TimeBlock({
  value,
  label,
  theme,
  compact,
}: {
  value: string;
  label: string;
  theme: Props["theme"];
  compact?: boolean;
}) {
  return (
    <View style={styles.block}>
      <View
        style={[
          styles.digitBox,
          compact && styles.digitBoxCompact,
          { backgroundColor: theme.background, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.digit, compact && styles.digitCompact, { color: theme.text }]}>
          {value}
        </Text>
      </View>
      <Text style={[styles.blockLabel, { color: theme.subtext }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pendingBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    width: "100%",
    alignItems: "center",
  },
  pendingBoxCompact: {
    marginTop: 8,
    padding: 10,
  },
  pendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    width: "100%",
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  pendingSub: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 10,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  block: {
    alignItems: "center",
    minWidth: 48,
  },
  digitBox: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 46,
    alignItems: "center",
  },
  digitBoxCompact: {
    paddingVertical: 6,
    minWidth: 42,
  },
  digit: {
    fontSize: 21,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  digitCompact: {
    fontSize: 19,
  },
  blockLabel: {
    fontSize: 9,
    marginTop: 3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  colon: {
    fontSize: 17,
    fontWeight: "700",
    marginHorizontal: 2,
    marginBottom: 14,
  },
  liveIn: {
    fontSize: 11,
    textAlign: "center",
  },
});
