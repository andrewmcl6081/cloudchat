import type { SerializeFrom } from "@remix-run/node";
import type { MessageWithSender } from "~/types";
import type { Socket } from "socket.io-client";

export interface ServerToClientEvents {
  "new-message": (message: SerializeFrom<MessageWithSender>) => void;
  "user-joined": (data: { userId: string; conversationId: string; }) => void;
  "user-left": (data: {
    userId: string;
    conversationId: string;
    reason: "left" | "disconnected";
  }) => void;
}

export interface ClientToServerEvents {
  "join-conversation": (conversationId: string) => void;
  "leave-conversation": (conversationId: string) => void;
  "send-message": (data: {
    content: string;
    conversationId: string;
    senderId: string;
  }) => void;
}

export interface SocketContextType {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (data: { content: string; conversationId: string; senderId: string }) => void;
  addNewMessageListener: (handler: (message: SerializeFrom<MessageWithSender>) => void) => void;
  removeNewMessageListener: (handler: (message: SerializeFrom<MessageWithSender>) => void) => void;
  addUserJoinedListener: (handler: (data: { userId: string; conversationId: string }) => void) => void;
  removeUserJoinedListener: (handler: (data: { userId: string; conversationId: string }) => void) => void;
  addUserLeftListener: (handler: (data: { userId: string; conversationId: string; reason: "left" | "disconnected" }) => void) => void;
  removeUserLeftListener: (handler: (data: { userId: string; conversationId: string; reason: "left" | "disconnected" }) => void) => void;
  getSocketId: () => string | null;
}

export interface UseSocketEventOptions {
  onNewMessage?: (message: SerializeFrom<MessageWithSender>) => void;
  onUserJoined?: (data: { userId: string; conversationId: string }) => void;
  onUserLeft?: (data: { userId: string; conversationId: string; reason: "left" | "disconnected" }) => void;
}