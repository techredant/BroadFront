import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/context/ThemeContext";
import { useLevel } from "@/context/LevelContext";

const BASE_URL = "https://cast-api-zeta.vercel.app";

export const EditProfileModal = ({ visible, onClose, userDetails }: any) => {
  const { user } = useUser();
  const { theme } = useTheme();
  const { refreshUserDetails } = useLevel();

  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [image, setImage] = useState("");

  const accountType = userDetails?.accountType;
  const isPersonal = accountType === "Personal Account";

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    if (userDetails && visible) {
      setFirstName(userDetails.firstName || "");
      setLastName(userDetails.lastName || "");
      setCompanyName(userDetails.companyName || "");
      setImage(userDetails.image || "");
    }
  }, [userDetails, visible]);

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

  /* ---------------- UPLOAD ---------------- */
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

  /* ---------------- SAVE ---------------- */
  const handleSave = async () => {
    setLoading(true);

    try {
      let finalImage = image;

      if (image?.startsWith("file://")) {
        const uploaded = await uploadToCloudinary(image);
        if (uploaded) finalImage = uploaded;
      }

     const payload = {
       clerkId: user?.id,
       email: user?.primaryEmailAddress?.emailAddress, // ✅ ADD THIS
       firstName: isPersonal ? firstName : "",
       lastName: isPersonal ? lastName : "",
       companyName: !isPersonal ? companyName : "",
       image: finalImage,
     };

      await axios.post(`${BASE_URL}/api/users/create-user`, payload, {
        timeout: 10000,
      });

      await refreshUserDetails();
      onClose();
    } catch (err) {
      console.error("Update failed:", err);
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

            {/* IMAGE */}
            <TouchableOpacity onPress={pickImage} style={styles.imageBox}>
              <Image
                source={{ uri: image || "https://via.placeholder.com/100" }}
                style={styles.image}
              />
              <Text style={{ color: theme.subtext }}>Change Photo</Text>
            </TouchableOpacity>

            {/* ACCOUNT TYPE (LOCKED) */}
            <View style={[styles.lockedBox, { borderColor: theme.border}]}>
              <Text style={[styles.lockLabel, { color: theme.subtext }]}>
                Account Type (locked)
              </Text>
              <Text style={[styles.lockValue, { color: theme.text }]}>
                {accountType}
              </Text>
            </View>

            {/* NAME FIELDS */}
            {isPersonal ? (
              <>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First Name"
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                />

                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last Name"
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                />
              </>
            ) : (
              <TextInput
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Company Name"
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
            )}

            {/* NICKNAME (READ ONLY) */}
            <View style={[styles.lockedBox, {borderColor: theme.border} ]}>
              <Text style={[styles.lockLabel, { color: theme.subtext }]}>
                Nickname (cannot be changed)
              </Text>
              <Text style={[styles.lockValue, { color: theme.text }]}>
                {userDetails?.nickName}
              </Text>
            </View>

            {/* BUTTONS */}
            <View style={styles.btnRow}>
              <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { borderColor: theme.border}]}>
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveBtn, { backgroundColor: theme.primary, borderColor: theme.border }]}
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

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },

  container: {
    height: "70%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30, // 👌 nicer spacing
  },

  title: {
    fontSize: 18,
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
    fontSize: 12,
  },

  lockValue: {
    fontSize: 14,
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

