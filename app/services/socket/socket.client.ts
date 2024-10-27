import { io, Socket } from "socket.io-client";
import type { MessageWithSender } from "../message.server";

// Define events that the client can receive from the sender
interface ServerToClientEvents {
  "new-message": (message: MessageWithSender) => void;
  "user-joined": (data: { userId: string, conversationId: string }) => void;
  "user-left":   (data: { userId: string, conversationId: string }) => void;
}

// Define events that the client can send to the server
interface ClientToServerEvents {
  "join-conversation": (conversationId: string) => void;
  "leave-conversation": (conversationId: string) => void;
  "send-message": (data: { 
    content: string;
    conversationId: string;
    senderId: string;
  }) => void;
}

// Create a type for our socket instance with proper event typing
type SocketClient = Socket<ServerToClientEvents, ClientToServerEvents>;

export class SocketService {
  private static instance: SocketService | null = null;
  private socket: SocketClient | null = null;

  // Store message handlers for components that want to receive messages
  private messageHandlers: Set<(message: MessageWithSender) => void> = new Set();

  // Connection status
  private isConnecting: boolean = false;

  private constructor() {}

  // Get the singleton instance
  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // Initialize and connect to the socket server
  public connect(): SocketClient | null {
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      return this.socket;
    }

    // If already connected, return existing socket
    if (this.socket?.connected) {
      return this.socket;
    }

    try {
      this.isConnecting = true;

      // Create new socket connection
      this.socket = io(window.location.origin, {
        // Automatically reconnect if connection is lost
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      // Set up event handlers for this socket
      this.setupEventHandlers();

      return this.socket;
    } catch (error) {
      console.error("Socket connection error:", error);
      return null;
    } finally {
      this.isConnecting = false;
    }
  }

  // Set up socket event listeners
  private setupEventHandlers() {
    if (!this.socket) return;

    // Log successful connections
    this.socket.on("connect", () => {
      console.log("Socket connected, ID:", this.socket?.id);
    });

    // Handle disconnections
    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    // Handle connection errors
    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Handle incoming messages
    this.socket.on("user-joined", (data) => {
      console.log("User joined conversation:", data);
    });

    // Handle user left notifications
    this.socket.on("user-left", (data) => {
      console.log("User left conversation:", data);
    });
  }

  public joinConversation(conversationId: string) {
    if (!this.socket?.connected) {
      console.warn("Socket not connected, attempting to connect...");
      this.connect();
    }

    if (this.socket) {
      this.socket.emit("join-conversation", conversationId);
    }
  }

  public leaveConversation(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit("leave-conversation", conversationId);
    }
  }

  // Send a message to the server
  public sendMessage(data: {
    content: string;
    conversationId: string;
    senderId: string;
  }) {
    if (!this.socket?.connected) {
      console.warn("Socket not connected, attempting to connect...");
      this.connect()
    }

    if (this.socket) {
      this.socket.emit("send-message", data);
    }
  }

  // Register a handler for new messages
  public onNewMessage(handler: (message: MessageWithSender) => void) {
    this.messageHandlers.add(handler);
  }

  // Remove a message handler
  public removeMessageHandler(handler: (message: MessageWithSender) => void) {
    this.messageHandlers.delete(handler);
  }

  // Clean up resources
  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.messageHandlers.clear();
  }

  // Check connection status
  public isConnected(): boolean {
    return !!this.socket?.connected;
  }

  // Get socket ID if connected
  public getSocketId(): string | null {
    return this.socket?.id || null;
  }
}

// Export a singleton instance
export const socketService = SocketService.getInstance();