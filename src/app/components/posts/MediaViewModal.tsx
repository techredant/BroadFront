import React from "react";
import {
  Modal,
  View,
  FlatList,
  Pressable,
  Dimensions,
  StyleSheet,
  StatusBar,
  Text,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Video from "react-native-video";

const { width } = Dimensions.get("window");

type Props = {
  modalVisible: boolean;
  setModalVisible: (v: boolean) => void;
  mediaList: string[];
  selectedIndex: number;
  post: any;
  pinchGesture: any;
  pinchStyle: any;
};

export function MediaViewerModal({
  modalVisible,
  setModalVisible,
  mediaList,
  selectedIndex,
  post,
  pinchGesture,
  pinchStyle,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={modalVisible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => setModalVisible(false)}
    >
      <StatusBar translucent backgroundColor="transparent" />

      <View style={styles.container}>
        {/* Close Button */}
        <Pressable
          onPress={() => setModalVisible(false)}
          style={[styles.closeBtn, { top: insets.top + 10 }]}
        >
          <Feather name="x" size={20} color="#fff" />
        </Pressable>

        <FlatList
          horizontal
          pagingEnabled
          data={mediaList}
          initialScrollIndex={selectedIndex}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          keyExtractor={(item, index) => item + index}
          renderItem={({ item }) => {
            const isVideo = post?.videos?.includes(item);

            return (
              <View style={styles.mediaContainer}>
                <GestureDetector gesture={pinchGesture}>
                  {isVideo ? (
                    <Video
                      source={{ uri: item }}
                      style={styles.media}
                      // resizeMode={ResizeMode.COVER}
                      // shouldPlay
                    />
                  ) : (
                    <Animated.Image
                      source={{ uri: item }}
                      style={[styles.media, pinchStyle]}
                      resizeMode="cover"
                    />
                  )}
                </GestureDetector>
                <Text>{post?.caption}</Text>
              </View>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  closeBtn: {
    position: "absolute",
    right: 20,
    zIndex: 20,
    padding: 8,
    backgroundColor: "gray",
    borderRadius: 50
  },

  mediaContainer: {
    width,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  media: {
    width: "100%",
    height: "100%",
  },
});
