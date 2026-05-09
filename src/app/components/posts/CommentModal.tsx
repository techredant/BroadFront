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
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import moment from "moment";
import axios from "axios";
import Video from "react-native-video";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import { MediaViewerModal } from "./MediaViewModal";

export default function CommentModal({
  visible,
  onClose,
  postCard,
  comments,
  setComments,
  userId,
  userImage,
  userName,
  mediaList,
  mediaCount,
  width,
  itemSize,
  theme,
}: any) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputHeight, setInputHeight] = useState(80);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
    const scrollTopOpacity = useRef(new Animated.Value(0)).current;
    const [showScrollTop, setShowScrollTop] = useState(false);
    
  
    /* ---------------- SCROLL ---------------- */
    const handleScroll = (event: any) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const shouldShow = offsetY > 400;
  
      setShowScrollTop(shouldShow);
  
      Animated.timing(scrollTopOpacity, {
        toValue: shouldShow ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    };

    

  const animatedLike = useRef(new Animated.Value(1)).current;
  const [expandedStates, setExpandedStates] = useState<{
    [key: string]: boolean;
  }>({});

  const flatListRef = useRef<FlatList>(null);

  /* ---------------- PINCH ---------------- */
  const pinchScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      pinchScale.value = e.scale;
    })
    .onEnd(() => {
      pinchScale.value = withSpring(1);
    });

  const pinchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pinchScale.value }],
  }));

  const openMedia = (index: number) => {
    setSelectedIndex(index);
    setModalVisible(true);
  };

  /* ---------------- POST COMMENT ---------------- */
  const handleSubmit = async () => {
    if (!text.trim()) return;

    const temp = {
      _id: Math.random().toString(),
      userId,
      userName,
      image: userImage,
      text,
      createdAt: new Date().toISOString(),
    };

  setComments((prev: any) => [...prev, temp]);
    flatListRef.current?.scrollToEnd({ animated: true });
    setText("");
    setLoading(true);

    try {
      const res = await fetch(
        `https://cast-api-zeta.vercel.app/api/${postCard?._id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, text }),
        },
      );

      const data = await res.json();
      flatListRef.current?.scrollToEnd({ animated: true });

      setComments((prev: any) =>
        prev.map((c: any) => (c._id === temp._id ? data : c)),
      );
    } catch (err) {
      console.log(err);
      setComments((prev: any) => prev.filter((c: any) => c._id !== temp._id));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const prev = comments;
    setComments((p: any) => p.filter((c: any) => c._id !== commentId));

    try {
      await axios.delete(`https://cast-api-zeta.vercel.app/api/${commentId}`, {
        data: { userId },
      });
    } catch (err) {
      setComments(prev);
    }
  };

  const handleLike = async (commentId: string) => {
    setComments((prev: any) =>
      prev.map((c: any) => {
        if (c._id !== commentId) return c;

        const likes = c.likes || [];
        const liked = likes.includes(userId);

        return {
          ...c,
          likes: liked
            ? likes.filter((id: string) => id !== userId)
            : [...likes, userId],
        };
      }),
    );

    Animated.sequence([
      Animated.spring(animatedLike, { toValue: 1.3, useNativeDriver: true }),
      Animated.spring(animatedLike, { toValue: 1, useNativeDriver: true }),
    ]).start();

    try {
      await axios.post(
        `https://cast-api-zeta.vercel.app/api/${commentId}/like`,
        { userId },
      );
    } catch (err) {
      console.log(err);
    }
  };

  const toggleExpand = (postId: string) => {
    setExpandedStates((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const commentText = postCard.quote ? postCard.quote : postCard.caption;
  const isExpanded = expandedStates[postCard._id];

  /* ---------------- HEADER (POSTCARD) ---------------- */
  const renderHeader = () => (
    <View style={{ backgroundColor: theme.card, padding: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Image
          source={{ uri: postCard?.user?.image }}
          style={{ width: 35, height: 35, borderRadius: 18 }}
        />

        <View>
          <Text style={{ color: theme.text, fontWeight: "700" }}>
            {postCard?.user?.firstName}
            {postCard?.user?.lastName}
            {postCard?.user?.companyName}
          </Text>
          <Text style={{ color: theme.subtext, fontSize: 12 }}>
            {postCard?.user?.nickName}
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={isExpanded ? undefined : 3}
        style={{
          color: theme.text,
          paddingHorizontal: 12,
          marginTop: 6,
        }}
      >
        {commentText}
      </Text>
      {commentText && commentText.length > 80 && (
        <TouchableOpacity
          onPress={() => toggleExpand(postCard._id)}
          style={{ zIndex: 20, padding: 4 }}
        >
          <Text
            style={{
              color: theme.primary,
              paddingHorizontal: 12,
              marginTop: 4,
              fontWeight: "600",
            }}
          >
            {isExpanded ? "Show less" : "Show more"}
          </Text>
        </TouchableOpacity>
      )}

      {/* MEDIA */}
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {mediaList.slice(0, 4).map((uri: string, idx: number) => {
          const remaining = mediaCount - 4;
          const isLast = idx === 3 && remaining > 0;

          const isSingle = mediaCount === 1;
          const isVideo = uri.endsWith(".mp4") || uri.endsWith(".mov");

          return (
            <Pressable
              key={uri}
              onPress={() => openMedia(idx)}
              style={{
                width: isSingle ? "100%" : itemSize,
                height: isSingle ? 420 : itemSize,
                margin: isSingle ? 0 : 2,
                borderRadius: 14,
                overflow: "hidden",
                backgroundColor: "#000",
                position: "relative",
              }}
            >
              {isVideo ? (
                <>
                  <Video
                    source={{ uri }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                    muted={isMuted}
                    controls={false}
                  />

                  <TouchableOpacity
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      backgroundColor: "rgba(0,0,0,0.4)",
                      borderRadius: 20,
                      padding: 6,
                    }}
                    onPress={() => setIsMuted((p) => !p)}
                  >
                    <Ionicons
                      name={isMuted ? "volume-mute" : "volume-high"}
                      size={18}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </>
              ) : (
                <Image
                  source={{ uri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              )}

              {isLast && (
                <View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: "rgba(0,0,0,0.55)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 30,
                      fontWeight: "bold",
                    }}
                  >
                    +{remaining}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  /* ---------------- RENDER COMMENT ---------------- */
  const renderItem = ({ item }: any) => (
    <View
      style={{
        flexDirection: "row",
        padding: 10,
        borderBottomWidth: 0.5,
        borderColor: theme.border,
      }}
    >
      <Image
        source={{ uri: item?.user?.image }}
        style={{ width: 35, height: 35, borderRadius: 18 }}
      />

      <View style={{ marginLeft: 10, flex: 1 }}>
        <Text style={{ fontWeight: "700", color: theme.text }}>
          {item?.user?.firstName ? `${item?.user?.firstName} ${item?.user?.lastName}` :  `${item?.user?.companyName}`}
        </Text>

        <Text style={{ color: theme.text }}>{item.text}</Text>

        <View style={{ flexDirection: "row", gap: 15, marginTop: 5, justifyContent: "space-between" }}>
          <Pressable onPress={() => handleLike(item._id)}>
            <Feather name="heart" size={16} color={theme.subtext} />
          </Pressable>

          {item.userId === userId && (
            <Pressable onPress={() => handleDeleteComment(item._id)}>
              <Feather name="trash" size={16} color="red" />
            </Pressable>
          )}

          <Text style={{ fontSize: 12, color: theme.subtext }}>
            {moment(item.createdAt).fromNow()}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        {/* HEADER */}
        <View style={[styles.topBar, { borderColor: theme.border }]}>
          <Pressable onPress={onClose} style={{ padding: 10 }}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>

          <Text style={{ color: theme.text, fontWeight: "700" }}>Comments</Text>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={{ padding: 20 }}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Feather name="send" size={20} color="#007AFF" />
            )}
          </Pressable>
        </View>
        {/* INPUT */}
        <View style={styles.inputBar}>
          <TextInput
            placeholder="Write a comment..."
            placeholderTextColor={theme.subtext}
            value={text}
            onChangeText={setText}
            style={{ flex: 1, color: theme.text }}
          />
        </View>
        {/* SINGLE SCROLL AREA */}

        <FlatList
          ref={flatListRef}
          data={comments}
          onScroll={handleScroll}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          keyboardShouldPersistTaps="handled"
        />

        {/* SCROLL TO TOP */}
        <Animated.View
          pointerEvents={showScrollTop ? "auto" : "none"}
          style={{
            position: "absolute",
            bottom: 80,
            right: 20,
            opacity: scrollTopOpacity,
          }}
        >
          <Pressable
            onPress={() =>
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
            }
            style={{
              backgroundColor: "#1F2937",
              padding: 12,
              borderRadius: 30,
            }}
          >
            <Text style={{ color: "#fff" }}>↑ Top</Text>
          </Pressable>
        </Animated.View>

        <MediaViewerModal
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
          mediaList={mediaList}
          selectedIndex={selectedIndex}
          post={postCard}
          pinchGesture={pinchGesture}
          pinchStyle={pinchStyle}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    alignItems: "center",
  },
  inputBar: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
});
