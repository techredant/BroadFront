import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import axios from "axios";
import { useAuth } from "@clerk/clerk-expo";
import { useLevel } from "@/context/LevelContext";
import { NotificationPermissionModal } from "@/app/components/NotificationPermissionModal";
import {
  ensureNotificationChannels,
  requestPushPermissionsAndToken,
} from "@/utils/notification";
import { usePushNotifications } from "@/utils/usePushNotifications";
import { API_PUBLIC_URL } from "@/constants/api";

const PROMPT_STORAGE_KEY = "broadcast_push_prompt_v1";

type PushPromptContextValue = {
  notifyUserEngaged: () => void;
};

const PushPromptContext = createContext<PushPromptContextValue | null>(null);

export function PushPromptProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn } = useAuth();
  const { userDetails } = useLevel();
  const pushUserId = userDetails?.clerkId;

  const [showModal, setShowModal] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const engagedRef = useRef(false);

  useEffect(() => {
    void ensureNotificationChannels();
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      setPermissionGranted(false);
      setShowModal(false);
      engagedRef.current = false;
      return;
    }

    void (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "granted") {
        setPermissionGranted(true);
      }
    })();
  }, [isSignedIn]);

  usePushNotifications(pushUserId, permissionGranted && isSignedIn);

  const notifyUserEngaged = useCallback(() => {
    if (
      !isSignedIn ||
      engagedRef.current ||
      showModal ||
      permissionGranted
    ) {
      return;
    }
    engagedRef.current = true;

    void (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === "granted") {
        setPermissionGranted(true);
        return;
      }

      const saved = await AsyncStorage.getItem(PROMPT_STORAGE_KEY);
      if (saved === "dismissed") {
        return;
      }

      setShowModal(true);
    })();
  }, [isSignedIn, showModal, permissionGranted]);

  const handleEnable = useCallback(async () => {
    setShowModal(false);

    const token = await requestPushPermissionsAndToken();
    if (token && pushUserId) {
      try {
        await axios.post(`${API_PUBLIC_URL}/api/notification-token/token`, {
          userId: pushUserId,
          token,
        });
        setPermissionGranted(true);
        await AsyncStorage.setItem(PROMPT_STORAGE_KEY, "granted");
      } catch (err) {
        console.error("Push token save failed:", err);
      }
    }
  }, [pushUserId]);

  const handleDismiss = useCallback(async () => {
    setShowModal(false);
    await AsyncStorage.setItem(PROMPT_STORAGE_KEY, "dismissed");
  }, []);

  return (
    <PushPromptContext.Provider value={{ notifyUserEngaged }}>
      {children}
      <NotificationPermissionModal
        visible={showModal}
        onEnable={handleEnable}
        onDismiss={handleDismiss}
      />
    </PushPromptContext.Provider>
  );
}

export function usePushPrompt() {
  const ctx = useContext(PushPromptContext);
  if (!ctx) {
    return { notifyUserEngaged: () => {} };
  }
  return ctx;
}
