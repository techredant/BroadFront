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
import Animated, { runOnJS } from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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
  const [currentIndex, setCurrentIndex] = React.useState(selectedIndex);
  const [isZooming, setIsZooming] = React.useState(false);

  const onViewRef = React.useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  });

  React.useEffect(() => {
    setCurrentIndex(selectedIndex);
  }, [selectedIndex]);

const enhancedPinchGesture = pinchGesture
  .runOnJS(true) // 👈 FIX
  .onStart(() => {
    setIsZooming(true);
  })
  .onEnd(() => {
    setIsZooming(false);
  });

  const viewConfigRef = React.useRef({
    itemVisiblePercentThreshold: 80,
  });

  return (
    <Modal
      visible={modalVisible}
      animationType="fade"
      transparent={false}
      // statusBarTranslucent
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
          onViewableItemsChanged={onViewRef.current}
          viewabilityConfig={viewConfigRef.current}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          scrollEnabled={!isZooming}
          keyExtractor={(item, index) => item + index}
          renderItem={({ item, index }) => {
            const isVideo = post?.videos?.includes(item);
            const isActive = index === currentIndex;

            return (
              <SafeAreaView style={styles.mediaContainer}>
                <GestureDetector gesture={enhancedPinchGesture}>
                  {isVideo ? (
                    <Video
                      source={{ uri: item }}
                      style={styles.media}
                      resizeMode="contain"
                      paused={!isActive} // 🔥 KEY FIX
                      repeat
                    />
                  ) : (
                    <Animated.Image
                      source={{ uri: item }}
                      style={[styles.media, pinchStyle]}
                      resizeMode="contain"
                    />
                  )}
                </GestureDetector>
              </SafeAreaView>
            );
          }}
        />
        {mediaList.length > 1 && (
          <View
            style={[
              styles.dotsContainer,
              { bottom: insets.bottom + 20 }, // 👈 perfect spacing
            ]}
          >
            {mediaList.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === currentIndex && styles.activeDot]}
              />
            ))}
          </View>
        )}
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
    borderRadius: 50,
  },

  dotsContainer: {
    position: "absolute",
    flexDirection: "row",
    alignSelf: "center",
    gap: 6,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },

  activeDot: {
    backgroundColor: "#fff",
    width: 8,
    height: 8,
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
