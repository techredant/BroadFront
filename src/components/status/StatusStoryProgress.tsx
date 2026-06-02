import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { STATUS_RING_UNSEEN, WA_RING_VIEWED } from "@/constants/statusTheme";

type Props = {
  count: number;
  activeIndex: number;
  isSegmentViewed: (index: number) => boolean;
  activeProgressStyle?: AnimatedStyle;
};

function SegmentBar({
  filled,
  active,
  viewed,
  activeProgressStyle,
}: {
  filled: boolean;
  active: boolean;
  viewed: boolean;
  activeProgressStyle?: AnimatedStyle;
}) {
  const trackColor = viewed ? WA_RING_VIEWED : "rgba(255,255,255,0.35)";
  const fillColor = viewed ? WA_RING_VIEWED : STATUS_RING_UNSEEN;

  return (
    <View style={[styles.segment, { backgroundColor: trackColor }]}>
      {filled && !active ? (
        <View style={[styles.fill, { backgroundColor: fillColor, width: "100%" }]} />
      ) : null}
      {active && activeProgressStyle ? (
        <Animated.View
          style={[
            styles.fill,
            styles.activeFill,
            { backgroundColor: fillColor },
            activeProgressStyle,
          ]}
        />
      ) : null}
    </View>
  );
}

export const StatusStoryProgress = memo(function StatusStoryProgress({
  count,
  activeIndex,
  isSegmentViewed,
  activeProgressStyle,
}: Props) {
  if (count <= 0) return null;

  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => {
        const viewed = isSegmentViewed(i);
        const active = i === activeIndex;
        const filled = i < activeIndex || (active && viewed);
        return (
          <SegmentBar
            key={i}
            filled={filled}
            active={active}
            viewed={viewed}
            activeProgressStyle={active ? activeProgressStyle : undefined}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 3,
    flex: 1,
  },
  segment: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
  activeFill: {
    width: "100%",
    transformOrigin: "left",
  },
});
