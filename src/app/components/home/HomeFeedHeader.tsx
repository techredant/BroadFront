import React, { memo } from "react";
import { View, Text, Image } from "react-native";
import { Status } from "@/app/(drawer)/(status)/Status";

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

        <Image
          source={require("../../../../assets/images/icon.jpg")}
          style={{
            height: 40,
            width: 40,
            borderRadius: 50,
            alignSelf: "flex-end",
            top: 10,
          }}
        />
      </View>

      <Status statuses={statuses} currentUserId={currentUserId} />
    </View>
  );
}

export const MemoizedHomeFeedHeader = memo(HomeFeedHeader);
