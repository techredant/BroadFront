// EditProfile.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { uploadProfileImage } from "@/utils/mediaUpload";
import { imagePickerMediaOptions, isLocalMediaUri } from "@/utils/mediaUtils";
import axios from "axios";
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";
import { Dropdown } from "react-native-element-dropdown";
import iebc from "../../../assets/data/iebc.json";
import { isProfileUpdatePending } from "@/utils/profileUpdate";

const BASE_URL = "https://cast-api-zeta.vercel.app";

const norm = (value?: string | null) => (value ?? "").trim();

export const EditProfileModal = ({ visible, onClose, userDetails }: any) => {
  const { user } = useUser();
  const { theme } = useTheme();
  const { updateUserDetails, refreshUserDetails } = useLevel();

  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [county, setCounty] = useState<string | null>(null);
  const [constituency, setConstituency] = useState<string | null>(null);
  const [ward, setWard] = useState<string | null>(null);
  const [image, setImage] = useState("");
  const prevVisibleRef = useRef(false);

  const accountType = userDetails?.accountType;
  const isPersonal = accountType === "Personal Account";
  const textUpdatePending = isProfileUpdatePending(userDetails);

  /** Hydrate form only when the modal opens — not on every userDetails refresh */
  useEffect(() => {
    const justOpened = visible && !prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (!justOpened || !userDetails) return;

    setFirstName(
      userDetails.pendingFirstName ?? userDetails.firstName ?? "",
    );
    setLastName(userDetails.pendingLastName ?? userDetails.lastName ?? "");
    setCompanyName(
      userDetails.pendingCompanyName ?? userDetails.companyName ?? "",
    );
    setCounty(userDetails.pendingCounty ?? userDetails.county ?? null);
    setConstituency(
      userDetails.pendingConstituency ?? userDetails.constituency ?? null,
    );
    setWard(userDetails.pendingWard ?? userDetails.ward ?? null);
    setImage(userDetails.image ?? "");
  }, [visible, userDetails]);

  const constituencies = useMemo(() => {
    if (!county) return [];
    const match = iebc.counties.find((item) => item.name === county);
    return match?.constituencies ?? [];
  }, [county]);

  const wards = useMemo(() => {
    if (!constituency) return [];
    const match = constituencies.find((item) => item.name === constituency);
    return match?.wards ?? [];
  }, [constituency, constituencies]);

  const dropdownStyle = {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: theme.background,
  };

  const dropdownProps = {
    style: dropdownStyle,
    containerStyle: {
      backgroundColor: theme.card,
      borderRadius: 10,
      borderColor: theme.border,
    },
    itemContainerStyle: { backgroundColor: theme.card },
    itemTextStyle: { color: theme.text },
    selectedTextStyle: { color: theme.text },
    placeholderStyle: { color: theme.subtext },
    searchInputStyle: {
      color: theme.text,
      backgroundColor: theme.background,
      borderRadius: 8,
    },
    searchPlaceholderTextColor: theme.subtext,
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      ...imagePickerMediaOptions,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImage(result.assets[0].uri);
    }
  };

  const hasScheduledFieldChanges = () => {
    if (isPersonal) {
      const baseFirst = textUpdatePending
        ? (userDetails?.pendingFirstName ?? userDetails?.firstName)
        : userDetails?.firstName;
      const baseLast = textUpdatePending
        ? (userDetails?.pendingLastName ?? userDetails?.lastName)
        : userDetails?.lastName;
      const baseCounty = textUpdatePending
        ? (userDetails?.pendingCounty ?? userDetails?.county)
        : userDetails?.county;
      const baseConstituency = textUpdatePending
        ? (userDetails?.pendingConstituency ?? userDetails?.constituency)
        : userDetails?.constituency;
      const baseWard = textUpdatePending
        ? (userDetails?.pendingWard ?? userDetails?.ward)
        : userDetails?.ward;
      return (
        norm(firstName) !== norm(baseFirst) ||
        norm(lastName) !== norm(baseLast) ||
        norm(county) !== norm(baseCounty) ||
        norm(constituency) !== norm(baseConstituency) ||
        norm(ward) !== norm(baseWard)
      );
    }
    const baseCompany = textUpdatePending
      ? (userDetails?.pendingCompanyName ?? userDetails?.companyName)
      : userDetails?.companyName;
    return norm(companyName) !== norm(baseCompany);
  };

  const hasImageChanges = () =>
    Boolean(image && image !== (userDetails?.image ?? ""));

  const handleSave = async () => {
    if (textUpdatePending && hasScheduledFieldChanges()) {
      return;
    }

    if (!hasImageChanges() && !hasScheduledFieldChanges()) {
      onClose();
      return;
    }

    try {
      setLoading(true);

      let finalImage = userDetails?.image ?? "";
      if (image && isLocalMediaUri(image)) {
        const uploaded = await uploadProfileImage(image);
        if (!uploaded) {
          Alert.alert(
            "Upload failed",
            "Could not upload your profile photo. Please try again.",
          );
          return;
        }
        finalImage = uploaded;
      } else if (hasImageChanges()) {
        finalImage = image;
      }

      const payload = {
        clerkId: user?.id,
        email: user?.primaryEmailAddress?.emailAddress,
        firstName: isPersonal ? firstName.trim() : "",
        lastName: isPersonal ? lastName.trim() : "",
        companyName: !isPersonal ? companyName.trim() : "",
        ...(isPersonal
          ? {
              county: county ?? "",
              constituency: constituency ?? "",
              ward: ward ?? "",
            }
          : {}),
        image: finalImage || undefined,
        nickName: userDetails?.nickName,
        accountType: userDetails?.accountType,
        provider: userDetails?.provider || "clerk",
      };

      const res = await axios.post(`${BASE_URL}/api/users/create-user`, payload);

      const savedUser = res.data?.user;
      if (savedUser) {
        updateUserDetails(savedUser);
      }

      await refreshUserDetails();
      onClose();
    } catch (err: any) {
      const serverUser = err?.response?.data?.user;
      if (serverUser) {
        updateUserDetails(serverUser);
      }
      const msg =
        err?.response?.data?.message ||
        "Could not save your profile. Try again later.";
      Alert.alert("Could not update", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          <ScrollView>
            <Text style={[styles.title, { color: theme.text }]}>
              Edit Profile
            </Text>

            <TouchableOpacity onPress={pickImage} style={styles.imageBox}>
              <Image
                key={image || "profile-photo"}
                source={image ? { uri: image } : undefined}
                style={styles.image}
                contentFit="cover"
                cachePolicy="none"
              />
              <Text style={{ color: theme.subtext }}>Change Photo</Text>
            </TouchableOpacity>

            <View style={[styles.lockedBox, { borderColor: theme.border }]}>
              <Text style={[styles.lockLabel, { color: theme.subtext }]}>
                Account Type (locked)
              </Text>
              <Text style={[styles.lockValue, { color: theme.text }]}>
                {accountType}
              </Text>
            </View>

            {isPersonal ? (
              <>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First Name"
                  placeholderTextColor={theme.subtext}
                  editable={!textUpdatePending}
                  style={[
                    styles.input,
                    { color: theme.text, borderColor: theme.border },
                  ]}
                />
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last Name"
                  placeholderTextColor={theme.subtext}
                  editable={!textUpdatePending}
                  style={[
                    styles.input,
                    { color: theme.text, borderColor: theme.border },
                  ]}
                />

                <Text style={[styles.fieldLabel, { color: theme.subtext }]}>
                  County
                </Text>
                <Dropdown
                  {...dropdownProps}
                  data={iebc.counties}
                  labelField="name"
                  valueField="name"
                  placeholder="Select County"
                  value={county}
                  search
                  searchPlaceholder="Search county..."
                  disable={textUpdatePending}
                  onChange={(item) => {
                    setCounty(item.name);
                    setConstituency(null);
                    setWard(null);
                  }}
                />

                <Text style={[styles.fieldLabel, { color: theme.subtext }]}>
                  Constituency
                </Text>
                <Dropdown
                  {...dropdownProps}
                  data={constituencies}
                  labelField="name"
                  valueField="name"
                  placeholder="Select Constituency"
                  value={constituency}
                  search
                  searchPlaceholder="Search constituency..."
                  disable={textUpdatePending || !county}
                  onChange={(item) => {
                    setConstituency(item.name);
                    setWard(null);
                  }}
                />

                <Text style={[styles.fieldLabel, { color: theme.subtext }]}>
                  Ward
                </Text>
                <Dropdown
                  {...dropdownProps}
                  data={wards}
                  labelField="name"
                  valueField="name"
                  placeholder="Select Ward"
                  value={ward}
                  search
                  searchPlaceholder="Search ward..."
                  disable={textUpdatePending || !constituency}
                  onChange={(item) => {
                    setWard(item.name);
                  }}
                />
              </>
            ) : (
              <TextInput
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Company Name"
                placeholderTextColor={theme.subtext}
                editable={!textUpdatePending}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.border },
                ]}
              />
            )}

            <View style={[styles.lockedBox, { borderColor: theme.border }]}>
              <Text style={[styles.lockLabel, { color: theme.subtext }]}>
                Nickname (cannot be changed)
              </Text>
              <Text style={[styles.lockValue, { color: theme.text }]}>
                {userDetails?.nickName}
              </Text>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.cancelBtn, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => void handleSave()}
                disabled={loading || (textUpdatePending && !hasImageChanges())}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor:
                      loading || (textUpdatePending && !hasImageChanges())
                        ? theme.border
                        : theme.primary,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff" }}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    height: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 15,
  },
  imageBox: {
    alignItems: "center",
    marginBottom: 15,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 6,
    backgroundColor: "#ccc",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  lockedBox: {
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    marginBottom: 10,
    opacity: 0.7,
  },
  lockLabel: {
    fontSize: 11,
  },
  lockValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  fieldLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    marginRight: 10,
    alignItems: "center",
  },
  saveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});
