import React, { ReactNode, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Switch,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/context/ThemeContext";
import { DrawerMenuButton } from "../components/Button/DrawerMenuButton";

type RowProps = {
  label: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  rightElement?: React.ReactNode;
};

type SectionProps = {
  title?: string;
  children: ReactNode;
};

/* ----------------------------- Row Component ----------------------------- */
const Row = ({
  label,
  icon,
  onPress,
  destructive = false,
  rightElement,
}: RowProps) => {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.row,
        { borderBottomColor: theme.border },
        !onPress && { opacity: 0.5 },
      ]}
    >
      <View style={styles.rowContent}>
        {icon && <View>{icon}</View>}
        <Text
          style={[
            { color: theme.text, fontWeight: "600" },
            destructive && { color: "red" },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      <View>
        {rightElement ?? (
          <Feather name="chevron-right" size={18} color={theme.text} />
        )}
      </View>
    </Pressable>
  );
};

/* --------------------------- Section Component ---------------------------- */
const Section = ({ title, children }: SectionProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      {title && (
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: theme.text,
            paddingHorizontal: 16,
            paddingTop: 12,
          }}
        >
          {title}
        </Text>
      )}

      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          marginVertical: 8,
        }}
      />

      <View>{children}</View>
    </View>
  );
};

/* --------------------------- Settings Screen ------------------------------ */
const SettingsScreen = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { user } = useUser();
  const [visible, setVisible] = useState(false);

  const handleConfirmLogout = async () => {
    setVisible(false);
    try {
      await signOut();
      router.replace("/(auth)");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <>
      <DrawerMenuButton />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { backgroundColor: theme.background },
        ]}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            textAlign: "center",
            paddingBottom: 20,
            color: theme.text,
          }}
        >
          Settings & Activity
        </Text>

        {/* ----------------------------- Account ----------------------------- */}
        <Section title="Account">
          <Row
            label="Edit Profile"
            icon={<Feather name="user" size={20} color={theme.text} />}
            // onPress={() => router.push("/(auth)/nameScreen")}
          />

          <Row
            label={isDark ? "Light Mode" : "Dark Mode"}
            icon={
              <Feather
                name={isDark ? "sun" : "moon"}
                size={20}
                color={theme.text}
              />
            }
            rightElement={<Switch value={isDark} onValueChange={toggleTheme} />}
          />
        </Section>

        {/* --------------------------- Preferences --------------------------- */}
        <Section title="Preferences">
          <Row
            label="Notifications"
            icon={
              <Ionicons
                name="notifications-outline"
                size={20}
                color={theme.text}
              />
            }
            // onPress={() => router.push("/drawerPages/Notifications")}
          />

          <Row
            label="Privacy"
            icon={<Feather name="shield" size={20} color={theme.text} />}
            // onPress={() => router.push("/drawerPages/Privacy")}
          />
        </Section>

        {/* ----------------------------- Support ----------------------------- */}
        <Section title="Support">
          <Row
            label="Help Center"
            icon={<Feather name="help-circle" size={20} color={theme.text} />}
            onPress={() => {}}
          />

          <Row
            label="About"
            icon={<Feather name="info" size={20} color={theme.text} />}
            // onPress={() => router.push("/drawerPages/About")}
          />
        </Section>

        {/* ------------------------------ Logout ----------------------------- */}
        <Section>
          <Row
            label="Log Out"
            icon={<MaterialIcons name="logout" size={20} color="red" />}
            destructive
            onPress={() => setVisible(true)}
          />
        </Section>

        {/* --------------------------- Logout Modal --------------------------- */}
        <Modal
          transparent
          animationType="fade"
          visible={visible}
          onRequestClose={() => setVisible(false)}
        >
          <View style={styles.overlay}>
            <View style={[styles.modal, { backgroundColor: theme.card }]}>
              <Text style={[styles.title, { color: theme.text }]}>Log Out</Text>
              <Text style={[styles.message, { color: theme.text }]}>
                Are you sure you want to log out?
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancel,
                    { backgroundColor: theme.border },
                  ]}
                  onPress={() => setVisible(false)}
                >
                  <Text style={[styles.cancelText, { color: theme.text }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.logout]}
                  onPress={handleConfirmLogout}
                >
                  <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </>
  );
};

export default SettingsScreen;

/* -------------------------------- Styles -------------------------------- */
const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 30,
    paddingTop: 30,
    flex: 1,
  },
  section: {
    marginBottom: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    borderRadius: 12,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    flex: 1,
    padding: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: "center",
  },
  cancel: {},
  logout: {
    backgroundColor: "red",
  },
  cancelText: {
    fontWeight: "600",
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600",
  },
});
