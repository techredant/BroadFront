import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Switch } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "@/components/Button/DrawerMenuButton";

const Notifications = () => {
  const { theme } = useTheme();

  const [mentions, setMentions] = useState(true);
  const [followers, setFollowers] = useState(true);
  const [messages, setMessages] = useState(true);
  const [updates, setUpdates] = useState(true);

  /* ===========================
     LOAD SETTINGS
  =========================== */
  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem("notification_settings");
      if (saved) {
        const data = JSON.parse(saved);
        setMentions(data.mentions ?? true);
        setFollowers(data.followers ?? true);
        setMessages(data.messages ?? true);
        setUpdates(data.updates ?? true);
      }
    };
    load();
  }, []);

  /* ===========================
     SAVE SETTINGS
  =========================== */
  const save = async (data: any) => {
    await AsyncStorage.setItem("notification_settings", JSON.stringify(data));
  };

  /* ===========================
     UPDATE TOGGLE
  =========================== */
  const update = (key: string, value: boolean) => {
    const newSettings = {
      mentions,
      followers,
      messages,
      updates,
      [key]: value,
    };

    if (key === "mentions") setMentions(value);
    if (key === "followers") setFollowers(value);
    if (key === "messages") setMessages(value);
    if (key === "updates") setUpdates(value);

    save(newSettings);
  };

  const settings = [
    { label: "Mentions & Comments", value: mentions, key: "mentions" },
    { label: "New Followers", value: followers, key: "followers" },
    { label: "Direct Messages", value: messages, key: "messages" },
    { label: "BroadCast Updates", value: updates, key: "updates" },
  ];

  return (
    <>
      <DrawerMenuButton />

      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <Text style={[styles.header, { color: theme.text }]}>
          Notifications
        </Text>

        <Text style={[styles.subtitle, { color: theme.subtext }]}>
          Manage how BroadCast keeps you updated
        </Text>

        {settings.map((item, i) => (
          <View key={i} style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.label, { color: theme.text }]}>
              {item.label}
            </Text>

            <Switch
              value={item.value}
              onValueChange={(val) => update(item.key, val)}
            />
          </View>
        ))}
      </ScrollView>
    </>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontSize: 21, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 13, textAlign: "center", marginBottom: 20 },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    marginBottom: 10,
    borderRadius: 12,
  },
  label: { fontSize: 15, fontWeight: "600" },
});
