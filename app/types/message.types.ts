import type { SerializeFrom } from "@remix-run/node";
import type { Message, User } from "@prisma/client";

export interface MessageWithSender extends Message {
  sender: User;
}

export interface SendMessageResponse {
  serializedMessage: SerializeFrom<MessageWithSender>;
}

export interface CreateMessagePayload {
  content: string;
  conversationId: string;
  senderId: string;
}

export interface MessageError {
  error: string;
}

export interface UseMessagesProps {
  conversationId: string | null;
  currentUserId: string;
  onMessageReceived?: () => void;
}

export interface MessageListProps {
  messages: SerializeFrom<MessageWithSender>[];
  currentUserId?: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  disabled: boolean;
}