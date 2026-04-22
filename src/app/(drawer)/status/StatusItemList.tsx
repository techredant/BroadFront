// import { View, Text, Image, Pressable, Animated } from "react-native";
// import { useRouter } from "expo-router";
// import { useRef } from "react";

// interface StatusItemProps {
//   userStatus: {
//     user: { name: string; avatar: string };
//     statuses: { id: string; viewed: boolean }[];
//   };
// }

// export function StatusItem({ userStatus }: StatusItemProps) {
//   const router = useRouter();
//   const scale = useRef(new Animated.Value(1)).current;

//   const hasUnviewed = userStatus.statuses.some((s) => !s.viewed);

//   const handlePressIn = () => {
//     Animated.spring(scale, {
//       toValue: 0.97,
//       useNativeDriver: true,
//     }).start();
//   };

//   const handlePressOut = () => {
//     Animated.spring(scale, {
//       toValue: 1,
//       friction: 3,
//       useNativeDriver: true,
//     }).start();
//   };

//   return (
//     <Pressable
//       onPress={() => router.push(`/status/Viewer?user=${userStatus.user.name}`)}
//       onPressIn={handlePressIn}
//       onPressOut={handlePressOut}
//       style={{ paddingVertical: 10, paddingHorizontal: 16 }}
//     >
//       <Animated.View
//         style={{
//           transform: [{ scale }],
//           flexDirection: "row", // 🔥 makes it horizontal
//           alignItems: "center",
//         }}
//       >
//         {/* Avatar */}
//         <View
//           style={{
//             padding: 3,
//             borderRadius: 50,
//             backgroundColor: hasUnviewed ? "transparent" : "#1F2937",
//             marginRight: 12,
//             flexDirection: "row"
//           }}
//         >
//           <Image
//             source={{ uri: userStatus.user.avatar }}
//             style={{
//               width: 50,
//               height: 50,
//               borderRadius: 25,
//               opacity: hasUnviewed ? 1 : 0.6,
//               borderWidth: hasUnviewed ? 2 : 0,
//               borderColor: hasUnviewed ? "#1d4ed8" : "transparent",
//             }}
//           />
//         </View>

//         {/* Name */}
//         <Text
//           numberOfLines={1}
//           style={{
//             fontSize: 14,
//             color: "#111",
//             fontWeight: "600",
//             flexShrink: 1,
//           }}
//         >
//           {userStatus.user.name}
//         </Text>
//       </Animated.View>
//     </Pressable>
//   );
// }

import { View, Text } from 'react-native'
import React from 'react'

export default function StatusItemList() {
  return (
    <View>
      <Text>StatusItemList</Text>
    </View>
  )
}