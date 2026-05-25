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
  StatusBar,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useLevel } from "@/context/LevelContext";
import { useTheme } from "@/context/ThemeContext";
import { VerifiedBadge } from "@/components/VerifiedBadge";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://cast-api-zeta.vercel.app";

type Plan = {
  type: VerificationType;
  label: string;
  description: string;
  amount: number;
  maxAmount?: number;
  currency: string;
  durationDays: number;
  features?: string[];
  pricing?: Record<
    BillingCycle,
    { amount: number; maxAmount?: number; durationDays: number }
  >;
};

type VerificationType = "personal" | "business" | "government";
type BillingCycle = "monthly" | "yearly";
const VERIFICATION_TYPES: VerificationType[] = [
  "personal",
  "business",
  "government",
];

const PLAN_FALLBACKS: Record<
  VerificationType,
  {
    monthly: { amount: number; maxAmount?: number };
    yearly: { amount: number; maxAmount?: number };
  }
> = {
  personal: {
    monthly: { amount: 300 },
    yearly: { amount: 4000 },
  },
  business: {
    monthly: { amount: 1499 },
    yearly: { amount: 15000 },
  },
  government: {
    monthly: { amount: 3500, maxAmount: 7000 },
    yearly: { amount: 35000, maxAmount: 70000 },
  },
};

function formatKes(amount?: number, maxAmount?: number) {
  if (!amount) return "KES —";
  const min = `KES ${amount.toLocaleString()}`;
  return maxAmount ? `${min} - ${maxAmount.toLocaleString()}` : min;
}

function verificationColor(type: VerificationType) {
  if (type === "business") return "#f5b22f";
  if (type === "government") return "#ef4444";
  return "#1D9BF0";
}

function verificationTint(type: VerificationType) {
  if (type === "business") return "rgba(245,178,47,0.14)";
  if (type === "government") return "rgba(239,68,68,0.12)";
  return "rgba(29,155,240,0.12)";
}

function verificationLabel(type: VerificationType) {
  if (type === "personal") return "Personal";
  if (type === "business") return "Business";
  return "Government";
}

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
    useState<VerificationType>("personal");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
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

    if (verificationType !== "personal" && !businessName.trim()) {
      Alert.alert("Missing info", "Organization name is required.");
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
        billingCycle,
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
  const selectedPricing =
    selectedPlan?.pricing?.[billingCycle] ??
    (selectedPlan
      ? {
          amount: selectedPlan.amount,
          maxAmount: selectedPlan.maxAmount,
          durationDays: selectedPlan.durationDays,
        }
      : PLAN_FALLBACKS[verificationType][billingCycle]
        ? {
            ...PLAN_FALLBACKS[verificationType][billingCycle],
            durationDays: billingCycle === "monthly" ? 30 : 365,
          }
      : null);
  const selectedAmount = selectedPricing?.amount;
  const selectedMaxAmount = selectedPricing?.maxAmount;
  const activeColor = verificationColor(verificationType);
  const selectedBillingLabel =
    billingCycle === "monthly" ? "monthly" : "yearly";
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
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={theme.background === "#000" ? "light-content" : "dark-content"}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={25} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Get verified</Text>
      </View>

      <View style={[styles.card, { borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          Badge preview
        </Text>
        <Text style={[styles.cardSubtitle, { color: theme.subtext }]}>
          Choose the badge that best matches your public identity.
        </Text>

        <View style={styles.previewItem}>
          <Ionicons name="checkmark-circle" size={24} color="#1D9BF0" />
          <View style={styles.previewCopy}>
            <Text style={[styles.previewTitle, { color: "#1D9BF0" }]}>
              Personal
            </Text>
            <Text style={[styles.previewText, { color: theme.subtext }]}>
              Blue badge for verified public or personal accounts.
            </Text>
          </View>
        </View>

        <View style={styles.previewItem}>
          <Ionicons name="checkmark-circle" size={24} color="#f5b22f" />
          <View style={styles.previewCopy}>
            <Text style={[styles.previewTitle, { color: "#f5b22f" }]}>
              Business / company
            </Text>
            <Text style={[styles.previewText, { color: theme.subtext }]}>
              Gold badge for brands, businesses, and organizations.
            </Text>
          </View>
        </View>

        <View style={styles.previewItem}>
          <Ionicons name="shield-checkmark" size={25} color="#ef233c" />
          <View style={styles.previewCopy}>
            <Text style={[styles.previewTitle, { color: "#ef4444" }]}>
              Government
            </Text>
            <Text style={[styles.previewText, { color: theme.subtext }]}>
              Red coat-of-arms style badge for official government accounts.
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, styles.plansCard, { borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Plans</Text>
        {VERIFICATION_TYPES.map((type) => {
          const plan = plans.find((p) => p.type === type);
          const fallback = PLAN_FALLBACKS[type];
          const monthly = plan?.pricing?.monthly?.amount ?? fallback.monthly.amount;
          const monthlyMax =
            plan?.pricing?.monthly?.maxAmount ?? fallback.monthly.maxAmount;
          const yearly =
            plan?.pricing?.yearly?.amount ?? plan?.amount ?? fallback.yearly.amount;
          const yearlyMax =
            plan?.pricing?.yearly?.maxAmount ??
            plan?.maxAmount ??
            fallback.yearly.maxAmount;
          return (
            <View key={type} style={styles.planRow}>
              <Text style={[styles.planName, { color: theme.text }]}>
                {verificationLabel(type)} Verification
              </Text>
              <Text style={[styles.planPrice, { color: theme.subtext }]}>
                {formatKes(monthly, monthlyMax)}/mo ·{" "}
                {formatKes(yearly, yearlyMax).replace("KES ", "")}/yr
              </Text>
            </View>
          );
        })}
      </View>

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
            {VERIFICATION_TYPES.map((t) => {
              const isActive = verificationType === t;
              const optionColor = verificationColor(t);
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setVerificationType(t)}
                  style={[
                    styles.typeBtn,
                    {
                      borderColor: isActive ? optionColor : theme.border,
                      backgroundColor: isActive
                        ? verificationTint(t)
                        : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isActive ? optionColor : theme.text,
                      fontWeight: "600",
                    }}
                  >
                    {verificationLabel(t)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.section, { color: theme.text }]}>Billing</Text>
          <View style={styles.typeRow}>
            {(["monthly", "yearly"] as const).map((cycle) => (
              <TouchableOpacity
                key={cycle}
                onPress={() => setBillingCycle(cycle)}
                style={[
                  styles.typeBtn,
                  {
                    borderColor:
                      billingCycle === cycle ? activeColor : theme.border,
                    backgroundColor:
                      billingCycle === cycle
                        ? verificationTint(verificationType)
                        : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    color: billingCycle === cycle ? activeColor : theme.text,
                    fontWeight: "700",
                  }}
                >
                  {cycle === "monthly" ? "Monthly" : "Yearly"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedPlan && (
            <View style={styles.planSummary}>
              <Text style={[styles.summaryDescription, { color: theme.subtext }]}>
                {selectedPlan.description}
              </Text>
              <Text style={[styles.summaryPrice, { color: theme.text }]}>
                {formatKes(selectedAmount ?? selectedPlan.amount, selectedMaxAmount)} /{" "}
                {selectedBillingLabel}
              </Text>
              {(selectedPlan.features ?? []).map((feature) => (
                <Text
                  key={feature}
                  style={[styles.featureText, { color: theme.subtext }]}
                >
                  · {feature}
                </Text>
              ))}
            </View>
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
          {verificationType !== "personal" && (
            <Field
              label={
                verificationType === "government"
                  ? "Government office / institution name"
                  : "Business / organization name"
              }
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
            style={[styles.submit, { backgroundColor: activeColor }]}
            onPress={handleApply}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                Pay with M-Pesa & submit ·{" "}
                {formatKes(selectedAmount, selectedMaxAmount)}
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
  content: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    minHeight: 36,
    justifyContent: "center",
    marginBottom: 12,
  },
  back: {
    position: "absolute",
    left: -4,
    zIndex: 2,
    padding: 4,
  },
  title: { fontSize: 21, fontWeight: "800", textAlign: "center" },
  section: { fontSize: 19, fontWeight: "800", marginBottom: 10 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  cardSubtitle: {
    fontSize: 16,
    lineHeight: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    paddingLeft: 8,
  },
  previewCopy: {
    flex: 1,
    marginLeft: 16,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 18,
  },
  plansCard: {
    paddingVertical: 18,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 18,
  },
  planName: {
    flex: 1.2,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
  },
  planPrice: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "right",
  },
  row: { flexDirection: "row", alignItems: "center" },
  typeRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
  typeBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  planSummary: {
    marginBottom: 18,
  },
  summaryDescription: {
    fontSize: 16,
    lineHeight: 21,
    marginBottom: 8,
  },
  summaryPrice: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  featureText: {
    fontSize: 13,
    lineHeight: 20,
  },
  submit: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
