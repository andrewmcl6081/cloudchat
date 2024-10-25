// app/services/socket/socket.client.ts
import { io, Socket } from 'socket.io-client';
import type { Message } from '@prisma/client';

// We'll use this to avoid redefining type shapes
export type NewMessageData = {
  conversationId: string;
  senderId: string;
  content: string;
};

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: ((message: Message) => void)[] = [];

  // Initialize socket connection
  connect() {
    if (!this.socket) {
      // Connect to same URL as our Express server
      this.socket = io({
        autoConnect: true,
        reconnection: true,
      });

      // Set up message handler
      this.socket.on('new-message', (message: Message) => {
        this.messageHandlers.forEach(handler => handler(message));
      });

      // Handle connection errors
      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }
    return this.socket;
  }

  // Join a specific chat conversation
  joinConversation(conversationId: string) {
    if (this.socket) {
      this.socket.emit('join-conversation', conversationId);
    }
  }

  // Send a new message
  sendMessage(message: NewMessageData) {
    if (this.socket) {
      this.socket.emit('send-message', message);
    }
  }

  // Subscribe to new messages
  onNewMessage(handler: (message: Message) => void) {
    this.messageHandlers.push(handler);
    // Return cleanup function
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  // Cleanup on component unmount
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();