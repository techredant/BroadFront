// app/(auth)/nameScreen.tsx
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as ImagePicker from "expo-image-picker";
import { Dropdown } from "react-native-element-dropdown";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useUserOnboarding } from "@/context/UserOnBoardingContext";
import { useLevel } from "@/context/LevelContext";
import { registerForPushNotificationsAsync } from "@/utils/notification";

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

const NamesScreen = () => {
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { theme, isDark } = useTheme();
  const { refreshUserDetails } = useLevel();

  const {
    firstName = "",
    setFirstName,
    lastName = "",
    setLastName,
    nickName = "",
    setNickName,
    image = "",
    setImage,
    companyName = "",
    setCompanyName,
  } = useUserOnboarding();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    nickName: "",
    accountType: "",
    companyName: "",
  });
  const [accountType, setAccountType] = useState(accountOptions[0]);
  const [isEditing, setIsEditing] = useState(false);

  // Pick image from gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImage(result.assets[0].uri);
    }
  };


  // Validate form fields
  const validateFields = () => {
    const newErrors = {
      firstName: "",
      lastName: "",
      nickName: "",
      accountType: "",
      companyName: "",
    };
    let valid = true;

    if (accountType === "Personal Account") {
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
        newErrors.companyName = "Company name is required";
        valid = false;
      }
      if (!nickName.trim() && !isEditing) {
        newErrors.nickName = "Nickname is required";
        valid = false;
      }
    }

    setErrors(newErrors);
    return valid;
  };


  // Fetch existing user (for editing)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!user?.id) return;
        const res = await axios.get(
          `https://cast-api-zeta.vercel.app/api/users/${user.id}`,
        );
        if (res.data) {
          setFirstName(res.data.firstName || "");
          setLastName(res.data.lastName || "");
          setNickName(res.data.nickName || "");
          setImage(res.data.image || user?.imageUrl);
          setAccountType(res.data.accountType || accountOptions[0]);
          setIsEditing(true);
          setCompanyName(res.data.companyName || "");
        }
      } catch {
        setIsEditing(false);
      }
    };
    fetchUser();
  }, [user]);

  const handleSubmit = async () => {
    // 1️⃣ Validate fields first
    if (!validateFields()) return;

    setLoading(true);

    const formattedNickName = nickName.startsWith("@")
      ? nickName
      : `@${nickName}`;

    try {
      // 2️⃣ Build payload for your backend
      const payload = {
        clerkId: user?.id,
        email: user?.primaryEmailAddress?.emailAddress || "",
        firstName: accountType === "Personal Account" ? firstName : "",
        lastName: accountType === "Personal Account" ? lastName : "",
        companyName: accountType !== "Personal Account" ? companyName : "",
        nickName: formattedNickName,
        image,
        accountType,
      };

      // 3️⃣ Save to backend
      const res = await axios.post(
        "https://cast-api-zeta.vercel.app/api/users/create-user",
        payload,
        { timeout: 10000 }, // prevent hanging
      );

      


      if (!res.data?.success) {
        setErrors((prev) => ({
          ...prev,
          accountType: "Failed to save profile",
        }));
        return;
      }

      // 4️⃣ Update Clerk user metadata safely
      if (user) {
        try {
          await user.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              accountType,
              hasCompletedName: true,
            },
          });
        } catch (err) {
          console.error("Clerk update failed:", err);
        }
      }

      // 5️⃣ Update your LevelContext (or any global context) so drawer re-renders immediately
      await refreshUserDetails();

      // 6️⃣ Navigate to next onboarding step
      if (isEditing) {
        router.replace("/(tabs)"); // 🔥 go back to main app
      } else {
        router.replace("/(onboarding)/location"); // onboarding flow
      }
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setErrors((prev) => ({ ...prev, accountType: "Failed to save profile" }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 10 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              textAlign: "center",
              color: theme.text,
            }}
          >
            Complete Your Profile 🚀
          </Text>

          <TouchableOpacity
            onPress={pickImage}
            style={{ alignItems: "center", marginVertical: 10 }}
          >
            <Image
              source={{
                uri:
                  image ||
                  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNKfj6RsyRZqO4nnWkPFrYMmgrzDmyG31pFQ&s",
              }}
              style={{ width: 100, height: 100, borderRadius: 50 }}
            />
          </TouchableOpacity>

          <Text style={{ color: theme.text, fontWeight: "bold" }}>
            Account Type
          </Text>
          <Dropdown
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 10,
              opacity: isEditing ? 0.6 : 1,
            }}
            disable={isEditing} // 🔥 THIS IS THE REAL FIX
            data={accountOptions.map((item) => ({
              label: item,
              value: item,
            }))}
            labelField="label"
            valueField="value"
            placeholder="Select Account Type"
            value={accountType}
            search
            searchPlaceholder="Search account type..."
            onChange={(item) => setAccountType(item.value)}
          />
          {errors.accountType ? (
            <Text style={{ color: "red" }}>{errors.accountType}</Text>
          ) : null}

          {accountType === "Personal Account" ? (
            <>
              <TextInput
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 5,
                  color: theme.text,
                }}
                placeholderTextColor={theme.subtext}
              />
              {errors.firstName && (
                <Text style={{ color: "red" }}>{errors.firstName}</Text>
              )}

              <TextInput
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 5,
                  color: theme.text,
                }}
                placeholderTextColor={theme.subtext}
              />
              {errors.lastName && (
                <Text style={{ color: "red" }}>{errors.lastName}</Text>
              )}

              <TextInput
                placeholder="Nickname"
                value={nickName}
                onChangeText={setNickName}
                editable={!isEditing} // 🔥 KEY LINE
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 5,
                  color: theme.text,
                  backgroundColor: isEditing ? theme.card : theme.background, // subtle disabled look
                  opacity: isEditing ? 0.6 : 1,
                }}
              />
              {errors.nickName && (
                <Text style={{ color: "red" }}>{errors.nickName}</Text>
              )}
            </>
          ) : (
            <>
              <TextInput
                placeholder="Organization Namae"
                value={companyName}
                onChangeText={setCompanyName}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 5,
                  color: theme.text,
                }}
                placeholderTextColor={theme.subtext}
              />
              {errors.companyName && (
                <Text style={{ color: "red" }}>{errors.companyName}</Text>
              )}

              <TextInput
                placeholder="Organization Nickname"
                value={nickName}
                onChangeText={setNickName}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 5,
                  color: theme.text,
                }}
                placeholderTextColor={theme.subtext}
              />
              {errors.nickName && (
                <Text style={{ color: "red" }}>{errors.nickName}</Text>
              )}
            </>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={{
              backgroundColor: theme.primary,
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 20,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {loading
                ? isEditing
                  ? "Updating..."
                  : "Saving..."
                : isEditing
                  ? "Update Profile"
                  : "Save & Continue"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default NamesScreen;
