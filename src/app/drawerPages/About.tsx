import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Linking,
  Image,
  Pressable,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import Constants from "expo-constants";

const AboutScreen = () => {
  const { theme } = useTheme();
  
  const appVersion = Constants.expoConfig?.version;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Image source={require("../../../assets/images/icon.jpg")} style={styles.logo} />
        <Text style={[styles.title, { color: theme.text }]}>BroadCast</Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>
          Your Voice. Your Platform.
        </Text>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          About BroadCast
        </Text>
        <Text style={[styles.paragraph, { color: theme.subtext }]}>
          BroadCast is a political engagement platform designed to connect
          citizens, leaders, and communities. Our mission is to empower people
          to share their voices, access verified information, and engage in
          meaningful conversations that shape the future.
        </Text>
      </View>

      {/* Mission */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Our Mission
        </Text>
        <Text style={[styles.paragraph, { color: theme.subtext }]}>
          To promote transparency, accountability, and civic participation by
          providing a space where political discourse is accessible, respectful,
          and impactful.
        </Text>
      </View>

      {/* Contact */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Contact & Support
        </Text>
        <Text
          style={[styles.link, { color: theme.primary }]}
          onPress={() => Linking.openURL("mailto:techredant@gmail.com")}
        >
          techredant@gmail.com
        </Text>
        <Text
          style={[styles.link, { color: theme.primary }]}
          onPress={() => Linking.openURL("https://broadcastKe.com")}
        >
          www.broadcastKe.com
        </Text>
      </View>

      {/* Version Info */}
      <View style={styles.footer}>
        <Text style={[styles.version, { color: theme.subtext }]}>
          Version {appVersion}
        </Text>
        <Text style={[styles.copyright, { color: theme.subtext }]}>
          © {new Date().getFullYear()} BroadCast
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginVertical: 30,
  },
  logo: {
    height: 80,
    width: 80,
    borderRadius: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    textAlign: "center",
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
  footer: {
    alignItems: "center",
    marginTop: 40,
  },
  version: {
    fontSize: 13,
  },
  copyright: {
    fontSize: 13,
    marginTop: 4,
  },
});

export default AboutScreen;
