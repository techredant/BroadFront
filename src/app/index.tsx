import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function StartupSplashScreen() {
  return (
    <LinearGradient colors={["#020617", "#0F172A", "#111827"]} style={styles.root}>
      <View style={styles.content}>
        <Image
          source={require("@/assets/images/icon.jpg")}
          style={styles.logo}
          contentFit="cover"
        />
        <Text style={styles.title}>Broadcast</Text>
        <Text style={styles.subtitle}>Loading your space...</Text>
        <ActivityIndicator color="#C9A227" style={styles.loader} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 118,
    height: 118,
    borderRadius: 32,
  },
  title: {
    marginTop: 22,
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    color: "rgba(255,255,255,0.68)",
    fontSize: 14,
    fontWeight: "500",
  },
  loader: {
    marginTop: 24,
  },
});
