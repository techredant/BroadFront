import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  type KeyboardEvent,
} from "react-native";
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

/**
 * Lifts a bottom composer with the keyboard (Instagram-style).
 * Android + adjustResize: window resize handles lift; only safe-area when closed.
 * iOS: animates marginBottom with keyboardWillShow/Hide duration.
 */
export function useComposerKeyboardInset(closedBottomInset: number) {
  const keyboardLift = useSharedValue(0);
  const isOpen = useSharedValue(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const initialWindowHeightRef = useRef(Dimensions.get("window").height);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const animateTo = (height: number, duration?: number) => {
      const ms = duration && duration > 10 ? duration : 250;
      keyboardLift.value = withTiming(height, {
        duration: ms,
        easing: Easing.out(Easing.cubic),
      });
      isOpen.value = height > 0 ? 1 : 0;
      setKeyboardOpen(height > 0);
      setKeyboardHeight(height);
    };

    const onShow = (e: KeyboardEvent) => {
      const coords = e.endCoordinates;
      let lift = coords.height;

      if (Platform.OS === "android") {
        const windowH = Dimensions.get("window").height;
        const overlap = Math.max(0, windowH - coords.screenY);
        const frameShrunk =
          initialWindowHeightRef.current > 0
            ? Math.max(0, initialWindowHeightRef.current - windowH)
            : 0;

        if (frameShrunk >= lift * 0.75) {
          lift = 0;
        } else {
          lift = overlap;
        }
      }

      animateTo(lift, e.duration);
    };

    const onHide = (e?: KeyboardEvent) => {
      animateTo(0, e?.duration);
    };

    const dimSub = Dimensions.addEventListener("change", ({ window }) => {
      if (isOpen.value === 0) {
        initialWindowHeightRef.current = window.height;
      }
    });

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
      dimSub.remove();
    };
  }, [keyboardLift, isOpen]);

  const composerStyle = useAnimatedStyle(() => {
    const open = isOpen.value > 0;
    return {
      marginBottom: keyboardLift.value,
      paddingBottom: open ? 8 : closedBottomInset,
    };
  });

  const dockStyle = useAnimatedStyle(() => ({
    bottom: keyboardLift.value,
    paddingBottom: isOpen.value > 0 ? 8 : closedBottomInset,
  }));

  return {
    composerStyle,
    dockStyle,
    keyboardLift,
    keyboardOpen,
    keyboardHeight,
  };
}
