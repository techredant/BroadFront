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

import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as ImagePicker from "expo-image-picker";
import { Dropdown } from "react-native-element-dropdown";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useUserOnboarding } from "@/context/UserOnBoardingContext";
import { useLevel } from "@/context/LevelContext";

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
    setHasCompletedName,
    setMyAccountType,
    myAccountType,
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

  /* ---------------- IMAGE PICK ---------------- */
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

  /* ---------------- CLOUDINARY ---------------- */
  const uploadToCloudinary = async (uri: string) => {
    const data = new FormData();

    data.append("file", {
      uri,
      type: "image/jpeg",
      name: "profile.jpg",
    } as any);

    data.append("upload_preset", "MediaCast");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/ds25oyyqo/image/upload",
      {
        method: "POST",
        body: data,
      },
    );

    const result = await res.json();
    return result.secure_url;
  };

  /* ---------------- VALIDATION ---------------- */
  const validateFields = () => {
    const newErrors = {
      firstName: "",
      lastName: "",
      nickName: "",
      accountType: "",
      companyName: "",
    };

    let valid = true;
    const isPersonal = accountType === "Personal Account";

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

  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async () => {
    if (!validateFields()) return;

    setLoading(true);

    try {
      let finalImage = image;

      if (image?.startsWith("file://")) {
        const uploaded = await uploadToCloudinary(image);
        if (uploaded) finalImage = uploaded;
      }

      const formattedNickName = nickName.startsWith("@")
        ? nickName
        : `@${nickName}`;

      const payload = {
        clerkId: user?.id,
        email: user?.primaryEmailAddress?.emailAddress || "",
        firstName: accountType === "Personal Account" ? firstName : "",
        lastName: accountType === "Personal Account" ? lastName : "",
        companyName: accountType !== "Personal Account" ? companyName : "",
        nickName: formattedNickName,
        image: finalImage,
        accountType,
      };

      const res = await axios.post(
        "https://cast-api-zeta.vercel.app/api/users/create-user",
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
          onboardingComplete: accountType !== "Personal Account",
        },
      });

      await refreshUserDetails();

      if (accountType === "Personal Account") {
        router.replace("/(onboarding)/location");
      } else {
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error(err);
      setErrors((p) => ({
        ...p,
        accountType: "Failed to save profile",
      }));
    } finally {
      setLoading(false);
    }
  };

  const isPersonal = accountType === "Personal Account";

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
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
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

          {/* IMAGE */}
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

          {/* ACCOUNT TYPE */}
          <Text style={{ color: theme.text, fontWeight: "bold" }}>
            Account Type
          </Text>

          <Dropdown
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              padding: 10,
              backgroundColor: theme.background,
            }}
            data={accountOptions.map((i) => ({
              label: i,
              value: i,
            }))}
            labelField="label"
            valueField="value"
            value={accountType}
            onChange={(item) => setAccountType(item.value)}
          />

          {errors.accountType ? (
            <Text style={{ color: "red" }}>{errors.accountType}</Text>
          ) : null}

          {/* FIELDS */}
          {isPersonal ? (
            <>
              <TextInput
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
                style={{ borderWidth: 1, padding: 12, color: theme.text }}
                placeholderTextColor={theme.text}
              />
              {errors.firstName && (
                <Text style={{ color: "red" }}>{errors.firstName}</Text>
              )}

              <TextInput
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
                style={{ borderWidth: 1, padding: 12, color: theme.text }}
                placeholderTextColor={theme.text}
              />
              {errors.lastName && (
                <Text style={{ color: "red" }}>{errors.lastName}</Text>
              )}

              <TextInput
                placeholder="Nickname"
                value={nickName}
                onChangeText={(t) =>
                  setNickName(t.charAt(0).toLowerCase() + t.slice(1))
                }
                style={{ borderWidth: 1, padding: 12, color: theme.text }}
                placeholderTextColor={theme.text}
              />
            </>
          ) : (
            <>
              <TextInput
                placeholder="Organization Name"
                value={companyName}
                onChangeText={setCompanyName}
                style={{ borderWidth: 1, padding: 12, color: theme.text }}
                placeholderTextColor={theme.text}
              />

              <TextInput
                placeholder="Nickname"
                value={nickName}
                onChangeText={setNickName}
                style={{ borderWidth: 1, padding: 12, color: theme.text }}
                placeholderTextColor={theme.text}
              />
            </>
          )}

          {/* SUBMIT */}
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
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                Save & Continue
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default NamesScreen;
