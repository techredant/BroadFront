// import { View, FlatList } from "react-native";
// import { CreateStatus } from "./CreateStatus";
// import { useTheme } from "@/context/ThemeContext";
// import { StatusItem } from "./StatusItemList";
// import { SafeAreaView } from "react-native-safe-area-context";

// interface Status {
//   id: string;
//   viewed: boolean;
//   user: {
//     name: string;
//     avatar: string;
//   };
// }

// export function StatusList({ statuses }: { statuses: Status[] }) {
//   const { theme } = useTheme();

//   const groupedStatuses = Object.values(
//     statuses.reduce((acc: any, status) => {
//       const key = status.user.name;

//       if (!acc[key]) {
//         acc[key] = {
//           user: status.user,
//           statuses: [],
//         };
//       }

//       acc[key].statuses.push(status);
//       return acc;
//     }, {}),
//   );

//   return (
//     <View
//       style={{
//         flex: 1, // 🔥 IMPORTANT for scrolling
//         backgroundColor: "red",
//       }}
//     >
//       <FlatList
//         data={groupedStatuses}
//         keyExtractor={(item: any) => item.user.name}
//         renderItem={({ item }) => <StatusItem userStatus={item} />}
//         ListHeaderComponent={<CreateStatus />} // 👈 top item
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{
//           paddingVertical: 8,
//         }}
//       />
//     </View>
//   );
// }

import { View, Text } from 'react-native'
import React from 'react'

export default function StatusList() {
  return (
    <View>
      <Text>StatusList</Text>
    </View>
  )
}
