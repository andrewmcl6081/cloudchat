// MessagesContext.tsx
import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
} from "react";
import type { SerializeFrom } from "@remix-run/node";
import type { MessageWithSender } from "~/types";

interface MessagesContextType {
  getMessages: (conversationId: string) => SerializeFrom<MessageWithSender>[];
  addMessage: (
    conversationId: string,
    message: SerializeFrom<MessageWithSender>,
  ) => void;
  setConversationMessages: (
    conversationId: string,
    messages: SerializeFrom<MessageWithSender>[],
  ) => void;
  clearConversation: (conversationId: string) => void;
}

const MessagesContext = createContext<MessagesContextType | null>(null);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  // Use a Map to store messages for each conversation
  const [messagesByConversation, setMessagesByConversation] = useState<
    Map<string, SerializeFrom<MessageWithSender>[]>
  >(new Map());

  const getMessages = useCallback(
    (conversationId: string) => {
      return messagesByConversation.get(conversationId) || [];
    },
    [messagesByConversation],
  );

  const addMessage = useCallback(
    (conversationId: string, message: SerializeFrom<MessageWithSender>) => {
      setMessagesByConversation((prev) => {
        const newMap = new Map(prev);
        const conversationMessages = newMap.get(conversationId) || [];

        // Check if message already exists
        if (!conversationMessages.some((m) => m.id === message.id)) {
          newMap.set(conversationId, [...conversationMessages, message]);
        }

        return newMap;
      });
    },
    [],
  );

  const setConversationMessages = useCallback(
    (conversationId: string, messages: SerializeFrom<MessageWithSender>[]) => {
      setMessagesByConversation((prev) => {
        const newMap = new Map(prev);
        newMap.set(conversationId, messages);
        return newMap;
      });
    },
    [],
  );

  const clearConversation = useCallback((conversationId: string) => {
    setMessagesByConversation((prev) => {
      const newMap = new Map(prev);
      newMap.delete(conversationId);
      return newMap;
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      getMessages,
      addMessage,
      setConversationMessages,
      clearConversation,
    }),
    [getMessages, addMessage, setConversationMessages, clearConversation],
  );

  return (
    <MessagesContext.Provider value={contextValue}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }
  return context;
}
