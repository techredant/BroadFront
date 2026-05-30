// EditProfile.tsx
import React, { useEffect, useRef, useState } from "react";
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
import {
  formatProfileCountdown,
  PROFILE_UPDATE_DELAY_LABEL,
  isProfileUpdatePending,
} from "@/utils/profileUpdate";

const BASE_URL = "https://cast-api-zeta.vercel.app";

export const EditProfileModal = ({ visible, onClose, userDetails }: any) => {
  const { user } = useUser();
  const { theme } = useTheme();
  const { updateUserDetails, refreshUserDetails } = useLevel();

  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [image, setImage] = useState("");
  const prevVisibleRef = useRef(false);

  const accountType = userDetails?.accountType;
  const isPersonal = accountType === "Personal Account";
  const updatePending = isProfileUpdatePending(userDetails);

  useEffect(() => {
    if (!visible) {
      setCountdown(null);
      return;
    }

    const tick = () => {
      setCountdown(formatProfileCountdown(userDetails));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [userDetails, visible]);

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
    setImage(userDetails.pendingImage ?? userDetails.image ?? "");
  }, [visible, userDetails]);

  const pickImage = async () => {
    if (updatePending) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      ...imagePickerMediaOptions,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = async (): Promise<boolean> => {
    if (updatePending) {
      Alert.alert(
        "Update scheduled",
        `Your profile update will go live in ${countdown ?? `less than ${PROFILE_UPDATE_DELAY_LABEL}`}.`,
      );
      return false;
    }

    try {
      setLoading(true);

      let finalImage = image;
      if (image && isLocalMediaUri(image)) {
        const uploaded = await uploadProfileImage(image);
        if (!uploaded) {
          Alert.alert(
            "Upload failed",
            "Could not upload your profile photo. Please try again.",
          );
          return false;
        }
        finalImage = uploaded;
      }

      const payload = {
        clerkId: user?.id,
        email: user?.primaryEmailAddress?.emailAddress,
        firstName: isPersonal ? firstName.trim() : "",
        lastName: isPersonal ? lastName.trim() : "",
        companyName: !isPersonal ? companyName.trim() : "",
        image: finalImage,
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

      Alert.alert(
        "Update scheduled",
        `Your profile changes will be visible to everyone after ${PROFILE_UPDATE_DELAY_LABEL}.`,
      );

      return true;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Could not save your profile. Try again later.";
      const serverUser = err?.response?.data?.user;
      if (serverUser) {
        updateUserDetails(serverUser);
      }
      Alert.alert("Could not update", msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const openConfirm = () => {
    if (updatePending) {
      Alert.alert(
        "Please wait",
        `A profile update is already pending. It goes live in ${countdown ?? PROFILE_UPDATE_DELAY_LABEL}.`,
      );
      return;
    }
    setConfirmModal(true);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.container, { backgroundColor: theme.card }]}>
            <ScrollView>
              <Text style={[styles.title, { color: theme.text }]}>
                Edit Profile
              </Text>

              {updatePending && countdown ? (
                <View
                  style={[
                    styles.countdownBox,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.primary,
                    },
                  ]}
                >
                  <Text style={[styles.countdownTitle, { color: theme.text }]}>
                    Update scheduled
                  </Text>
                  <Text
                    style={[styles.countdownText, { color: theme.subtext }]}
                  >
                    Your new profile will be visible in
                  </Text>
                  <Text style={[styles.countdownTimer, { color: theme.primary }]}>
                    {countdown}
                  </Text>
                  <Text style={[styles.countdownHint, { color: theme.subtext }]}>
                    You can submit another change after this update goes live.
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.infoBanner,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <Text style={{ color: theme.subtext, fontSize: 12 }}>
                    Changes take up to {PROFILE_UPDATE_DELAY_LABEL} to appear
                    publicly after you confirm.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={pickImage}
                style={styles.imageBox}
                disabled={updatePending}
              >
                <Image
                  key={image || "profile-photo"}
                  source={image ? { uri: image } : undefined}
                  style={styles.image}
                  contentFit="cover"
                  cachePolicy="none"
                />
                <Text style={{ color: theme.subtext }}>
                  {updatePending ? "Photo locked until update goes live" : "Change Photo"}
                </Text>
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
                    editable={!updatePending}
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
                    editable={!updatePending}
                    style={[
                      styles.input,
                      { color: theme.text, borderColor: theme.border },
                    ]}
                  />
                </>
              ) : (
                <TextInput
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="Company Name"
                  placeholderTextColor={theme.subtext}
                  editable={!updatePending}
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
                  onPress={openConfirm}
                  disabled={updatePending || loading}
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor: updatePending
                        ? theme.border
                        : theme.primary,
                    },
                  ]}
                >
                  <Text style={{ color: "#fff" }}>
                    {updatePending ? "Update pending" : "Update"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={confirmModal} transparent animationType="fade">
        <View style={styles.infoOverlay}>
          <View style={[styles.infoBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.infoTitle, { color: theme.text }]}>
              Confirm update
            </Text>

            <Text style={[styles.infoMessage, { color: theme.subtext }]}>
              Your profile update will be visible to everyone after{" "}
              {PROFILE_UPDATE_DELAY_LABEL}. Until then, your current public
              profile stays the same.
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setConfirmModal(false)}
                style={[styles.infoBtn, { backgroundColor: "#999" }]}
              >
                <Text style={{ color: "#fff" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  const ok = await handleSave();
                  setConfirmModal(false);
                  if (ok) onClose();
                }}
                disabled={loading}
                style={[styles.infoBtn, { backgroundColor: theme.primary }]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff" }}>Schedule update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  infoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoBox: {
    width: "85%",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
  },
  infoMessage: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  infoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  countdownBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: "center",
  },
  countdownTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  countdownText: {
    fontSize: 12,
  },
  countdownTimer: {
    fontSize: 21,
    fontWeight: "800",
    marginVertical: 6,
    fontVariant: ["tabular-nums"],
  },
  countdownHint: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17,
  },
  infoBanner: {
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
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
