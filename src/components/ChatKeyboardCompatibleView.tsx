import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Dimensions,
  Keyboard,
  type KeyboardAvoidingViewProps,
  type KeyboardEvent,
  type KeyboardMetrics,
  LayoutAnimation,
  type LayoutChangeEvent,
  type LayoutRectangle,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
// Stream message actions (long-press dismiss) expect this provider.
import { KeyboardProvider } from "stream-chat-react-native-core/src/contexts/keyboardContext/KeyboardContext";
import { getKeyboardOpenLift } from "@/utils/chatLayout";

type ChatKeyboardCompatibleViewProps = KeyboardAvoidingViewProps & {
  /** Minimum space between composer and keyboard (≈ one nav bar). */
  keyboardOpenLift?: number;
};

/**
 * Stream KeyboardCompatibleView + fix for Android: force padding to 0 when the
 * keyboard closes so the composer is not left floating with a gap underneath.
 */
export function ChatKeyboardCompatibleView({
  behavior = "padding",
  children,
  contentContainerStyle,
  enabled = true,
  keyboardVerticalOffset = Platform.OS === "ios" ? 86.5 : 0,
  keyboardOpenLift = getKeyboardOpenLift(Platform.OS === "android" ? 48 : 34),
  style,
  onLayout,
  ...props
}: ChatKeyboardCompatibleViewProps) {
  const frameRef = useRef<LayoutRectangle | null>(null);
  const initialFrameHeightRef = useRef(0);
  const lastKeyboardFrameRef = useRef<KeyboardMetrics | null>(null);
  const isKeyboardOpenRef = useRef(false);
  const [bottom, setBottom] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const relativeKeyboardHeight = useCallback(
    (keyboardFrame: KeyboardMetrics) => {
      const frame = frameRef.current;
      if (!frame || !keyboardFrame || keyboardFrame.screenY === 0) {
        return 0;
      }

      if (Platform.OS === "android") {
        const keyboardY = keyboardFrame.screenY - keyboardVerticalOffset;
        const overlap = Math.max(frame.y + frame.height - keyboardY, 0);

        const barHeights =
          Dimensions.get("screen").height - Dimensions.get("window").height;
        if (overlap <= Math.max(barHeights, StatusBar.currentHeight ?? 0)) {
          return 0;
        }

        // adjustResize shrinks the window — don't pad again for the same keyboard height.
        const keyboardHeight = keyboardFrame.height;
        const frameShrunk =
          initialFrameHeightRef.current > 0
            ? Math.max(0, initialFrameHeightRef.current - frame.height)
            : 0;

        if (keyboardHeight > 0 && frameShrunk >= keyboardHeight * 0.8) {
          return Math.max(0, overlap - frameShrunk);
        }

        return overlap;
      }

      const keyboardY = keyboardFrame.screenY - keyboardVerticalOffset;
      return Math.max(frame.y + frame.height - keyboardY, 0);
    },
    [keyboardVerticalOffset],
  );

  const resolveBottom = useCallback(
    (keyboardFrame: KeyboardMetrics) => {
      if (!keyboardFrame?.height || !isKeyboardOpenRef.current) return 0;

      const frame = frameRef.current;

      if (Platform.OS === "android" && frame) {
        const viewBottom = frame.y + frame.height;
        const overlap = viewBottom - keyboardFrame.screenY;
        if (overlap > 8) {
          return overlap;
        }
        return keyboardOpenLift;
      }

      const overlap = relativeKeyboardHeight(keyboardFrame);
      return Math.max(overlap, keyboardOpenLift);
    },
    [keyboardOpenLift, relativeKeyboardHeight],
  );

  const applyBottom = useCallback(
    (height: number, event?: KeyboardEvent) => {
      if (!enabled) return;

      setBottom((prev) => {
        if (prev === height) return prev;

        if (event?.duration && event.easing) {
          LayoutAnimation.configureNext({
            duration: event.duration > 10 ? event.duration : 10,
            update: {
              duration: event.duration > 10 ? event.duration : 10,
              type:
                LayoutAnimation.Types[
                  event.easing as keyof typeof LayoutAnimation.Types
                ] || "keyboard",
            },
          });
        }

        return height;
      });
    },
    [enabled],
  );

  const onKeyboardHide = useCallback(() => {
    isKeyboardOpenRef.current = false;
    lastKeyboardFrameRef.current = null;
    setIsKeyboardOpen(false);
    applyBottom(0);
    if (frameRef.current) {
      initialFrameHeightRef.current = frameRef.current.height;
    }
  }, [applyBottom]);

  const onKeyboardShow = useCallback(
    (event: KeyboardEvent) => {
      if (!event.endCoordinates.height) {
        onKeyboardHide();
        return;
      }
      lastKeyboardFrameRef.current = event.endCoordinates;
      isKeyboardOpenRef.current = true;
      setIsKeyboardOpen(true);
      applyBottom(resolveBottom(event.endCoordinates), event);
    },
    [applyBottom, onKeyboardHide, resolveBottom],
  );

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [onKeyboardHide, onKeyboardShow]);

  useEffect(() => {
    const onAppStateChange = (next: AppStateStatus) => {
      if (next === "active") {
        onKeyboardHide();
      }
    };
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, [onKeyboardHide]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const layout = event.nativeEvent.layout;
      frameRef.current = layout;
      if (!initialFrameHeightRef.current) {
        initialFrameHeightRef.current = layout.height;
      }

      if (isKeyboardOpenRef.current && lastKeyboardFrameRef.current) {
        applyBottom(resolveBottom(lastKeyboardFrameRef.current));
      }

      onLayout?.(event);
    },
    [applyBottom, onLayout, resolveBottom],
  );

  const dismissKeyboard = useCallback(() => {
    if (!isKeyboardOpen) return;
    return new Promise<void>((resolve) => {
      const sub = Keyboard.addListener("keyboardDidHide", () => {
        sub.remove();
        resolve();
      });
      Keyboard.dismiss();
    });
  }, [isKeyboardOpen]);

  const bottomHeight = enabled ? bottom : 0;

  const content =
    behavior === "height" && bottomHeight > 0 && frameRef.current ? (
      <View
        style={[
          style,
          {
            flex: 0,
            height: initialFrameHeightRef.current - bottomHeight,
          },
        ]}
        onLayout={handleLayout}
        {...props}
      >
        {children}
      </View>
    ) : behavior === "position" ? (
      <View style={style} onLayout={handleLayout} {...props}>
        <View style={[contentContainerStyle, { bottom: bottomHeight }]}>
          {children}
        </View>
      </View>
    ) : (
      <View
        style={[style, { paddingBottom: bottomHeight }]}
        onLayout={handleLayout}
        {...props}
      >
        {children}
      </View>
    );

  return (
    <KeyboardProvider value={{ dismissKeyboard }}>{content}</KeyboardProvider>
  );
}
