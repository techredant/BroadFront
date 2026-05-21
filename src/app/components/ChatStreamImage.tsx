import { Image } from "expo-image";
import { StyleSheet, type ImageProps } from "react-native";

/** Stream gallery defaults to `contain` — use cover so media fills the bubble. */
export function ChatStreamImage({
  source,
  style,
  resizeMode: _resizeMode,
  onLoadStart,
  onLoadEnd,
  onError,
  accessibilityLabel,
  ...rest
}: ImageProps) {
  return (
    <Image
      {...rest}
      source={source}
      style={[StyleSheet.absoluteFillObject, style]}
      contentFit="cover"
      onLoadStart={onLoadStart}
      onLoad={onLoadEnd}
      onError={onError}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
