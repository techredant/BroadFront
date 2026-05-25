import { useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform } from "react-native";

/** Keyboard lift for live dock (JS state — reliable on Android full-screen overlays). */
export function useLiveKeyboardInset() {
  const [inset, setInset] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: {
      endCoordinates?: { height?: number; screenY?: number };
    }) => {
      const coords = e.endCoordinates;
      let lift = coords?.height ?? Keyboard.metrics()?.height ?? 0;
      if (Platform.OS === "android" && coords?.screenY != null) {
        const windowH = Dimensions.get("window").height;
        lift = Math.max(windowH - coords.screenY, lift);
      }
      setInset(lift);
      setOpen(true);
    };

    const onHide = () => {
      setInset(0);
      setOpen(false);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return { inset, open };
}
