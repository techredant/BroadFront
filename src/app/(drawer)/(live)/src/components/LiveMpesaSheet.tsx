import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  LIVE_DONATION_PRESETS,
  LIVE_GIFTS,
  type LiveGiftDef,
} from "../livestreamSession";
import {
  isValidMpesaPhone,
  type LivePayResult,
} from "@/utils/livePayments";

const { width: SCREEN_W } = Dimensions.get("window");

type Tab = "gift" | "donate";

type Props = {
  visible: boolean;
  onClose: () => void;
  pay: (opts: {
    type: "gift" | "donation";
    giftId?: string;
    amount: number;
    phone: string;
  }) => Promise<LivePayResult>;
};

export function LiveMpesaSheet({ visible, onClose, pay }: Props) {
  const [tab, setTab] = useState<Tab>("gift");
  const [phone, setPhone] = useState("");
  const [donationAmount, setDonationAmount] = useState<number>(
    LIVE_DONATION_PRESETS[0],
  );
  const [loading, setLoading] = useState(false);

  const handleResult = (result: LivePayResult, gift?: LiveGiftDef) => {
    if (!result.ok) {
      Alert.alert("Payment failed", result.message);
      return;
    }
    const title = gift
      ? `${gift.emoji} ${gift.label} sent!`
      : "Donation sent!";
    Alert.alert(
      title,
      result.message ??
        (result.mock
          ? "Test payment completed."
          : "Thank you for supporting this livestream."),
    );
    onClose();
  };

  const handleGift = async (gift: LiveGiftDef) => {
    if (!isValidMpesaPhone(phone)) {
      Alert.alert(
        "Invalid phone",
        "Enter a valid Safaricom number (07XX XXX XXX or +2547...).",
      );
      return;
    }
    setLoading(true);
    try {
      const result = await pay({
        type: "gift",
        giftId: gift.id,
        amount: gift.amount,
        phone: phone.trim(),
      });
      handleResult(result, gift);
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = async () => {
    if (!isValidMpesaPhone(phone)) {
      Alert.alert(
        "Invalid phone",
        "Enter a valid Safaricom number (07XX XXX XXX or +2547...).",
      );
      return;
    }
    setLoading(true);
    try {
      const result = await pay({
        type: "donation",
        amount: donationAmount,
        phone: phone.trim(),
      });
      handleResult(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Support with M-Pesa</Text>
            <Pressable onPress={onClose} hitSlop={12} disabled={loading}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {(["gift", "donate"] as Tab[]).map((t) => (
              <Pressable
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => setTab(t)}
                disabled={loading}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
                  {t === "gift" ? "Gifts" : "Donate"}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            placeholder="M-Pesa phone (07... or +254...)"
            placeholderTextColor="#888"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            editable={!loading}
          />

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FE2C55" />
              <Text style={styles.loadingText}>
                Waiting for M-Pesa confirmation on your phone…
              </Text>
            </View>
          )}

          {tab === "gift" ? (
            <View style={[styles.giftGrid, loading && styles.dimmed]}>
              {LIVE_GIFTS.map((gift) => (
                <Pressable
                  key={gift.id}
                  style={styles.giftCell}
                  disabled={loading}
                  onPress={() => handleGift(gift)}
                >
                  <Text style={styles.giftEmoji}>{gift.emoji}</Text>
                  <Text style={styles.giftLabel}>{gift.label}</Text>
                  <Text style={styles.giftPrice}>KES {gift.amount}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <>
              <View style={[styles.amountRow, loading && styles.dimmed]}>
                {LIVE_DONATION_PRESETS.map((amt) => (
                  <Pressable
                    key={amt}
                    style={[
                      styles.amountChip,
                      donationAmount === amt && styles.amountChipOn,
                    ]}
                    onPress={() => setDonationAmount(amt)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.amountText,
                        donationAmount === amt && styles.amountTextOn,
                      ]}
                    >
                      {amt}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={styles.donateBtn}
                onPress={handleDonate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.donateBtnText}>
                    Donate KES {donationAmount}
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#FE2C55" },
  tabText: { color: "#aaa", fontWeight: "700" },
  tabTextOn: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 12,
    color: "#fff",
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  loadingText: { color: "#ccc", fontSize: 11, flex: 1 },
  dimmed: { opacity: 0.45 },
  giftGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  giftCell: {
    width: (SCREEN_W - 52) / 4,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 10,
  },
  giftEmoji: { fontSize: 25 },
  giftLabel: { color: "#fff", fontSize: 9, fontWeight: "700", marginTop: 4 },
  giftPrice: { color: "#25F4EE", fontSize: 8, marginTop: 2 },
  amountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  amountChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  amountChipOn: { backgroundColor: "#FE2C55" },
  amountText: { color: "#ccc", fontWeight: "700" },
  amountTextOn: { color: "#fff" },
  donateBtn: {
    backgroundColor: "#FE2C55",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  donateBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
