// import React, { useCallback, useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   FlatList,
//   TouchableOpacity,
//   Pressable,
//   Dimensions,
//   StatusBar,
// } from "react-native";
// import axios from "axios";
// import Video from "react-native-video";
// import { useLocalSearchParams } from "expo-router";
// import { MediaViewerModal } from "@/components/posts/MediaViewModal";
// import { Gesture } from "react-native-gesture-handler";
// import {
//   useSharedValue,
//   useAnimatedStyle,
//   withSpring,
// } from "react-native-reanimated";
// import { useUserContext } from "@/context/FollowContext";
// import { useLevel } from "@/context/LevelContext";

// const BASE_URL = "https://cast-api-zeta.vercel.app";
// const SCREEN_WIDTH = Dimensions.get("window").width;
// const POST_MARGIN = 2;
// const NUM_COLUMNS = 3;
// const POST_SIZE =
//   (SCREEN_WIDTH - POST_MARGIN * (NUM_COLUMNS * 2)) / NUM_COLUMNS;

// export default function ProfileScreen() {
//   // -------------------- Params --------------------
//   const { userId: rawUserId } = useLocalSearchParams();
//   const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId; // always string

//   // -------------------- Context & State --------------------
//   const { members, currentUserId, toggleFollow } = useUserContext();
//   const { currentLevel } = useLevel();
//   const [posts, setPosts] = useState<any[]>([]);
//   const [profileUser, setProfileUser] = useState<any>(null);
//   const [loadingProfile, setLoadingProfile] = useState(false);
//   const [activeTab, setActiveTab] = useState<
//     "posts" | "followers" | "following"
//   >("posts");

//   const [modalVisible, setModalVisible] = useState(false);
//   const [selectedIndex, setSelectedIndex] = useState(0);

//   // -------------------- Media Modal --------------------
//   const openMedia = (index: number) => {
//     setSelectedIndex(index);
//     setModalVisible(true);
//   };

//   const pinchScale = useSharedValue(1);
//   const pinchGesture = Gesture.Pinch()
//     .onUpdate((e) => {
//       pinchScale.value = e.scale;
//     })
//     .onEnd(() => {
//       pinchScale.value = withSpring(1);
//     });
//   const pinchStyle = useAnimatedStyle(() => ({
//     transform: [{ scale: pinchScale.value }],
//   }));

//   // -------------------- Fetch Profile --------------------
//   useEffect(() => {
//     const fetchProfile = async () => {
//       try {
//         setLoadingProfile(true);
//         const res = await axios.get(`${BASE_URL}/api/users/${userId}`);
//         setProfileUser(res.data);
//       } catch (err) {
//         console.error("Error fetching profile:", err);
//       } finally {
//         setLoadingProfile(false);
//       }
//     };
//     if (userId) fetchProfile();
//   }, [userId]);

//   // -------------------- Fetch Posts --------------------
//   const fetchPosts = useCallback(async () => {
//     if (!userId) return;
//     try {
//       const url = `${BASE_URL}/api/posts/${userId}?levelType=${currentLevel?.type}&levelValue=${currentLevel?.value}`;
//       const res = await axios.get(url);
//       setPosts(res.data ?? []);
//     } catch (err) {
//       console.error("❌ Error fetching posts:", err);
//     }
//   }, [currentLevel, userId]);

//   useEffect(() => {
//     fetchPosts();
//   }, [fetchPosts]);

//   // -------------------- Prepare followers/following --------------------
//   const followersData = members.filter((m) => m.followers.includes(userId));
//   const followingData = members.filter((m) => m.isFollowing);

//   // -------------------- Flatten media posts --------------------
//   const mediaPosts = posts
//     .filter((p) => p.media && p.media.length > 0)
//     .flatMap((p) => p.media);

//   const getData = () => {
//     if (activeTab === "posts") return mediaPosts;
//     if (activeTab === "followers") return followersData;
//     if (activeTab === "following") return followingData;
//     return [];
//   };

//   // -------------------- Render each item --------------------
//   const renderItem = ({ item, index }: any) => {
//     // POSTS → grid
//     if (activeTab === "posts") {
//       const isVideo = item.endsWith(".mp4") || item.endsWith(".mov");
//       return (
//         <Pressable onPress={() => openMedia(index)}>
//           {isVideo ? (
//             <Video
//               source={{ uri: item }}
//               style={styles.postImage}
//               resizeMode="cover"
//               repeat
//               paused={false}
//               muted
//             />
//           ) : (
//             <Image source={{ uri: item }} style={styles.postImage} />
//           )}
//         </Pressable>
//       );
//     }

//     // FOLLOWERS / FOLLOWING → 1 column
//     return (
//       <View
//         style={[
//           styles.userRow,
//           { width: "100%", justifyContent: "space-between" },
//         ]}
//       >
//         <View style={{ flexDirection: "row", alignItems: "center" }}>
//           <Image source={{ uri: item.image }} style={styles.userAvatar} />
//           <Text style={styles.userName}>
//             {item.firstName} {item.lastName}
//           </Text>
//         </View>

//         <TouchableOpacity
//           onPress={() => toggleFollow(item)}
//           style={[
//             styles.followButton,
//             {
//               backgroundColor: item.isFollowing ? "#fff" : "#1DA1F2",
//               borderWidth: item.isFollowing ? 1 : 0,
//               borderColor: "#1DA1F2",
//             },
//           ]}
//         >
//           <Text
//             style={{
//               color: item.isFollowing ? "#1DA1F2" : "#fff",
//               fontWeight: "bold",
//             }}
//           >
//             {item.isFollowing ? "Unfollow" : "Follow"}
//           </Text>
//         </TouchableOpacity>
//       </View>
//     );
//   };

//   if (loadingProfile) {
//     return (
//       <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//         <Text>Loading profile...</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <StatusBar
//         translucent
//         backgroundColor="transparent"
//         barStyle="dark-content"
//       />
//       {/* Header */}
//       <View style={styles.header}>
//         <Image
//           source={{
//             uri:
//               profileUser?.image?.trim() !== ""
//                 ? profileUser?.image
//                 : "https://i.pravatar.cc/150?img=32",
//           }}
//           style={styles.avatar}
//         />
//         <View style={styles.bio}>
//           <Text style={styles.name}>{profileUser?.firstName}</Text>
//           <Text style={styles.username}>@{profileUser?.nickName}</Text>
//         </View>

//         {/* Stats */}
//         <View style={styles.stats}>
//           <TouchableOpacity
//             style={styles.statItem}
//             onPress={() => setActiveTab("posts")}
//           >
//             <Text style={styles.statNumber}>{posts.length}</Text>
//             <Text
//               style={[
//                 styles.statLabel,
//                 activeTab === "posts" && styles.activeLabel,
//               ]}
//             >
//               Posts
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.statItem}
//             onPress={() => setActiveTab("followers")}
//           >
//             <Text style={styles.statNumber}>{followersData.length}</Text>
//             <Text
//               style={[
//                 styles.statLabel,
//                 activeTab === "followers" && styles.activeLabel,
//               ]}
//             >
//               Followers
//             </Text>
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.statItem}
//             onPress={() => setActiveTab("following")}
//           >
//             <Text style={styles.statNumber}>{followingData.length}</Text>
//             <Text
//               style={[
//                 styles.statLabel,
//                 activeTab === "following" && styles.activeLabel,
//               ]}
//             >
//               Following
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Content */}
//       <FlatList
//         style={{ flex: 1 }}
//         contentContainerStyle={{ paddingBottom: 140 }}
//         data={getData()}
//         key={activeTab} // forces re-render when tab changes
//         keyExtractor={(item) => item._id}
//         numColumns={activeTab === "posts" ? 3 : 1} // 3 for posts, 1 for followers/following
//         renderItem={renderItem}
//         showsVerticalScrollIndicator={false}
//       />

//       {/* Media Modal */}
//       <MediaViewerModal
//         modalVisible={modalVisible}
//         setModalVisible={setModalVisible}
//         mediaList={mediaPosts}
//         selectedIndex={selectedIndex}
//         post={posts.find(
//           (p) => p.media && p.media.includes(mediaPosts[selectedIndex]),
//         )}
//         pinchGesture={pinchGesture}
//         pinchStyle={pinchStyle}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#fff", paddingTop: 40 },
//   header: {
//     flexDirection: "column",
//     paddingHorizontal: 16,
//     alignItems: "center",
//   },
//   avatar: { width: 90, height: 90, borderRadius: 45 },
//   bio: { paddingHorizontal: 16, marginTop: 10 },
//   name: { fontWeight: "bold", fontSize: 16 },
//   username: { color: "#666" },
//   stats: {
//     width: "100%",
//     flexDirection: "row",
//     justifyContent: "space-around",
//   },
//   statItem: { alignItems: "center" },
//   statNumber: { fontSize: 18, fontWeight: "bold" },
//   statLabel: { fontSize: 12, color: "#666" },
//   activeLabel: { color: "#1DA1F2", fontWeight: "bold" },
//   postImage: { width: POST_SIZE, height: POST_SIZE, margin: POST_MARGIN },
//   userRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 12,
//     borderBottomWidth: 1,
//     borderColor: "#eee",
//   },
//   userAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
//   userName: { fontSize: 16, fontWeight: "500" },
//   followButton: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20 },
// });


import { View, Text } from 'react-native'
import React from 'react'

export default function ID() {
  return (
    <View>
      <Text>ID</Text>
    </View>
  )
}