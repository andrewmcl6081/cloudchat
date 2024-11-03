import type { MessageWithSender } from "~/types"

export interface ConversationResponse {
  conversationId: string;
}

export interface MessagesResponse {
  messages: MessageWithSender[]
}

export interface ChatBoxProps {
  selectedUserId: string | null;
}

export interface ChatHeaderProps {
  user: {
    displayName?: string | null;
    email: string;
    picture?: string | null;
  };
  isConnected: boolean;
}