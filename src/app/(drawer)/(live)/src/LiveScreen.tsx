// import React, { useEffect, useState, useRef, useMemo } from "react";
// import {
//   StreamVideoClient,
//   StreamVideo,
//   StreamCall,
//   VideoRenderer,
//   useCallStateHooks,
//   callManager,
//   CallControls,
//   useStreamVideoClient,
// } from "@stream-io/video-react-native-sdk";
// import {
//   View,
//   Text,
//   StyleSheet,
//   Pressable,
//   TextInput,
//   FlatList,
//   PanResponder,
//   Dimensions,
//   StatusBar,
//   Platform,
//   KeyboardAvoidingView,
// } from "react-native";
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withTiming,
// } from "react-native-reanimated";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { LinearGradient } from "expo-linear-gradient";
// import { Ionicons } from "@expo/vector-icons";
// import { router } from "expo-router";

// type Props = { goToHomeScreen: () => void; callId: string };

// export default function LiveScreen({ goToHomeScreen, callId }: Props) {
//   const client = useStreamVideoClient();

//   const call = useMemo(() => {
//     if (!client) return null;
//     return client.call("livestream", callId);
//   }, [client, callId]);

//   useEffect(() => {
//     let mounted = true;

//     const startCall = async () => {
//       if (!call) return null;

//       try {
//         const isHost = false; // <-- decide this (VERY IMPORTANT)

//         await call.join(isHost ? { create: true } : undefined);

//         if (isHost) {
//           await call.camera.enable();
//           await call.microphone.enable();

//           callManager.start({
//             audioRole: "communicator",
//             deviceEndpointType: "speaker",
//           });
//         }
//       } catch (error) {
//         console.log("Error joining call:", error);
//       }
//     };

//     if (mounted) startCall();

//     return () => {
//       mounted = false;
//       call?.leave();
//       callManager.stop();
//       router.push("/")
//     };
//   }, [call]);

//   return (
//     // <StreamVideo client={client}>
//     <StreamCall call={call}>
//       <StatusBar
//         translucent
//         backgroundColor="transparent"
//         barStyle="dark-content"
//       />
//       <TikTokLive />
//       <CallControls />
//     </StreamCall>
//     // </StreamVideo>
//   );
// }

// /* =========================================================
//    TIKTOK LIVE SCREEN
// ========================================================= */
// const TikTokLive = () => {
//   const { useLocalParticipant, useParticipantCount } = useCallStateHooks();

//   const participant = useLocalParticipant();
//   const viewers = useParticipantCount();

//   const [messages, setMessages] = useState([
//     { id: "1", text: "Welcome to the livestream!" },
//   ]);
//   const [input, setInput] = useState("");

//   const [reactions, setReactions] = useState<
//     { id: number; emoji: string; left: number }[]
//   >([]);

//   const lastTap = useRef(0);

//   /* ================= DOUBLE TAP ================= */
//   const handleTap = () => {
//     const now = Date.now();
//     if (now - lastTap.current < 300) {
//       sendReaction("❤️");
//     }
//     lastTap.current = now;
//   };

//   /* ================= REACTION SPAWN ================= */
//   const sendReaction = (emoji: string) => {
//     const id = Date.now();
//     const randomLeft = Math.random() * 200 + 50;

//     setReactions((prev) => [...prev, { id, emoji, left: randomLeft }]);

//     setTimeout(() => {
//       setReactions((prev) => prev.filter((r) => r.id !== id));
//     }, 1500);
//   };

//   /* ================= CHAT ================= */
//   const sendMessage = () => {
//     if (!input.trim()) return;

//     setMessages((prev) => [
//       ...prev,
//       { id: Date.now().toString(), text: input },
//     ]);
//     setInput("");
//   };

//   return (
//     <View style={{ flex: 1, backgroundColor: "black" }}>
//       <StatusBar
//         translucent
//         backgroundColor="transparent"
//         barStyle="light-content"
//       />

//       <Pressable style={{ flex: 1 }} onPress={handleTap}>
//         {participant && (
//           <VideoRenderer
//             participant={participant}
//             trackType="videoTrack"
//             style={{ flex: 1 }}
//           />
//         )}
//       </Pressable>

//       {/* FLOATING REACTIONS */}
//       {reactions.map((r) => (
//         <AnimatedReaction key={r.id} emoji={r.emoji} left={r.left} />
//       ))}

//       {/* TOP BAR */}
//       <View style={styles.topBar}>
//         <Ionicons name="radio" color="red" size={20} />
//         <Text style={styles.viewerText}>
//           <Ionicons name="eye" color="white" size={18} /> {viewers}
//         </Text>
//       </View>

//       {/* RIGHT SIDE ACTIONS */}
//       <View style={styles.rightBar}>
//         {["❤️", "👍", "👏", "🎉"].map((emoji) => (
//           <Pressable key={emoji} onPress={() => sendReaction(emoji)}>
//             <Text style={{ fontSize: 28, marginBottom: 12 }}>{emoji}</Text>
//           </Pressable>
//         ))}
//       </View>

//       {/* CHAT */}
//       {/* <KeyboardAvoidingView
//   behavior={Platform.OS === "ios" ? "padding" : "height"}
//   style={{ flex: 1 }}
//   keyboardVerticalOffset={80}
// > */}
//       <LinearGradient
//         colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]}
//         style={styles.chatContainer}
//       >
//         {/* CHAT LIST */}
//         <FlatList
//           data={messages}
//           keyExtractor={(item) => item.id}
//           inverted // 🔥 newest at bottom
//           contentContainerStyle={{
//             paddingBottom: 10,
//           }}
//           renderItem={({ item, index }) => {
//             const fadeOpacity = 1 - index * 0.15; // fade older messages

//             return (
//               <Text
//                 style={[
//                   styles.chatMessage,
//                   {
//                     opacity: fadeOpacity < 0 ? 0 : fadeOpacity,
//                   },
//                 ]}
//               >
//                 {item.text}
//               </Text>
//             );
//           }}
//         />

//         {/* INPUT ROW */}
//         <View style={styles.inputRow}>
//           <TextInput
//             placeholder="Say something..."
//             placeholderTextColor="#aaa"
//             value={input}
//             onChangeText={setInput}
//             style={styles.input}
//           />
//           <Pressable onPress={sendMessage}>
//             <Text style={styles.sendText}>Send</Text>
//           </Pressable>
//         </View>
//       </LinearGradient>
//       {/* </KeyboardAvoidingView> */}
//     </View>
//   );
// };

// /* =========================================================
//    FLOATING HEART
// ========================================================= */
// const AnimatedReaction = ({ left, emoji }: { left: number; emoji: string }) => {
//   const y = useSharedValue(0);
//   const opacity = useSharedValue(1);

//   useEffect(() => {
//     y.value = withTiming(-600, { duration: 1500 });
//     opacity.value = withTiming(0, { duration: 1500 });
//   }, []);

//   const style = useAnimatedStyle(() => ({
//     position: "absolute",
//     bottom: 100,
//     left,
//     transform: [{ translateY: y.value }],
//     opacity: opacity.value,
//   }));

//   return (
//     <Animated.Text style={[style, { fontSize: 30 }]}>{emoji}</Animated.Text>
//   );
// };
// const [reactions, setReactions] = useState<
//   { id: number; emoji: string; left: number }[]
// >([]);

// const sendReaction = (emoji: string) => {
//   const id = Date.now();
//   const randomLeft = Math.random() * 200 + 50;

//   setReactions((prev) => [...prev, { id, emoji, left: randomLeft }]);

//   // Remove after animation
//   setTimeout(() => {
//     setReactions((prev) => prev.filter((r) => r.id !== id));
//   }, 1500);
// };

// <View
//   style={{
//     position: "absolute",
//     bottom: 40,
//     flexDirection: "row",
//     gap: 15,
//     alignSelf: "center",
//   }}
// >
//   {["❤️", "👍", "👏", "🎉"].map((emoji) => (
//     <Pressable key={emoji} onPress={() => sendReaction(emoji)}>
//       <Text style={{ fontSize: 28 }}>{emoji}</Text>
//     </Pressable>
//   ))}
// </View>;

// {
//   reactions.map((r) => (
//     <AnimatedReaction key={r.id} emoji={r.emoji} left={r.left} />
//   ));
// }

// /* =========================================================
//    STYLES
// ========================================================= */

// const styles = StyleSheet.create({
//   container: { flex: 1 },

//   topBar: {
//     position: "absolute",
//     // top: 20,
//     left: 16,
//     flexDirection: "row",
//     alignItems: "center",
//   },

//   liveBadge: {
//     backgroundColor: "#FF2D55",
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 6,
//   },

//   liveText: {
//     color: "white",
//     fontWeight: "bold",
//   },

//   viewerText: {
//     color: "white",
//     marginLeft: 10,
//   },

//   rightBar: {
//     position: "absolute",
//     right: 20,
//     bottom: 150,
//     alignItems: "center",
//   },

//   chatContainer: {
//     position: "absolute",
//     bottom: 0,
//     width: "80%",
//     height: 350,
//     padding: 10,
//     borderTopRightRadius: 30,
//     borderTopLeftRadius: 30, // optional for smooth fade on top corners
//   },

//   chatMessage: {
//     color: "white",
//     marginBottom: 6,
//   },

//   inputRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginTop: 8,
//   },

//   input: {
//     flex: 1,
//     backgroundColor: "rgba(255,255,255,0.2)",
//     color: "white",
//     padding: 8,
//     borderRadius: 20,
//     marginRight: 10,
//   },

//   sendText: {
//     color: "#FF2D55",
//     fontWeight: "bold",
//   },
// });

import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  StreamCall,
  VideoRenderer,
  useCallStateHooks,
  callManager,
  CallControls,
  useStreamVideoClient,
} from "@stream-io/video-react-native-sdk";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  StatusBar,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

type Props = {
  goToHomeScreen: () => void;
  callId: string;
  isHost: boolean; // ✅ IMPORTANT
};

export default function LiveScreen({ goToHomeScreen, callId, isHost }: Props) {
  const client = useStreamVideoClient();

  const call = useMemo(() => {
    if (!client) return null;
    return client.call("livestream", callId);
  }, [client, callId]);

  useEffect(() => {
    let mounted = true;

    const startCall = async () => {
      if (!call) return;
// const isHost = true;
      try {
        if (isHost) {
          // 🎤 HOST
          await call.join({ create: true });

          await call.camera.enable();
          await call.microphone.enable();

          callManager.start({
            audioRole: "communicator",
            deviceEndpointType: "speaker",
          });
        } else {
          // 👀 VIEWER
          await call.join();
        }
      } catch (error) {
        console.log("Error joining call:", error);
      }
    };

    if (mounted) startCall();

    return () => {
      mounted = false;
      call?.leave();
      callManager.stop();
    };
  }, [call, isHost]);

  useEffect(() => {
    if (!call) return;

    const handleCallEnd = () => {
      router.replace("/HomeLivescreen");
      // or goToHomeScreen();
    };

    call.on("call.ended", handleCallEnd);

    return () => {
      call.off("call.ended", handleCallEnd);
    };
  }, [call]);

  if (!call) return null;

  return (
    <StreamCall call={call}>
      <StatusBar translucent backgroundColor="transparent" />

      <TikTokLive isHost={isHost} />

      {/* 🎤 Only host sees controls */}
      {/* {isHost && <CallControls />} */}
      <CallControls />
    </StreamCall>
  );
}

/* =========================================================
   TIKTOK LIVE UI
========================================================= */
const TikTokLive = ({ isHost }: { isHost: boolean }) => {
  const { useLocalParticipant, useParticipantCount } = useCallStateHooks();

  const participant = useLocalParticipant();
  const viewers = useParticipantCount();

  const [messages, setMessages] = useState([
    { id: "1", text: "Welcome to the livestream!" },
  ]);
  const [input, setInput] = useState("");

  const [reactions, setReactions] = useState<
    { id: number; emoji: string; left: number }[]
  >([]);

  const lastTap = useRef(0);

  /* DOUBLE TAP */
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      sendReaction("❤️");
    }
    lastTap.current = now;
  };

  /* REACTIONS */
  const sendReaction = (emoji: string) => {
    const id = Date.now();
    const randomLeft = Math.random() * 200 + 50;

    setReactions((prev) => [...prev, { id, emoji, left: randomLeft }]);

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 1500);
  };

  /* CHAT */
  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: input },
    ]);
    setInput("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* VIDEO */}
      <Pressable style={{ flex: 1 }} onPress={handleTap}>
        {participant && (
          <VideoRenderer
            participant={participant}
            trackType="videoTrack"
            style={{ flex: 1 }}
          />
        )}
      </Pressable>

      {/* REACTIONS */}
      {reactions.map((r) => (
        <AnimatedReaction key={r.id} emoji={r.emoji} left={r.left} />
      ))}

      {/* TOP BAR */}
      <View style={styles.topBar}>
        {isHost && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}

        <Text style={styles.viewerText}>
          <Ionicons name="eye" color="white" size={18} /> {viewers}
        </Text>
      </View>

      {/* RIGHT SIDE */}
      <View style={styles.rightBar}>
        {["❤️", "👍", "👏", "🎉"].map((emoji) => (
          <Pressable key={emoji} onPress={() => sendReaction(emoji)}>
            <Text style={{ fontSize: 28, marginBottom: 12 }}>{emoji}</Text>
          </Pressable>
        ))}
      </View>

      {/* CHAT */}
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]}
        style={styles.chatContainer}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          renderItem={({ item }) => (
            <Text style={styles.chatMessage}>{item.text}</Text>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Say something..."
            placeholderTextColor="#aaa"
            value={input}
            onChangeText={setInput}
            style={styles.input}
          />
          <Pressable onPress={sendMessage}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
};

/* FLOATING REACTION */
const AnimatedReaction = ({ left, emoji }: { left: number; emoji: string }) => {
  const y = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    y.value = withTiming(-600, { duration: 1500 });
    opacity.value = withTiming(0, { duration: 1500 });
  }, []);

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    bottom: 100,
    left,
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[style, { fontSize: 30 }]}>{emoji}</Animated.Text>
  );
};

/* STYLES */
const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 40,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  liveBadge: {
    backgroundColor: "#FF2D55",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },

  liveText: {
    color: "white",
    fontWeight: "bold",
  },

  viewerText: {
    color: "white",
  },

  rightBar: {
    position: "absolute",
    right: 20,
    bottom: 150,
    alignItems: "center",
  },

  chatContainer: {
    position: "absolute",
    bottom: 0,
    width: "80%",
    height: 300,
    padding: 10,
  },

  chatMessage: {
    color: "white",
    marginBottom: 6,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "white",
    padding: 8,
    borderRadius: 20,
    marginRight: 10,
  },

  sendText: {
    color: "#FF2D55",
    fontWeight: "bold",
  },
});