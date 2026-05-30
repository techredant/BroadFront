import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useUser } from "@clerk/clerk-expo";
import * as ImagePicker from "expo-image-picker";
import { Dropdown } from "react-native-element-dropdown";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useUserOnboarding } from "@/context/UserOnBoardingContext";
import { useLevel } from "@/context/LevelContext";
import { API_PUBLIC_URL } from "@/constants/api";
import { uploadProfileImage } from "@/utils/mediaUpload";
import { isLocalMediaUri } from "@/utils/mediaUtils";
import { PoliticalPalette } from "@/constants/politicalTheme";

const accountOptions = [
  "Personal Account",
  "Business Account",
  "Non-profit and Community Account",
  "Public Figure Account",
  "Media and Publisher Account",
  "News and Media Outlet",
  "E-commerce and Retail Account",
  "Entertainment and Event Account",
];

const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?name=User&background=1B3A6B&color=fff&size=128";

function FieldLabel({ children, theme }: { children: string; theme: { subtext: string } }) {
  return <Text style={[styles.label, { color: theme.subtext }]}>{children}</Text>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={styles.errorRow}>
      <Ionicons name="alert-circle" size={14} color="#DC2626" />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const NamesScreen = () => {
  const router = useRouter();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { refreshUserDetails } = useLevel();

  const {
    setHasCompletedName,
    setMyAccountType,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    nickName,
    setNickName,
    image,
    setImage,
    companyName,
    setCompanyName,
  } = useUserOnboarding();

  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState(accountOptions[0]);
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    nickName: "",
    accountType: "",
    companyName: "",
  });

  const isPersonal = accountType === "Personal Account";

  const dropdownData = useMemo(
    () => accountOptions.map((i) => ({ label: i, value: i })),
    [],
  );

  const inputStyle = useMemo(
    () => [
      styles.input,
      {
        color: theme.text,
        backgroundColor: isDark ? "#1a1a1a" : "#f8f8fa",
        borderColor: theme.border,
      },
    ],
    [theme, isDark],
  );

  const dropdownProps = useMemo(
    () => ({
      style: [
        styles.input,
        styles.dropdown,
        {
          backgroundColor: isDark ? "#1a1a1a" : "#f8f8fa",
          borderColor: theme.border,
        },
      ],
      containerStyle: {
        backgroundColor: theme.card,
        borderRadius: 12,
        borderColor: theme.border,
        overflow: "hidden" as const,
      },
      itemContainerStyle: { backgroundColor: theme.card },
      itemTextStyle: { color: theme.text, fontSize: 13 },
      selectedTextStyle: { color: theme.text, fontSize: 13 },
      placeholderStyle: { color: theme.subtext },
      activeColor: isDark ? "#262626" : "#f0f0f0",
    }),
    [theme, isDark],
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImage(result.assets[0].uri);
    }
  };

  const validateFields = () => {
    const newErrors = {
      firstName: "",
      lastName: "",
      nickName: "",
      accountType: "",
      companyName: "",
    };

    let valid = true;

    if (isPersonal) {
      if (!firstName.trim()) {
        newErrors.firstName = "First name is required";
        valid = false;
      }
      if (!lastName.trim()) {
        newErrors.lastName = "Last name is required";
        valid = false;
      }
      if (!nickName.trim()) {
        newErrors.nickName = "Nickname is required";
        valid = false;
      }
    } else {
      if (!companyName.trim()) {
        newErrors.companyName = "Organization name is required";
        valid = false;
      }
      if (!nickName.trim()) {
        newErrors.nickName = "Nickname is required";
        valid = false;
      }
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateFields()) return;

    setLoading(true);

    try {
      let finalImage = image;

      if (image && isLocalMediaUri(image)) {
        const uploaded = await uploadProfileImage(image);
        if (uploaded) finalImage = uploaded;
      }

      const formattedNickName = nickName.startsWith("@")
        ? nickName
        : `@${nickName}`;

      const payload = {
        clerkId: user?.id,
        email: user?.primaryEmailAddress?.emailAddress || "",
        firstName: isPersonal ? firstName : "",
        lastName: isPersonal ? lastName : "",
        companyName: !isPersonal ? companyName : "",
        nickName: formattedNickName,
        image: finalImage,
        accountType,
      };

      const res = await axios.post(
        `${API_PUBLIC_URL}/api/users/create-user`,
        payload,
        { timeout: 10000 },
      );

      if (!res.data?.success) return;

      setHasCompletedName(true);
      setMyAccountType(accountType);

      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          myAccountType: accountType,
          hasCompletedName: true,
          onboardingComplete: !isPersonal,
        },
      });

      await refreshUserDetails();

      if (isPersonal) {
        router.replace("/(onboarding)/location");
      } else {
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error(err);
      setErrors((p) => ({
        ...p,
        accountType: "Failed to save profile. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <LinearGradient
        colors={
          isDark
            ? [PoliticalPalette.navyDark, PoliticalPalette.navy]
            : [PoliticalPalette.navy, "#254a85"]
        }
        style={[styles.hero, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.goldBar} />
        <View style={styles.stepRow}>
          <View style={styles.stepPill}>
            <Text style={styles.stepText}>Step 1 of 2</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Set up your profile</Text>
        <Text style={styles.heroSubtitle}>
          Tell the community who you are. You can update this later in settings.
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Pressable onPress={pickImage} style={styles.avatarWrap}>
              <Image
                source={{ uri: image || DEFAULT_AVATAR }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <View style={[styles.avatarBadge, { backgroundColor: theme.primary }]}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </Pressable>
            <Text style={[styles.avatarHint, { color: theme.subtext }]}>
              Tap to add a profile photo
            </Text>

            <FieldLabel theme={theme}>Account type</FieldLabel>
            <Dropdown
              {...dropdownProps}
              data={dropdownData}
              labelField="label"
              valueField="value"
              value={accountType}
              onChange={(item) => {
                setAccountType(item.value);
                setErrors((p) => ({ ...p, accountType: "" }));
              }}
              placeholder="Select account type"
            />
            <FieldError message={errors.accountType} />

            {isPersonal ? (
              <>
                <FieldLabel theme={theme}>First name</FieldLabel>
                <TextInput
                  placeholder="First name"
                  placeholderTextColor={theme.subtext}
                  value={firstName}
                  onChangeText={(t) => {
                    setFirstName(t);
                    if (errors.firstName) setErrors((p) => ({ ...p, firstName: "" }));
                  }}
                  style={inputStyle}
                  autoCapitalize="words"
                />
                <FieldError message={errors.firstName} />

                <FieldLabel theme={theme}>Last name</FieldLabel>
                <TextInput
                  placeholder="Last name"
                  placeholderTextColor={theme.subtext}
                  value={lastName}
                  onChangeText={(t) => {
                    setLastName(t);
                    if (errors.lastName) setErrors((p) => ({ ...p, lastName: "" }));
                  }}
                  style={inputStyle}
                  autoCapitalize="words"
                />
                <FieldError message={errors.lastName} />

                <FieldLabel theme={theme}>Nickname</FieldLabel>
                <View style={[styles.nickRow, { borderColor: theme.border, backgroundColor: isDark ? "#1a1a1a" : "#f8f8fa" }]}>
                  <Text style={[styles.nickPrefix, { color: theme.subtext }]}>@</Text>
                  <TextInput
                    placeholder="yourname"
                    placeholderTextColor={theme.subtext}
                    value={nickName.replace(/^@+/, "")}
                    onChangeText={(t) => {
                      const clean = t.replace(/^@+/, "").toLowerCase();
                      setNickName(clean);
                      if (errors.nickName) setErrors((p) => ({ ...p, nickName: "" }));
                    }}
                    style={[styles.nickInput, { color: theme.text }]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <FieldError message={errors.nickName} />
              </>
            ) : (
              <>
                <FieldLabel theme={theme}>Organization name</FieldLabel>
                <TextInput
                  placeholder="Organization or brand name"
                  placeholderTextColor={theme.subtext}
                  value={companyName}
                  onChangeText={(t) => {
                    setCompanyName(t);
                    if (errors.companyName) setErrors((p) => ({ ...p, companyName: "" }));
                  }}
                  style={inputStyle}
                />
                <FieldError message={errors.companyName} />

                <FieldLabel theme={theme}>Public handle</FieldLabel>
                <View style={[styles.nickRow, { borderColor: theme.border, backgroundColor: isDark ? "#1a1a1a" : "#f8f8fa" }]}>
                  <Text style={[styles.nickPrefix, { color: theme.subtext }]}>@</Text>
                  <TextInput
                    placeholder="handle"
                    placeholderTextColor={theme.subtext}
                    value={nickName.replace(/^@+/, "")}
                    onChangeText={(t) => {
                      const clean = t.replace(/^@+/, "");
                      setNickName(clean);
                      if (errors.nickName) setErrors((p) => ({ ...p, nickName: "" }));
                    }}
                    style={[styles.nickInput, { color: theme.text }]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <FieldError message={errors.nickName} />
              </>
            )}
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <Text style={[styles.footerNote, { color: "black" }]}>
            {isPersonal
              ? "Next you’ll choose your county and constituency."
              : "You’ll go straight to your feed after this step."}
          </Text>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.submitOuter,
              { opacity: loading ? 0.75 : pressed ? 0.92 : 1 },
            ]}
          >
            <LinearGradient
              colors={
                isDark
                  ? [PoliticalPalette.navyDark, PoliticalPalette.navy]
                  : [PoliticalPalette.navy, "#254a85"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitText}>Save & continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default NamesScreen;

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: "hidden",
  },
  goldBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: PoliticalPalette.gold,
  },
  stepRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  stepPill: {
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  stepText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "600",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 320,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 16,
  },
  avatarWrap: {
    alignSelf: "center",
    marginBottom: 8,
    position: "relative",
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    borderColor: PoliticalPalette.gold,
  },
  avatarBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarHint: {
    textAlign: "center",
    fontSize: 12,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 14,
    marginBottom: 4,
  },
  dropdown: {
    marginBottom: 4,
  },
  nickRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  nickPrefix: {
    fontSize: 15,
    fontWeight: "600",
    marginRight: 2,
  },
  nickInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
    marginTop: 2,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 11,
    flex: 1,
  },
  submitOuter: {
    borderRadius: 14,
    overflow: "hidden",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    minHeight: 52,
  },
  submitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  footerNote: {
    textAlign: "center",
    fontSize: 11,
    lineHeight: 17,
  },
});
