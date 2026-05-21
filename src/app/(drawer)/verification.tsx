import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://cast-api-zeta.vercel.app";

type Plan = {
  type: "personal" | "business";
  label: string;
  description: string;
  amount: number;
  currency: string;
  durationDays: number;
};

type VerificationStatus = {
  isVerified: boolean;
  verificationType?: string;
  verifiedAt?: string;
  verificationExpiresAt?: string;
  canApply: boolean;
  activeRequest?: {
    _id: string;
    status: string;
    verificationType: string;
    rejectionReason?: string;
    amount: number;
    currency: string;
  };
};

export default function VerificationScreen() {
  const { userDetails, refreshUserDetails } = useLevel();
  const { theme } = useTheme();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [verificationType, setVerificationType] =
    useState<"personal" | "business">("personal");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [applicationReason, setApplicationReason] = useState("");

  const load = useCallback(async () => {
    if (!userDetails?.clerkId) return;

    try {
      setLoading(true);
      const [plansRes, statusRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/verification/plans`),
        axios.get(
          `${BASE_URL}/api/verification/status/${userDetails.clerkId}`,
        ),
      ]);

      setPlans(plansRes.data.plans || []);
      setStatus(statusRes.data);

      const name =
        [userDetails.firstName, userDetails.lastName]
          .filter(Boolean)
          .join(" ") ||
        userDetails.companyName ||
        "";
      setFullName((prev) => prev || name);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not load verification details.");
    } finally {
      setLoading(false);
    }
  }, [userDetails?.clerkId]);

  useEffect(() => {
    load();
  }, [load]);

  const pollPayment = async (requestId: string, attempts = 12) => {
    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await axios.post(
        `${BASE_URL}/api/verification/poll/${requestId}`,
      );
      const req = res.data.request;
      if (req?.status === "pending_review") {
        Alert.alert(
          "Payment received",
          "Your application is pending admin review.",
        );
        await load();
        await refreshUserDetails();
        return;
      }
      if (req?.status === "rejected") {
        Alert.alert("Payment failed", req.rejectionReason || "Try again.");
        await load();
        return;
      }
    }
    Alert.alert(
      "Payment pending",
      "If you completed M-Pesa, we will update your status shortly.",
    );
    await load();
  };

  const handleApply = async () => {
    if (!userDetails?.clerkId) return;

    if (!phoneNumber.trim() || !fullName.trim()) {
      Alert.alert("Missing info", "Phone number and full name are required.");
      return;
    }

    if (verificationType === "business" && !businessName.trim()) {
      Alert.alert("Missing info", "Business name is required.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(`${BASE_URL}/api/verification/apply`, {
        clerkId: userDetails.clerkId,
        verificationType,
        phoneNumber: phoneNumber.trim(),
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        idNumber: idNumber.trim(),
        website: website.trim(),
        applicationReason: applicationReason.trim(),
      });

      const requestId = res.data.request?._id;
      if (requestId && res.data.request?.status === "pending_payment") {
        await pollPayment(requestId);
      } else {
        Alert.alert("Submitted", res.data.message || "Application submitted.");
        await load();
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Could not submit verification.";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPlan = plans.find((p) => p.type === verificationType);
  const expiresLabel = status?.verificationExpiresAt
    ? new Date(status.verificationExpiresAt).toLocaleDateString()
    : null;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.text }]}>
        Get verified
      </Text>
      <Text style={[styles.subtitle, { color: theme.subtext }]}>
        Premium verification with a blue badge — like X (Twitter).
      </Text>

      {status?.isVerified && (
        <View style={[styles.card, { borderColor: theme.border }]}>
          <View style={styles.row}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              You're verified
            </Text>
            <VerifiedBadge isVerified size={20} />
          </View>
          <Text style={{ color: theme.subtext, marginTop: 6 }}>
            Type: {status.verificationType}
          </Text>
          {expiresLabel && (
            <Text style={{ color: theme.subtext, marginTop: 4 }}>
              Renews / expires: {expiresLabel}
            </Text>
          )}
          {status.canApply && (
            <Text style={{ color: theme.subtext, marginTop: 8 }}>
              You can renew before expiry by submitting a new application below.
            </Text>
          )}
        </View>
      )}

      {status?.activeRequest &&
        ["pending_payment", "pending_review"].includes(
          status.activeRequest.status,
        ) && (
          <View style={[styles.card, { borderColor: "#f59e0b" }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              Application in progress
            </Text>
            <Text style={{ color: theme.subtext, marginTop: 6 }}>
              Status: {status.activeRequest.status.replace("_", " ")}
            </Text>
            <Text style={{ color: theme.subtext }}>
              {status.activeRequest.verificationType} · KES{" "}
              {status.activeRequest.amount}
            </Text>
          </View>
        )}

      {status?.activeRequest?.status === "rejected" && (
        <View style={[styles.card, { borderColor: "#ef4444" }]}>
          <Text style={{ color: "#ef4444" }}>
            {status.activeRequest.rejectionReason || "Application rejected"}
          </Text>
        </View>
      )}

      {status?.canApply !== false && (
        <>
          <Text style={[styles.section, { color: theme.text }]}>
            Verification type
          </Text>
          <View style={styles.typeRow}>
            {(["personal", "business"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setVerificationType(t)}
                style={[
                  styles.typeBtn,
                  {
                    borderColor:
                      verificationType === t ? "#1D9BF0" : theme.border,
                    backgroundColor:
                      verificationType === t
                        ? "rgba(29,155,240,0.12)"
                        : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    color: verificationType === t ? "#1D9BF0" : theme.text,
                    fontWeight: "600",
                  }}
                >
                  {t === "personal" ? "Personal" : "Business"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedPlan && (
            <Text style={{ color: theme.subtext, marginBottom: 16 }}>
              {selectedPlan.description} — {selectedPlan.currency}{" "}
              {selectedPlan.amount}/year
            </Text>
          )}

          <Field
            label="M-Pesa phone (2547...)"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            theme={theme}
            keyboardType="phone-pad"
          />
          <Field
            label="Full legal name"
            value={fullName}
            onChangeText={setFullName}
            theme={theme}
          />
          {verificationType === "business" && (
            <Field
              label="Business / organization name"
              value={businessName}
              onChangeText={setBusinessName}
              theme={theme}
            />
          )}
          <Field
            label="ID / registration number (optional)"
            value={idNumber}
            onChangeText={setIdNumber}
            theme={theme}
          />
          <Field
            label="Website (optional)"
            value={website}
            onChangeText={setWebsite}
            theme={theme}
          />
          <Field
            label="Why should you be verified?"
            value={applicationReason}
            onChangeText={setApplicationReason}
            theme={theme}
            multiline
          />

          <TouchableOpacity
            disabled={submitting}
            style={[styles.submit, { backgroundColor: "#1D9BF0" }]}
            onPress={handleApply}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                Pay with M-Pesa & submit · KES {selectedPlan?.amount ?? "—"}
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  theme,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  theme: { text: string; subtext: string; border: string; background: string };
  multiline?: boolean;
  keyboardType?: "default" | "phone-pad";
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: theme.subtext, fontSize: 11, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor={theme.subtext}
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 10,
          padding: 12,
          color: theme.text,
          minHeight: multiline ? 80 : undefined,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  back: { marginBottom: 12 },
  title: { fontSize: 25, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 6, marginBottom: 20 },
  section: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center" },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  submit: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
