// CommentModal.tsx
import React, { useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import axios from "axios";
import moment from "moment";
import { useTheme } from "@/context/ThemeContext";

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  comments: any[];
  setComments: React.Dispatch<React.SetStateAction<any[]>>;
  userId: string;
  userImage?: string;
  userName?: string;
}

export default function CommentModal({
  visible,
  onClose,
  postId,
  comments,
  setComments,
  userId,
  userImage,
  userName,
}: CommentModalProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  // Fix: Use Animated.Value from 'react-native' not 'react-native-reanimated'
  const animatedLike = useRef(new Animated.Value(1)).current;
  const { theme } = useTheme();

  const handleSubmit = async () => {
    if (!text.trim()) return;

    const tempComment = {
      _id: Math.random().toString(),
      postId,
      userId,
      userName: userName || "Anonymous",
      image: userImage,
      text,
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [tempComment, ...prev]);
    setText("");
    setLoading(true);

    try {
      const res = await fetch(
        `https://cast-api-zeta.vercel.app/api/${postId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            text: tempComment.text,
          }),
        },
      );

      const data = await res.json();
      setComments((prev) =>
        prev.map((c) => (c._id === tempComment._id ? data : c)),
      );
    } catch (err) {
      console.error(err);
      setComments((prev) => prev.filter((c) => c._id !== tempComment._id));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    // Optimistic remove
    const previousComments = comments;

    setComments((prev) => prev.filter((c) => c._id !== commentId));

    try {
      await axios.delete(
        `https://cast-api-zeta.vercel.app/api/${commentId}`,
        {
          data: { userId }, // send userId for backend validation
        },
      );
    } catch (error) {
      console.log("Delete failed", error);

      // rollback if failed
      setComments(previousComments);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!userId) return;

    // Optimistic update safely
    setComments((prev) =>
      prev.map((comment) => {
        if (comment._id !== commentId) return comment;

        const likesArray = comment.likes || [];
        const alreadyLiked = likesArray.includes(userId);

        return {
          ...comment,
          likes: alreadyLiked
            ? likesArray.filter((id: string) => id !== userId)
            : [...likesArray, userId],
        };
      }),
    );

    // Animate
    Animated.sequence([
      Animated.spring(animatedLike, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(animatedLike, { toValue: 1, useNativeDriver: true }),
    ]).start();

    try {
      await axios.post(
        `https://cast-api-zeta.vercel.app/api/${commentId}/like`,
        { userId },
      );
      console.log("liked");
    } catch (err) {
      console.error("Like failed", err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <Text style={{ fontWeight: "bold", fontSize: 16, color: theme.text }}>
            Comments
          </Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>
        {/* Input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderTopWidth: 1,
            borderTopColor: theme.border,
            padding: 12,
            gap: 8,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: theme.border,
              color: theme.text,
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
            placeholder="Write a comment..."
            placeholderTextColor={theme.text}
            value={text}
            onChangeText={setText}
          />
          <Pressable onPress={handleSubmit} disabled={loading || !text.trim()}>
            {loading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Feather name="send" size={20} color="#007AFF" />
            )}
          </Pressable>
        </View>

        {/* Comments List */}
        <FlatList
          data={comments}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                paddingVertical: 8,
                borderBottomWidth: 0.5,
                borderBottomColor: "#ddd",
              }}
            >
              {/* User Avatar */}
              <Image
                source={{ uri: item?.user?.image || "https://via.placeholder.com/40" }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#ccc",
                }}
              />

              {/* Comment Content */}
              <View style={{ flex: 1 }}>
                {/* Name, Handle & Time */}
                <View
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 }}
                >
                  <Text style={{ fontWeight: "700", color: theme.text }}>
                    {item?.user?.firstName}
                  </Text>
                  <Text style={{ color: theme.subtext, fontSize: 12 }}>
                    {item?.user?.nickName?.replace(/\s+/g, "").toLowerCase()}
                  </Text>
                  <Text style={{ color: theme.subtext, fontSize: 12 }}>·</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 3,
                      elevation: 4,
                      backgroundColor: theme.background,
                      borderRadius: 50,
                      padding: 4,
                    }}
                  >
                    <Ionicons name="time-outline" size={14} color="gray" />
                    <Text
                      style={{
                        color: theme.subtext,
                        fontWeight: "600",
                        fontSize: 10,
                        fontStyle: "italic",
                      }}
                    >
                      {moment(item.createdAt).fromNow()}
                    </Text>
                  </View>
                  {item.userId === userId && (
                    <Pressable
                      onPress={() => handleDeleteComment(item._id)}
                      style={{ marginLeft: 6 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="red" />
                    </Pressable>
                  )}
                </View>

                {/* Comment Text */}
                <Text
                  style={{ color: theme.text, marginTop: 2, lineHeight: 18 }}
                >
                  {item.text}
                </Text>

                {/* Actions: Reply / Like */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 6,
                    gap: 20,
                  }}
                >
                  {/* Reply */}
                  <Pressable
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                    onPress={() => console.log("Reply clicked", item._id)}
                  >
                    <Feather
                      name="corner-up-left"
                      size={16}
                      color={theme.subtext}
                    />
                    <Text style={{ fontSize: 12, color: theme.subtext }}>
                      {item.repliesCount > 0 && item.repliesCount}
                    </Text>
                  </Pressable>

                  {/* Like */}
                  <Pressable
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                    onPress={() => handleLike(item._id)}
                  >
                    <Feather
                      name="heart"
                      size={16}
                      color={
                        item.likes?.includes(user?.id)
                          ? "#E0245E"
                          : theme.subtext
                      }
                    />
                    <Text style={{ fontSize: 12, color: theme.subtext }}>
                      {item.likes?.length > 0 && item.likes.length}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}
