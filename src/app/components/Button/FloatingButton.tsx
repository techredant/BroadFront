// components/FloatingTabButton.tsx
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

export function FloatingTabButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.button} onPress={onPress}>
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    top: -5, // 👈 lifts it above tab bar
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 32,
    backgroundColor: "#1F2937",

    justifyContent: "center",
    alignItems: "center",

    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
