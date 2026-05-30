import { OwnCapability, useCall, useCallStateHooks } from "@/rtc";
import type { PermissionRequestEvent } from "@/rtc/types";
import React, { useCallback, useEffect, useState } from "react";
import {
  Text,
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MediaColors } from "@/constants/mediaTheme";

/**
 * Raised-hands queue: viewers request SEND_AUDIO; host approves or rejects.
 */
export const PermissionRequestsPanel = () => {
  const call = useCall();
  const { useHasPermissions } = useCallStateHooks();
  const canModerate = useHasPermissions(OwnCapability.UPDATE_CALL_PERMISSIONS);
  const [requests, setRequests] = useState<PermissionRequestEvent[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!call || !canModerate) return;
    return call.on("call.permission_request", (request) => {
      const req = request as PermissionRequestEvent;
      setRequests((prev) => {
        if (prev.some((r) => r.user.id === req.user.id)) return prev;
        return [...prev, req];
      });
    });
  }, [call, canModerate]);

  const respond = useCallback(
    async (request: PermissionRequestEvent, approve: boolean) => {
      if (!call) return;
      setBusyId(request.user.id);
      try {
        if (approve) {
          await call.grantPermissions(request.user.id, request.permissions);
        } else {
          await call.revokePermissions(request.user.id, request.permissions);
        }
        setRequests((prev) =>
          prev.filter((r) => r.user.id !== request.user.id),
        );
      } catch (err) {
        console.error("permission response error:", err);
      } finally {
        setBusyId(null);
      }
    },
    [call],
  );

  if (!canModerate || !requests.length) return null;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Ionicons name="hand-right" size={16} color={MediaColors.accentCyan} />
        <Text style={styles.headerTitle}>Raised hands ({requests.length})</Text>
      </View>
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {requests.map((request) => {
          const busy = busyId === request.user.id;
          return (
            <View key={request.user.id} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.initial}>
                  {(request.user.name || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.meta}>
                <Text style={styles.name} numberOfLines={1}>
                  {request.user.name || "Guest"}
                </Text>
                <Text style={styles.sub}>Wants to speak</Text>
              </View>
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.actions}>
                  <Pressable
                    style={styles.acceptBtn}
                    onPress={() => respond(request, true)}
                  >
                    <Ionicons name="checkmark" size={18} color="#7B2FF7" />
                  </Pressable>
                  <Pressable
                    style={styles.rejectBtn}
                    onPress={() => respond(request, false)}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: MediaColors.glass,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MediaColors.glassBorder,
    maxHeight: 160,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: MediaColors.glassBorder,
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
  list: { maxHeight: 120 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(123,47,247,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { color: "#fff", fontWeight: "800", fontSize: 13 },
  meta: { flex: 1 },
  name: { color: "#fff", fontWeight: "700", fontSize: 12 },
  sub: { color: MediaColors.textSecondary, fontSize: 10, marginTop: 2 },
  actions: { flexDirection: "row", gap: 8 },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(239,68,68,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
});
