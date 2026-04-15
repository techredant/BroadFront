import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Linking,
  Pressable,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

const Privacy = () => {
  const { theme } = useTheme(); // 👈 get current theme

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      {/* Title */}
      <Text
        style={[styles.title, { color: theme.text }]}
        className="text-center"
      >
        Privacy Policy
      </Text>

      <Text
        style={[styles.updated, { color: theme.subtext }]}
        className="text-center"
      >
        Last Updated: {new Date().toLocaleDateString()}
      </Text>

      {/* Section 1 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          1. Information We Collect
        </Text>
        <Text style={[styles.paragraph, { color: theme.subtext }]}>
          BroadCast may collect personal information such as your name, email
          address, account details, and activity within the app. We may also
          collect technical information like device type, operating system, and
          usage data.
        </Text>
      </View>

      {/* Section 2 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          2. How We Use Your Information
        </Text>
        <Text style={[styles.paragraph, { color: theme.subtext }]}>
          We use this data to improve your experience, provide relevant content,
          ensure platform security, and support civic engagement. Your
          information will never be sold to third parties.
        </Text>
      </View>

      {/* Section 3 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          3. Sharing of Information
        </Text>
        <Text style={[styles.paragraph, { color: theme.subtext }]}>
          We may share limited information with trusted service providers for
          analytics, security, and app performance. We do not share your
          personal information with advertisers or political organizations
          without your consent.
        </Text>
      </View>

      {/* Section 4 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          4. Your Rights
        </Text>
        <Text style={[styles.paragraph, { color: theme.subtext }]}>
          You have the right to access, update, or delete your account and data
          at any time. You may also request to opt out of certain data
          collection practices.
        </Text>
      </View>

      {/* Section 5 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          5. Contact Us
        </Text>
        <Text style={[styles.paragraph, { color: theme.subtext }]}>
          If you have any questions or concerns regarding your privacy, please
          contact us:
        </Text>
        <Text
          style={[styles.link, { color: theme.primary }]} // 👈 theme primary color
          onPress={() => Linking.openURL("mailto:privacy@broadcastapp.com")}
        >
          privacy@broadcastapp.com
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  updated: {
    fontSize: 13,
    marginBottom: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    fontSize: 15,
    marginTop: 6,
  },
});

export default Privacy;
