import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Pressable,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
const Notifications = () => {
  const { theme } = useTheme();
  const [mentions, setMentions] = useState(true);
  const [followers, setFollowers] = useState(true);
  const [messages, setMessages] = useState(true);
  const [updates, setUpdates] = useState(false);

  const settings = [
    { label: "Mentions & Comments", value: mentions, setter: setMentions },
    { label: "New Followers", value: followers, setter: setFollowers },
    { label: "Direct Messages", value: messages, setter: setMessages },
    { label: "BroadCast Updates", value: updates, setter: setUpdates },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Back Button */}

      {/* Header */}
      <Text style={[styles.header, { color: theme.text }]}>Notifications</Text>
      <Text style={[styles.subtitle, { color: theme.subtext }]}>
        Manage how BroadCast keeps you updated
      </Text>

      {/* Settings Cards */}
      {settings.map((setting, index) => (
        <View
          key={index}
          style={[
            styles.card,
            { backgroundColor: theme.card, shadowColor: theme.background },
          ]}
        >
          <Text style={[styles.label, { color: theme.text }]}>
            {setting.label}
          </Text>
          <Switch
            value={setting.value}
            onValueChange={setting.setter}
            trackColor={{ false: "#ccc", true: "#4ade80" }}
            thumbColor={setting.value ? "#16a34a" : "#f4f3f4"}
          />
        </View>
      ))}

      {/* Footer Info */}
      <Text style={[styles.footer, { color: theme.subtext }]}>
        You can turn off notifications anytime in your device settings.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    fontSize: 13,
    marginTop: 30,
    lineHeight: 20,
    textAlign: "center",
  },
});

export default Notifications;
