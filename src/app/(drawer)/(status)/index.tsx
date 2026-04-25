

import React, { useRef, useState, useMemo, useEffect } from "react";
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  TextInput,
  Animated,
  Pressable,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { StatusItemList } from "./StatusItemList";
import { DrawerMenuButton } from "@/app/components/Button/DrawerMenuButton";
import { CreateStatusSidebar } from "./CreateStatusSidebar";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "https://cast-api-zeta.vercel.app"; // 🔥 change this

export default function StatusScreen() {
  const scrollY = useRef(new Animated.Value(0)).current;

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH ================= */
  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/status`);
      setStatuses(res.data);
    } catch (err) {
      console.log("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };
console.log("statuses", statuses);

  /* 🔹 Group statuses */
  const groupedStatuses = useMemo(() => {
    const grouped = Object.values(
      statuses.reduce((acc: any, status: any) => {
        if (!status.userId) return acc;

        const key = status.userId;

        if (!acc[key]) {
          acc[key] = {
            user: status.userId,
            statuses: [],
          };
        }

        acc[key].statuses.push(status);
        return acc;
      }, {}),
    );

    if (!query.trim()) return grouped;

    return grouped.filter((item: any) =>
      item.firstName.toLowerCase().includes(query.toLowerCase()),
    );
  }, [statuses, query]);

  /* 🌊 Header animations */
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [110, 70],
    extrapolate: "clamp",
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <DrawerMenuButton />

      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <View style={styles.center}>
          <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
            Status
          </Animated.Text>

          {searchOpen ? (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search status..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              autoFocus
            />
          ) : (
            <Text style={styles.subtitle}>
              {groupedStatuses.length} updates
            </Text>
          )}
        </View>

        <View style={styles.right}>
          <Pressable onPress={() => setSearchOpen((p) => !p)}>
            <Ionicons name="search" size={22} color="#2563EB" />
          </Pressable>

          <Pressable style={{ marginLeft: 14 }}>
            <Ionicons name="notifications-outline" size={22} color="#2563EB" />
            <View style={styles.badge} />
          </Pressable>

          {/* <CreateStatusSidebar /> */}
        </View>

        <View style={styles.activeLine} />
      </Animated.View>

      {/* LIST */}
      <Animated.FlatList
        data={groupedStatuses}
        keyExtractor={(item: any, index) => item.userId + index}
        renderItem={({ item }) => <StatusItemList userStatus={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        refreshing={loading}
        onRefresh={fetchStatuses}
      />
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  title: { fontSize: 18, fontWeight: "700", color: "#1D4ED8" },

  subtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  searchInput: {
    width: "100%",
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 8,
  },

  right: { flexDirection: "row", alignItems: "center" },

  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },

  activeLine: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 2,
    width: "100%",
    backgroundColor: "#2563EB",
  },

  listContent: { paddingBottom: 40 },
});

