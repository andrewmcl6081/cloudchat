// app/services/socket/socket.client.ts
import { io, Socket } from 'socket.io-client';
import type { MessageWithSender } from '~/services/message.server';

export type MessageHandler = (message: MessageWithSender) => void;

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();

  connect() {
    if (!this.socket) {
      this.socket = io({
        autoConnect: true,
        reconnection: true,
      });

      this.socket.on('new-message', (message: MessageWithSender) => {
        this.messageHandlers.forEach(handler => handler(message));
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }
    return this.socket;
  }

  joinConversation(conversationId: string) {
    if (this.socket) {
      this.socket.emit('join-conversation', conversationId);
    }
  }

  sendMessage(message: {
    conversationId: string;
    senderId: string;
    content: string;
  }) {
    if (this.socket) {
      this.socket.emit('send-message', message);
    }
  }

  onNewMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
  }

  removeMessageListener(handler: MessageHandler) {
    this.messageHandlers.delete(handler);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.messageHandlers.clear();
  }
}

export const socketService = new SocketService();