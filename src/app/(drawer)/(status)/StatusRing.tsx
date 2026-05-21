import React, { useId } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import {
  STATUS_RING_UNSEEN,
  STATUS_RING_UNSEEN_DARK,
  WA_RING_VIEWED,
  STATUS_RING_SIZE,
} from "@/constants/statusTheme";

type Props = {
  size?: number;
  statuses?: any[];
  currentUserId?: string | null;
  forceViewed?: boolean;
  strokeWidth?: number;
};

/** Story ring — blue when unseen, grey when seen */
export function StatusRing({
  size = STATUS_RING_SIZE,
  statuses = [],
  currentUserId,
  forceViewed = false,
  strokeWidth = 3,
}: Props) {
  const gradId = useId().replace(/:/g, "");
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const list = statuses?.length ? statuses : [{}];
  const total = Math.max(list.length, 1);
  const gap = total > 1 ? 4 : 0;
  const segment = circumference / total;

  const isSegmentViewed = (s: any) => {
    if (forceViewed) return true;
    if (!currentUserId) return false;
    return (s.views ?? []).some(
      (v: any) => String(v.userId) === String(currentUserId),
    );
  };

  const allViewed =
    forceViewed || (list.length > 0 && list.every(isSegmentViewed));

  if (total === 1) {
    return (
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={allViewed ? WA_RING_VIEWED : STATUS_RING_UNSEEN}
          strokeWidth={strokeWidth}
          fill="none"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={STATUS_RING_UNSEEN} />
          <Stop offset="100%" stopColor={STATUS_RING_UNSEEN_DARK} />
        </LinearGradient>
      </Defs>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#e9edef"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {list.map((s: any, i: number) => {
        const viewed = isSegmentViewed(s);
        const dashLength = segment - gap;
        return (
          <Circle
            key={String(s._id ?? i)}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={viewed ? WA_RING_VIEWED : `url(#${gradId})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dashLength} ${circumference}`}
            strokeDashoffset={-i * segment}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
    </Svg>
  );
}

export function StatusAvatarFrame({
  size = STATUS_RING_SIZE,
  children,
}: {
  size?: number;
  children: React.ReactNode;
}) {
  const inner = size - 6;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {children}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          overflow: "hidden",
        }}
      />
    </View>
  );
}
