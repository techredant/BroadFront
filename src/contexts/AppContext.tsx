import { chatUserId } from "@/utils/chatConfig";
import React, { PropsWithChildren, useMemo, useState } from "react";
import { Channel, LocalMessage, StreamChat } from "stream-chat";

export type AppContextValue = {
  channel: Channel | undefined;
  setChannel: (channel: Channel) => void;
  isMessageAIGenerated?: (message: LocalMessage) => boolean;
};

export const AppContext = React.createContext<AppContextValue>({
  channel: undefined,
  setChannel: () => {},
  isMessageAIGenerated: undefined,
});

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";

export const nanoid = (size: number = 21): string => {
  let id = "";
  for (let i = 0; i < size; i++) {
    const r = Math.floor(Math.random() * ALPHABET.length);
    id += ALPHABET[r];
  }
  return id;
};

export const createChannel = (client: StreamChat) =>
  client.channel("messaging", nanoid(), {
    members: [chatUserId],
  });

type ChatProviderProps = PropsWithChildren<{
  client: StreamChat;
  isMessageAIGenerated?: (message: LocalMessage) => boolean;
}>;

export const ChatProvider = ({
  client,
  children,
  isMessageAIGenerated,
}: ChatProviderProps) => {
  const [channel, setChannel] = useState<Channel>(() => createChannel(client));

  const contextValue = useMemo(
    () => ({
      channel,
      setChannel,
      isMessageAIGenerated,
    }),
    [channel, isMessageAIGenerated],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

export const useAppContext = () => React.useContext(AppContext);
