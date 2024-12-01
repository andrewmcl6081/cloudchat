import { io, Socket } from "socket.io-client";
import type {
  MessageWithSender,
  ClientToServerEvents,
  ServerToClientEvents,
  OnlineUserData,
} from "~/types";
import type { SerializeFrom } from "@remix-run/node";

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
  private messageHandlers: Set<
    (message: SerializeFrom<MessageWithSender>) => void
  > = new Set();
  private userJoinedHandlers: Set<
    (data: { userId: string; conversationId: string }) => void
  > = new Set();
  private userStatusHandlers: Set<
    (data: { userId: string; status: string }) => void
  > = new Set(); // New set for user status changes
  private initialOnlineUsersHandlers: Set<(users: OnlineUserData[]) => void> =
    new Set();
  private userLeftHandlers: Set<
    (data: {
      userId: string;
      conversationId: string;
      reason: "left" | "disconnected";
    }) => void
  > = new Set();

  private constructor() {}

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
  public connect(auth: { userId: string | undefined }): SocketClient | null {
    if (this.hasInitialized && this.socket?.connected) {
      this.log("Already initialized and connected, socket ID:", this.socket.id);
      return this.socket;
    }

    if (this.socket && this.socket.connected) {
      this.log("Socket already connected, skipping new connection attempt");
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
      this.log("Initiating connection with auth:", auth);

      // Cleanup any existing socket
      if (this.socket) {
        this.log("Cleaning up existing socket");
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const url = `${protocol}//${host}`;

      // Create new socket connection
      this.socket = io(url, {
        auth,
        path: "/socket.io",
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ["websocket", "polling"],
        withCredentials: true,
        secure: true,
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

      // Request online users upon connection
      this.log("Requesting online list of users from the server");
      this.socket?.emit("get-online-users");

      if (this.activeRooms.size > 0) {
        this.log("Rejoining active rooms:", Array.from(this.activeRooms));
        this.rejoinActiveRooms();
      }
    });

    // Handle disconnections
    this.socket.on("disconnect", (reason) => {
      this.log("Disconnected:", reason);
      this.isReconnecting = true;
    });

    this.socket.io.on("reconnect", (attempt) => {
      this.log(`Reconnected after ${attempt} attempts`);
      if (this.isReconnecting) {
        this.rejoinActiveRooms();
        this.isReconnecting = false;
      }
    });

    this.socket.on(
      "user-status-change",
      (data: { userId: string; status: string }) => {
        this.log("User status change received:", data);
        this.userStatusHandlers.forEach((handler) => handler(data));
      },
    );

    this.socket.on("user-joined", (data) => {
      this.log("User joined:", data);
      this.userJoinedHandlers.forEach((handler) => handler(data));
    });

    this.socket.on("user-left", (data) => {
      this.log("User left:", data);
      this.userLeftHandlers.forEach((handler) => handler(data));
    });

    this.socket.on("new-message", (message) => {
      this.log("Message received:", message.id);
      this.messageHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          this.log("Error in message handler:", error);
        }
      });
    });

    this.socket.on("initial-online-users", (users) => {
      this.log("Received initial online users:", users);
      this.initialOnlineUsersHandlers.forEach((handler) => {
        try {
          handler(users);
        } catch (error) {
          this.log("Error in status handler:", error);
        }
      });
    });
  }

  public sendMessage(data: {
    content: string;
    conversationId: string;
    senderId: string;
  }) {
    if (!this.ensureConnection()) {
      this.log("Cannot send message: socket is not connected");
      return;
    }

    this.log("Sending message:", data);
    this.socket!.emit("send-message", data);
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
    this.activeRooms.forEach((roomId) => {
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
    this.activeRooms.forEach((roomId) => {
      this.log("Rejoining room after reconnect:", roomId);
      this.socket?.emit("join-conversation", roomId);
    });
  }

  public addInitialOnlineUsersListener(
    handler: (users: OnlineUserData[]) => void,
  ) {
    this.log("Registering initial status handler");
    this.initialOnlineUsersHandlers.add(handler);
  }

  public removeInitialOnlineUsersListener(
    handler: (users: OnlineUserData[]) => void,
  ) {
    this.log("Removing initial status handler");
    this.initialOnlineUsersHandlers.delete(handler);
  }

  public addUserStatusListener(
    handler: (data: { userId: string; status: string }) => void,
  ) {
    this.log("Registering new status handler");
    this.userStatusHandlers.add(handler);
  }

  public removeUserStatusListener(
    handler: (data: { userId: string; status: string }) => void,
  ) {
    this.log("Removing status handler");
    this.userStatusHandlers.delete(handler);
  }

  public addNewMessageListener(
    handler: (message: SerializeFrom<MessageWithSender>) => void,
  ) {
    this.log("Registering new message handler");
    this.messageHandlers.add(handler);
  }

  public removeNewMessageListener(
    handler: (message: SerializeFrom<MessageWithSender>) => void,
  ) {
    this.log("Removing message handler");
    this.messageHandlers.delete(handler);
  }

  public addUserJoinedListener(
    handler: (data: { userId: string; conversationId: string }) => void,
  ) {
    this.log("Registering user joined handler");
    this.userJoinedHandlers.add(handler);
  }

  public removeUserJoinedListener(
    handler: (data: { userId: string; conversationId: string }) => void,
  ) {
    this.log("Removing user joined handler");
    this.userJoinedHandlers.delete(handler);
  }

  public addUserLeftListener(
    handler: (data: {
      userId: string;
      conversationId: string;
      reason: "left" | "disconnected";
    }) => void,
  ) {
    this.log("Registering user left handler");
    this.userLeftHandlers.add(handler);
  }

  public removeUserLeftListener(
    handler: (data: {
      userId: string;
      conversationId: string;
      reason: "left" | "disconnected";
    }) => void,
  ) {
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
