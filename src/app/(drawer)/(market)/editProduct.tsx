import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useRouter } from "expo-router"; // ✅ Expo Router
import * as ImagePicker from "expo-image-picker";
import { useUser } from "@clerk/clerk-expo";
import { useTheme } from "@/context/ThemeContext";
import axios from "axios";
import Video from "react-native-video";

const EditProduct = ({
  visible,
  onClose,
  product,
  onSubmit = async () => {},
}: any) => {
  const { theme, isDark } = useTheme();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  const [media, setMedia] = useState<
    { uri: string; type: "image" | "video" }[]
  >([]);

  const [titleError, setTitleError] = useState("");
  const [priceError, setPriceError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [imagesError, setImagesError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [phoneNumberError, setPhoneNumberError] = useState("");

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const categories = [
    "Electronics",
    "Mobile Phones",
    "Computers & Laptops",
    "Accessories",
    "Home Appliances",
    "Fashion",
    "Clothing",
    "Shoes",
    "Bags",
    "Jewelry & Watches",
    "Health & Beauty",
    "Sports & Fitness",
    "Toys & Games",
    "Baby & Kids",
    "Furniture",
    "Home & Garden",
    "Kitchen & Dining",
    "Pets & Animals",
    "Books",
    "Music & Instruments",
    "Art & Collectibles",
    "Vehicles",
    "Cars",
    "Motorcycles",
    "Agriculture",
    "Industrial Equipment",
    "Real Estate",
    "Services",
  ];

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const assets = result.assets.map((a) => ({
        uri: a.uri,
        type: a.type as "image" | "video",
      }));
      setMedia((prev) => [...prev, ...assets]);
      setImagesError("");
    }
  };

  const takePhotoOrVideo = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
    });

    if (!result.canceled) {
      setMedia((prev) => [
        ...prev,
        {
          uri: result.assets[0].uri,
          type: result.assets[0].type as "image" | "video",
        },
      ]);
      setImagesError("");
    }
  };

  useEffect(() => {
    if (product) {
      setTitle(product.title || "");
      setPrice(product.price?.toString() || "");
      setDescription(product.description || "");
      setCategory(product.category || "");
      setPhoneNumber(String(product.phoneNumber || ""));

      setMedia(
        product.media?.map((item: string) => ({
          uri: item,
          type: /\.(mp4|mov|webm)$/i.test(item) ? "video" : "image",
        })) || [],
      );
    }
  }, [product]);

  const removeMedia = (uri: string) => {
    setMedia((prev) => prev.filter((m) => m.uri !== uri));
  };

  const uploadToCloudinary = async (uri: string, type: "image" | "video") => {
    const data = new FormData();
    data.append("file", {
      uri,
      type: type === "video" ? "video/mp4" : "image/jpeg",
      name: type === "video" ? "upload.mp4" : "upload.jpg",
    } as any);

    data.append("upload_preset", "MediaCast");
    data.append("cloud_name", "ds25oyyqo");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/ds25oyyqo/${type}/upload`,
      { method: "POST", body: data },
    );

    const result = await res.json();
    return result.secure_url;
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const uploadedUrls = await Promise.all(
        media.map(async (item) => {
          if (item.uri.startsWith("http")) return item.uri;
          return await uploadToCloudinary(item.uri, item.type);
        }),
      );

      await onSubmit({
        title,
        price,
        description,
        category,
        phoneNumber,
        media: uploadedUrls,
      });

      onClose();
      router.push("/(market)");
    } catch (err: any) {
      console.log("SUBMIT ERROR:", err?.response?.data || err);
      alert("Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <StatusBar
            translucent
            backgroundColor="transparent"
            barStyle={isDark ? "light-content" : "dark-content"}
          />

          <ScrollView contentContainerStyle={styles.form}>
            <View style={styles.headerRow}>
              <View style={{ width: 40 }} />
              <Text style={styles.submitText}>Update Product</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={28} color={theme.subtext} />
              </TouchableOpacity>
            </View>

            {/* --- rest of UI unchanged --- */}
            <Text style={[styles.label, { color: theme.text }]}>
              Product Name
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Enter product name"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={theme.subtext}
            />
            {titleError ? (
              <Text style={styles.errorText}>{titleError}</Text>
            ) : null}

            {/* Price */}
            <Text style={[styles.label, { color: theme.text }]}>
              Price (KES)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Enter price"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
              placeholderTextColor={theme.subtext}
            />
            {priceError ? (
              <Text style={styles.errorText}>{priceError}</Text>
            ) : null}

            <Text style={[styles.label, { color: theme.text }]}>
              Phone Number
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholderTextColor={theme.subtext}
            />

            {phoneNumberError ? (
              <Text style={styles.errorText}>{phoneNumberError}</Text>
            ) : null}

            {/* Description */}
            <Text style={[styles.label, { color: theme.text }]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: theme.card,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Enter product description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor={theme.subtext}
            />
            {descriptionError ? (
              <Text style={styles.errorText}>{descriptionError}</Text>
            ) : null}

            {/* Category */}
            <Text style={[styles.label, { color: theme.text }]}>Category</Text>

            <TouchableOpacity
              style={[
                styles.input,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={{ color: category ? theme.text : theme.subtext }}>
                {category || "Select Category"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.subtext} />
            </TouchableOpacity>

            {categoryError ? (
              <Text style={styles.errorText}>{categoryError}</Text>
            ) : null}
            {categoryError ? (
              <Text style={styles.errorText}>{categoryError}</Text>
            ) : null}

            {/* Images */}
            <Text style={[styles.label, { color: theme.text }]}>
              Product Images ({media.length})
            </Text>
            {media.length > 0 ? (
              media.length === 1 ? (
                <View style={{ marginVertical: 10 }}>
                  {media[0].type === "image" ? (
                    <Image
                      source={{ uri: media[0].uri }}
                      style={styles.fullWidthImage}
                    />
                  ) : (
                    <View
                      style={{
                        borderRadius: 10,
                        overflow: "hidden", // 🔥 IMPORTANT
                        backgroundColor: "#000",
                      }}
                    >
                      <Video
                        source={{ uri: media[0].uri }}
                        style={styles.fullWidthImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.removeBtnSingle}
                    onPress={() => removeMedia(media[0].uri)}
                  >
                    <Ionicons name="close-circle" size={24} color="red" />
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginVertical: 10 }}
                >
                  {[...media].reverse().map((item, index) => (
                    <View
                      key={index}
                      style={{ marginRight: 10, position: "relative" }}
                    >
                      {/* IMAGE OR VIDEO */}
                      {item.type === "image" ? (
                        <Image
                          source={{ uri: item.uri }}
                          style={styles.imagePreview}
                        />
                      ) : (
                        <View
                          style={{
                            borderRadius: 10,
                            overflow: "hidden", // 🔥 IMPORTANT
                            backgroundColor: "#000",
                          }}
                        >
                          <Video
                            source={{ uri: item.uri }}
                            style={styles.imagePreview}
                            resizeMode="cover"
                            muted
                            repeat
                          />
                        </View>
                      )}

                      {/* REMOVE BUTTON */}
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeMedia(item.uri)}
                      >
                        <Ionicons name="close-circle" size={20} color="red" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )
            ) : (
              <TouchableOpacity
                style={[styles.imageUpload, { borderColor: theme.border }]}
                onPress={pickMedia}
              >
                <Ionicons name="camera" size={28} color="#666" />
                <Text style={{ color: "#666", marginTop: 4 }}>
                  Click here to upload Images or Videos
                </Text>
              </TouchableOpacity>
            )}
            {imagesError ? (
              <Text style={styles.errorText}>{imagesError}</Text>
            ) : null}

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={takePhotoOrVideo}
              >
                <Ionicons name="camera" size={24} color="gray" />
                <Text style={{ color: "gray" }}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={pickMedia}>
                <Ionicons name="image" size={24} color="gray" />
                <Text style={{ color: "gray" }}>Gallery</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Edit Product</Text>
              )}
            </TouchableOpacity>
          </ScrollView>

          {/* Category Modal */}
          {showCategoryModal && (
            <View style={styles.modalOverlay}>
              <View
                style={[styles.modalContainer, { backgroundColor: theme.card }]}
              >
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Select Category
                </Text>

                <ScrollView>
                  {categories.map((cat, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.modalItem}
                      onPress={() => {
                        setCategory(cat);
                        setShowCategoryModal(false);
                        setCategoryError("");
                      }}
                    >
                      <Text style={{ color: theme.text }}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setShowCategoryModal(false)}
                >
                  <Text style={{ color: "red" }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
};

export default EditProduct;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", paddingBottom: 40 },
  form: { padding: 16, marginBottom: 30, paddingTop: 40 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12, marginBottom: 6 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerText: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
  },
  textArea: { height: 100, textAlignVertical: "top" },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  pickerWrapper: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  errorText: { color: "red", fontSize: 12, marginTop: 4 },
  submitButton: {
    backgroundColor: "#4caf50",
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  submitContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  imagePreview: { width: 120, height: 120, borderRadius: 10 },
  fullWidthImage: { width: "100%", height: 300, borderRadius: 12 },
  removeBtn: { position: "absolute", top: 5, right: 5 },
  removeBtnSingle: { position: "absolute", top: 10, right: 10 },
  imageUpload: {
    height: 150,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },

  modalContainer: {
    borderRadius: 12,
    maxHeight: "70%",
    padding: 16,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },

  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },

  modalClose: {
    marginTop: 10,
    alignItems: "center",
  },
});
