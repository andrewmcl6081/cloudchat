import type { MessageWithSender } from "~/types";

export interface ConversationResponse {
  conversationId: string;
}

export interface MessagesResponse {
  messages: MessageWithSender[];
}

export interface ChatBoxProps {
  selectedUserId: string | null;
}

export interface ChatHeaderProps {
  selectedUserId: string;
  isConnected: boolean;
}
