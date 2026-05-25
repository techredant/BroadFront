import { View, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  isVerified?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function VerifiedBadge({ isVerified, size = 14, style }: Props) {
  if (!isVerified) return null;

  return (
    <View style={[{ marginLeft: 3 }, style]}>
      <Ionicons name="checkmark-circle" size={size} color="#1D9BF0" />
    </View>
  );
}
