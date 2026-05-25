import React, { memo } from "react";
import { View, Text, Image } from "react-native";
import { Status } from "@/components/status/Status";
import { NotificationBell } from "@/components/notifications/NotificationBell";

type Props = {
  formattedLevel: string;
  levelType: string | null;
  theme: { text: string };
  statuses: any[];
  currentUserId?: string;
};

function HomeFeedHeader({
  formattedLevel,
  levelType,
  theme,
  statuses,
  currentUserId,
}: Props) {
  return (
    <View>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          paddingTop: 30,
          position: "relative",
        }}
      >
        <Text
          style={{
            color: theme.text,
            fontSize: 17,
            textAlign: "center",
            fontWeight: "bold",
            position: "absolute",
            top: 40,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          {formattedLevel}
          {levelType && levelType !== "home" ? ` ${levelType}` : ""}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            alignSelf: "flex-end",
            top: 10,
          }}
        >
          <Image
            source={require("../../../assets/images/icon.jpg")}
            style={{
              height: 30,
              width: 30,
              borderRadius: 50,
            }}
          />
          <View
            style={{
              height: 40,
              width: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <NotificationBell size={22} color={theme.text} />
          </View>
        </View>
      </View>

      <Status statuses={statuses} currentUserId={currentUserId} />
    </View>
  );
}

export const MemoizedHomeFeedHeader = memo(HomeFeedHeader);
