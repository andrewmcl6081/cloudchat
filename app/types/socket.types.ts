import type { SerializeFrom } from "@remix-run/node";
import type { MessageWithSender } from "~/types";

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