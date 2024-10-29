import { io, Socket } from "socket.io-client";
import type { MessageWithSender } from "../message.server";
import { SerializeFrom } from "@remix-run/node";

// Define events that the client can receive from the server
interface ServerToClientEvents {
  "new-message": (message: SerializeFrom<MessageWithSender>) => void;
  "user-joined": (data: { userId: string; conversationId: string; }) => void;
  "user-left": (data: { 
    userId: string;
    conversationId: string;
    reason: "left" | "disconnected";
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
  private debugMode: boolean = true;
  private activeRooms: Set<string> = new Set();
  private hasInitialized: boolean = false;
  private isReconnecting: boolean = false;

  // Store message handlers for components that want to receive messages
  private messageHandlers: Set<(message: SerializeFrom<MessageWithSender>) => void> = new Set();
  private userJoinedHandlers: Set<(data: { userId: string; conversationId: string; }) => void> = new Set();
  private userLeftHandlers: Set<(data: {
    userId: string;
    conversationId: string;
    reason: "left" | "disconnected";
  }) => void> = new Set();

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
    if (this.hasInitialized && this.socket?.connected) {
      this.log("Already initialized and connected, socket ID:", this.socket.id);
      return this.socket;
    }

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

      // Cleanup any existing socket
      if (this.socket) {
        this.log("Cleaning up existing socket");
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      // Create new socket connection
      this.socket = io(window.location.origin, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ["websocket", "polling"],
        forceNew: false,
        multiplex: true,
      });

      // Set up event handlers for this socket
      this.setupEventHandlers();
      this.hasInitialized = true;
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

    // Connection event handlers
    this.socket.on("connect", () => {
      this.log("Connected successfully, socket ID:", this.socket?.id);
      this.log(`Active rooms at connect: ${Array.from(this.activeRooms)}`);
    });

    // Handle disconnections
    this.socket.on("disconnect", (reason) => {
      this.log("Disconnected:", reason);
      this.isReconnecting = true;
    });

    this.socket.io.on("reconnect", (attempt) => {
      this.log(`Reconnected after ${attempt} attempts`);
      if (this.isReconnecting) {
        this.log("WE ARE RECONNECTING BITCH");
        this.rejoinActiveRooms();
        this.isReconnecting = false;
      }
    })

    this.socket.on("user-joined", (data) => {
      this.log("User joined:", data);
      this.userJoinedHandlers.forEach(handler => handler(data));
    });

    this.socket.on("user-left", (data) => {
      this.log("User left:", data);
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

  // Connection management
  private ensureConnection(): boolean {
    if (!this.socket?.connected) {
      this.log("Socket not connected, waiting for reconnection...");
      // Let Socket.IO handle reconnection
      return false;
    }
  
    return true;
  }

  // Room management
  public joinConversation(conversationId: string) {
    if (!this.ensureConnection()) return;

    this.log(`Join attempt for conversation: ${conversationId}`);
    this.log(`Current active rooms: ${Array.from(this.activeRooms)}`);

    // Check if already in this room
    if (this.activeRooms.has(conversationId) && !this.isReconnecting) {
      this.log(`Already in conversation ${conversationId}, skipping join`);
      return;
    }

    // Leave any existing rooms first
    this.activeRooms.forEach(roomId => {
      if (roomId !== conversationId) {
        this.log(`Leaving room ${roomId} before joining ${conversationId}`);
        this.leaveConversation(roomId);
      }
    });

    this.log("Joining conversation:", conversationId);
    this.activeRooms.add(conversationId);
    this.socket!.emit("join-conversation", conversationId);
  }

  public leaveConversation(conversationId: string) {
    if (!this.ensureConnection()) return;

    if (!this.activeRooms.has(conversationId)) {
      this.log(`Not in conversation ${conversationId}, skipping leave`);
      return;
    }

    this.log("Leaving conversation:", conversationId);
    this.activeRooms.delete(conversationId);
    this.socket!.emit("leave-conversation", conversationId);
  }

  private rejoinActiveRooms() {
    this.activeRooms.forEach(roomId => {
      this.log("Rejoining room after reconnect:", roomId);
      this.socket?.emit("join-conversation", roomId);
    })
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

  public onUserJoined(handler: (data: { userId: string; conversationId: string; }) => void) {
    this.log("Registering user joined handler");
    this.userJoinedHandlers.add(handler);
  }

  public removeUserJoinedHandler(handler: (data: { userId: string; conversationId: string; }) => void) {
    this.log("Removing user joined handler");
    this.userJoinedHandlers.delete(handler);
  }

  public onUserLeft(handler: (data: {
    userId: string;
    conversationId: string;
    reason: "left" | "disconnected";
  }) => void) {
    this.log("Registering user left handler");
    this.userLeftHandlers.add(handler);
  }

  public removeUserLeftHandler(handler: (data: {
    userId: string;
    conversationId: string;
    reason: "left" | "disconnected";
  }) => void) {
    this.log("Removing user left handler");
    this.userLeftHandlers.delete(handler);
  }

  // Clean up resources
  public disconnect() {
    if (this.socket) {
      this.log("Disconnecting socket");
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.hasInitialized = false;
      this.activeRooms.clear();
    }
  }

  // Check connection status
  public isConnected(): boolean {
    return !!this.socket?.connected;
  }

  // Get socket ID if connected
  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  public getSocket(): SocketClient | null {
    return this.socket;
  }
}

// Export a singleton instance
export const socketService = SocketService.getInstance();