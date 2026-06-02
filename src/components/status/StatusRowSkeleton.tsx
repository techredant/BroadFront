import { View, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { STATUS_RING_SIZE } from "@/constants/statusTheme";

export function StatusRowSkeleton() {
  const { theme } = useTheme();
  const bone = theme.border ?? "#E5E7EB";

  return (
    <View style={styles.row}>
      <View style={[styles.ring, { backgroundColor: bone }]} />
      <View style={styles.lines}>
        <View style={[styles.line, { backgroundColor: bone, width: "55%" }]} />
        <View style={[styles.lineSm, { backgroundColor: bone, width: "35%" }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  ring: {
    width: STATUS_RING_SIZE,
    height: STATUS_RING_SIZE,
    borderRadius: STATUS_RING_SIZE / 2,
  },
  lines: {
    flex: 1,
    gap: 8,
  },
  line: {
    height: 12,
    borderRadius: 6,
  },
  lineSm: {
    height: 10,
    borderRadius: 5,
  },
});
