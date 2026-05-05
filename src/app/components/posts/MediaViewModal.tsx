import React from "react";
import {
  Modal,
  View,
  FlatList,
  Pressable,
  Dimensions,
  StyleSheet,
  StatusBar,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Video from "react-native-video";
import LoaderKitView from "react-native-loader-kit";
import { useTheme } from "@/context/ThemeContext";

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
  pinchGesture,
  pinchStyle,
}: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const flatListRef = React.useRef<FlatList>(null);

  const [currentIndex, setCurrentIndex] = React.useState(selectedIndex);
  const [loadingVideoIndex, setLoadingVideoIndex] = React.useState<
    number | null
  >(null);
  const [isVideoReady, setIsVideoReady] = React.useState<{
    [key: number]: boolean;
  }>({});
  const [isZooming, setIsZooming] = React.useState(false);

  const onViewRef = React.useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  });

  const viewConfigRef = React.useRef({
    itemVisiblePercentThreshold: 80,
  });

  const enhancedPinchGesture = pinchGesture
    .runOnJS(true)
    .onStart(() => setIsZooming(true))
    .onEnd(() => setIsZooming(false));

  React.useEffect(() => {
    setCurrentIndex(selectedIndex);
  }, [selectedIndex]);

  // ✅ Correct initial scroll
  React.useEffect(() => {
    if (modalVisible && flatListRef.current) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({
          index: selectedIndex,
          animated: false,
        });
      });
    }
  }, [modalVisible, selectedIndex]);

  const isVideo = (item: string) =>
    item.toLowerCase().includes(".mp4") ||
    item.toLowerCase().includes(".mov") ||
    item.toLowerCase().includes(".webm");

  return (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setModalVisible(false)}
    >
      <StatusBar translucent backgroundColor="transparent" />

      <View style={styles.container}>
        {/* Close Button */}
        <Pressable
          onPress={() => setModalVisible(false)}
          style={styles.closeBtn}
        >
          <Feather name="x" size={28} color="white" />
        </Pressable>

        <FlatList
          ref={flatListRef}
          horizontal
          pagingEnabled
          data={mediaList}
          initialScrollIndex={selectedIndex}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => item + index}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          onViewableItemsChanged={onViewRef.current}
          viewabilityConfig={viewConfigRef.current}
          scrollEnabled={!isZooming}
          renderItem={({ item, index }) => {
            const video = isVideo(item);
            const active = index === currentIndex;

            return (
              <SafeAreaView style={styles.mediaContainer}>
                {video ? (
                  <View style={styles.videoWrapper}>
                    {loadingVideoIndex === index && (
                      <View style={styles.loader}>
                        <LoaderKitView
                          style={{ width: 50, height: 50 }}
                          name="BallScaleRippleMultiple"
                          color="white"
                        />
                      </View>
                    )}

                    <Video
                      source={{ uri: item }}
                      style={styles.media}
                      resizeMode="contain"
                      paused={!active}
                      repeat
                      controls={isVideoReady[index] === true}
                      onLoadStart={() => {
                        setLoadingVideoIndex(index);
                        setIsVideoReady((p) => ({ ...p, [index]: false }));
                      }}
                      onLoad={() => {
                        setLoadingVideoIndex(null);
                        setIsVideoReady((p) => ({ ...p, [index]: true }));
                      }}
                      onBuffer={({ isBuffering }) => {
                        setLoadingVideoIndex(isBuffering ? index : null);
                      }}
                    />
                  </View>
                ) : (
                  <GestureDetector gesture={enhancedPinchGesture}>
                    <Animated.Image
                      source={{ uri: item }}
                      style={[styles.media, pinchStyle]}
                      resizeMode="contain"
                    />
                  </GestureDetector>
                )}
              </SafeAreaView>
            );
          }}
        />

        {/* DOTS */}
        {mediaList.length > 1 && (
          <View style={[styles.dotsContainer, { bottom: insets.bottom + 20 }]}>
            {mediaList.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentIndex && styles.activeDot,
                  { backgroundColor: "white" },
                ]}
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
    top: 30,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 8,
    borderRadius: 999,
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

  videoWrapper: {
    width,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  loader: {
    position: "absolute",
    zIndex: 10,
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
  },

  activeDot: {
    width: 8,
    height: 8,
    backgroundColor: "white",
  },
});
