import { ScrollView, View } from "react-native";
import { CreateStatus } from "./CreateStatus";
import { useTheme } from "@/context/ThemeContext";
import { StatusItem } from "./StatusItem";

interface Status {
  id: string;
  viewed: boolean;
  user: {
    name: string;
    avatar: string;
  };
}

export function Status({ statuses }: { statuses: Status[] }) {
  const { theme } = useTheme();

  const groupedStatuses = Object.values(
    statuses.reduce((acc: any, status) => {
      const key = status.user.name;

      if (!acc[key]) {
        acc[key] = {
          user: status.user,
          statuses: [],
        };
      }

      acc[key]?.statuses.push(status);
      return acc;
    }, {}),
  );

  return (
    <View
      style={{
        // paddingVertical: 12,
        marginBottom: 4,
        backgroundColor: theme.card,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 8,
          // gap: 12,
        }}
      >
        <CreateStatus />

        {groupedStatuses.map((userStatus: any) => (
          <StatusItem key={userStatus.user.name} userStatus={userStatus} />
        ))}
      </ScrollView>
    </View>
  );
}
