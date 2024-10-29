import { io, Socket } from "socket.io-client";
import type { MessageWithSender } from "../message.server";
import { SerializeFrom } from "@remix-run/node";

// Define events that the client can receive from the sender
interface ServerToClientEvents {
  "new-message": (message: SerializeFrom<MessageWithSender>) => void;
  "user-joined": (data: { 
    userId: string;
    conversationId: string;
    activeParticipants: number;
  }) => void;
  "user-left": (data: { 
    userId: string;
    conversationId: string;
    reason: "left" | "disconnected";
    activeParticipants: number;
  }) => void;
  "participant-update": (data: {
    conversationId: string;
    activeParticipants: number;
    isActive: boolean;
  }) => void;
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
  private isConnecting: boolean = false;
  private reconnectionAttempts: number = 0;
  private maxReconnectionAttempts: number = 5;
  private debugMode: boolean = true;

  // Store message handlers for components that want to receive messages
  private messageHandlers: Set<(message: SerializeFrom<MessageWithSender>) => void> = new Set();
  private userJoinedHandlers: Set<(data: {
    userId: string;
    conversationId: string;
    activeParticipants: number;
  }) => void> = new Set();
  private userLeftHandlers: Set<(data: {
    userId: string;
    conversationId: string;
    reason: "left" | "disconnected";
    activeParticipants: number;
  }) => void> = new Set();
  private participantUpdateHandlers: Set<(data: {
    conversationId: string;
    activeParticipants: number;
    isActive: boolean;
  })=> void> = new Set();

  private constructor() {
    console.log("Client Socket service initialized");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private log(...args: any[]) {
    if (this.debugMode) {
      console.log("[Client Socket Service]", ...args);
    }
  }

  // Get the instance
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
      this.log("Connection already in progress");
      return this.socket;
    }

    // If already connected, return existing socket
    if (this.socket?.connected) {
      this.log("Already connected, socket ID:", this.socket.id);
      return this.socket;
    }

    try {
      this.isConnecting = true;
      this.log("Initiating connection...");

      // Create new socket connection
      this.socket = io(window.location.origin, {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectionAttempts,
        timeout: 10000
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
      this.log("Connected successfully, socket ID:", this.socket?.id);
      this.reconnectionAttempts = 0;
    });

    // Handle disconnections
    this.socket.on("disconnect", (reason) => {
      this.log("Disconnected:", reason);
      
      if (reason === "io server disconnect") {
        this.connect();
      }
    });

    // Handle connection errors
    this.socket.on("connect_error", (error) => {
      this.log("Connection error:", error);
      this.reconnectionAttempts++;

      if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
        this.log("Max reconnection attempts reached");
        this.socket?.disconnect();
      }
    });

    // Handle incoming messages
    this.socket.on("user-joined", (data) => {
      this.log("User joined conversation:", data);
    });

    // Handle user left notifications
    this.socket.on("user-left", (data) => {
      this.log("User left conversation:", data);
      this.userLeftHandlers.forEach(handler => handler(data));
    });

    this.socket.on("new-message", (message) => {
      this.log("Message received:", message.id);
      this.messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          this.log("Error in message handler:", error);
        }
      });
    });
  }

  private ensureConnection(): boolean {
    if (!this.socket?.connected) {
      this.log("Socket not connected, attempting to reconnect...");
      this.connect();
    }

    if (!this.socket?.connected) {
      this.log("Failed to establish connection");
      return false;
    }

    return true;
  }

  public joinConversation(conversationId: string) {
    if (!this.ensureConnection()) return;

    this.log("Joining conversation:", conversationId);
    this.socket!.emit("join-conversation", conversationId);
  }

  public leaveConversation(conversationId: string) {
    if (!this.ensureConnection()) return;

    this.log("Leaving conversation:", conversationId);
    this.socket!.emit("leave-conversation", conversationId);
  }

  // Send a message to the server
  public sendMessage(data: { content: string; conversationId: string; senderId: string; }) {
    if (!this.ensureConnection()) {
      this.log("Cannot send message - no connection");
      return;
    }
    
    this.log("Sending message:", data);
    this.socket!.emit("send-message", data);
  }

  // Register a handler for new messages
  public onNewMessage(handler: (message: SerializeFrom<MessageWithSender>) => void) {
    this.log("Registering new message handler");
    this.messageHandlers.add(handler);
  }

  // Remove a message handler
  public removeMessageHandler(handler: (message: SerializeFrom<MessageWithSender>) => void) {
    this.log("Removing message handler");
    this.messageHandlers.delete(handler);
  }

  public onUserLeft(handler: (data: { userId: string, conversationId: string}) => void) {
    this.log("Registering onUserLeft handler");
    this.userLeftHandlers.add(handler);
  }

  public removeUserLeftHandler(handler: (data: { userId: string, conversationId: string}) => void) {
    this.log("Removing onUserLeft handler");
    this.userLeftHandlers.delete(handler);
  }

  // Clean up resources
  public disconnect() {
    if (this.socket) {
      this.log("Disconnecting socket");
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