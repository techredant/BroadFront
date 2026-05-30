import React, { useEffect, useMemo, useState } from "react";
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
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  LIVE_DONATION_PRESETS,
  LIVE_GIFT_CATEGORIES,
  LIVE_GIFTS,
  type LiveGiftDef,
} from "@/utils/livestreamSession";
import {
  isValidMpesaPhone,
  type LivePayResult,
} from "@/utils/livePayments";
import { TT } from "@/utils/liveTikTokLayout";

const { width: SCREEN_W } = Dimensions.get("window");

type Tab = "gift" | "donate";

export type DonationLeaderEntry = {
  userName: string;
  total: number;
};

type Props = {
  visible: boolean;
  initialTab?: Tab;
  onClose: () => void;
  topDonors?: DonationLeaderEntry[];
  pay: (opts: {
    type: "gift" | "donation";
    giftId?: string;
    amount: number;
    phone: string;
  }) => Promise<LivePayResult>;
};

export function LiveMpesaSheet({
  visible,
  initialTab = "gift",
  onClose,
  topDonors = [],
  pay,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [giftCategory, setGiftCategory] = useState(LIVE_GIFT_CATEGORIES[0].id);
  const [phone, setPhone] = useState("");
  const [donationAmount, setDonationAmount] = useState<number>(
    LIVE_DONATION_PRESETS[0],
  );
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [visible, initialTab]);

  const filteredGifts = useMemo(
    () => LIVE_GIFTS.filter((g) => g.category === giftCategory),
    [giftCategory],
  );

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

  const resolveDonationAmount = (): number | null => {
    if (customAmount.trim()) {
      const n = Number(customAmount.replace(/[^\d]/g, ""));
      if (!Number.isFinite(n) || n < 10) return null;
      return Math.round(n);
    }
    return donationAmount;
  };

  const handleDonate = async () => {
    const amount = resolveDonationAmount();
    if (!amount) {
      Alert.alert("Invalid amount", "Enter at least KES 10.");
      return;
    }
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
        amount,
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
          <LinearGradient
            colors={["rgba(30,30,30,0.98)", "rgba(12,12,12,0.98)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.header}>
            <Text style={styles.title}>Support with M-Pesa</Text>
            <Pressable onPress={onClose} hitSlop={12} disabled={loading}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          {topDonors.length > 0 ? (
            <View style={styles.leaderboard}>
              <Text style={styles.leaderTitle}>Top supporters</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {topDonors.slice(0, 5).map((entry, i) => (
                  <View key={`${entry.userName}-${i}`} style={styles.leaderChip}>
                    <Text style={styles.leaderRank}>#{i + 1}</Text>
                    <Text style={styles.leaderName} numberOfLines={1}>
                      {entry.userName}
                    </Text>
                    <Text style={styles.leaderAmt}>
                      KES {entry.total.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

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
              <ActivityIndicator color={TT.liveRed} />
              <Text style={styles.loadingText}>
                Waiting for M-Pesa confirmation on your phone…
              </Text>
            </View>
          )}

          {tab === "gift" ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryRow}
              >
                {LIVE_GIFT_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      giftCategory === cat.id && styles.categoryChipOn,
                    ]}
                    onPress={() => setGiftCategory(cat.id)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        giftCategory === cat.id && styles.categoryTextOn,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={[styles.giftGrid, loading && styles.dimmed]}>
                {filteredGifts.map((gift) => (
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
            </>
          ) : (
            <>
              <View style={[styles.amountRow, loading && styles.dimmed]}>
                {LIVE_DONATION_PRESETS.map((amt) => (
                  <Pressable
                    key={amt}
                    style={[
                      styles.amountChip,
                      donationAmount === amt && !customAmount && styles.amountChipOn,
                    ]}
                    onPress={() => {
                      setDonationAmount(amt);
                      setCustomAmount("");
                    }}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.amountText,
                        donationAmount === amt && !customAmount && styles.amountTextOn,
                      ]}
                    >
                      {amt}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                placeholder="Custom amount (KES)"
                placeholderTextColor="#888"
                value={customAmount}
                onChangeText={setCustomAmount}
                keyboardType="number-pad"
                style={styles.input}
                editable={!loading}
              />
              <Pressable
                style={styles.donateBtn}
                onPress={handleDonate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.donateBtnText}>
                    Donate KES {(resolveDonationAmount() ?? donationAmount).toLocaleString()}
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
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    paddingBottom: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: TT.glassBorder,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "900" },
  leaderboard: {
    marginBottom: 12,
    gap: 8,
  },
  leaderTitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  leaderChip: {
    backgroundColor: TT.glass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TT.glassBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    minWidth: 100,
  },
  leaderRank: { color: TT.accentGold, fontSize: 10, fontWeight: "900" },
  leaderName: { color: "#fff", fontSize: 12, fontWeight: "700", marginTop: 2 },
  leaderAmt: { color: TT.accentCyan, fontSize: 10, fontWeight: "800", marginTop: 2 },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: TT.glass,
    borderWidth: 1,
    borderColor: TT.glassBorder,
    alignItems: "center",
  },
  tabActive: { backgroundColor: TT.liveRed, borderColor: "rgba(255,255,255,0.2)" },
  tabText: { color: "#aaa", fontWeight: "700" },
  tabTextOn: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: TT.glassBorder,
    borderRadius: 14,
    padding: 12,
    color: "#fff",
    marginBottom: 12,
    backgroundColor: TT.pillBg,
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
  categoryScroll: { marginBottom: 10, maxHeight: 40 },
  categoryRow: { gap: 8, paddingRight: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: TT.glass,
    borderWidth: 1,
    borderColor: TT.glassBorder,
  },
  categoryChipOn: {
    backgroundColor: TT.liveRed,
    borderColor: "rgba(255,255,255,0.25)",
  },
  categoryText: { color: "#bbb", fontWeight: "700", fontSize: 12 },
  categoryTextOn: { color: "#fff" },
  giftGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  giftCell: {
    width: (SCREEN_W - 52) / 4,
    alignItems: "center",
    backgroundColor: TT.glass,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TT.glassBorder,
    paddingVertical: 12,
  },
  giftEmoji: { fontSize: 26 },
  giftLabel: { color: "#fff", fontSize: 9, fontWeight: "700", marginTop: 4 },
  giftPrice: { color: TT.accentCyan, fontSize: 8, marginTop: 2, fontWeight: "800" },
  amountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  amountChip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: TT.glass,
    borderWidth: 1,
    borderColor: TT.glassBorder,
  },
  amountChipOn: { backgroundColor: TT.liveRed, borderColor: "rgba(255,255,255,0.2)" },
  amountText: { color: "#ccc", fontWeight: "700" },
  amountTextOn: { color: "#fff" },
  donateBtn: {
    backgroundColor: TT.liveRed,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  donateBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
