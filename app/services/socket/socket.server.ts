import { Server } from "socket.io";
import { SerializeFrom } from "@remix-run/node";
import type { Server as HTTPServer } from "http";
import type { Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  MessageWithSender,
} from "~/types";

declare global {
  // eslint-disable-next-line no-var
  var __socketIO:
    | Server<ClientToServerEvents, ServerToClientEvents>
    | undefined;
  // eslint-disable-next-line no-var
  var __socketServer: SocketServer | undefined;
}

export class SocketServer {
  private debugMode: boolean = true;
  private initialized: boolean = false;
  private socketRooms: Map<string, Set<string>> = new Map(); // socketId -> Set of roomIds
  private onlineUsers: Map<string, { socketId: string }> = new Map(); // Track online users by map of userId to socketId

  private constructor() {}

  private log(
    category: "connection" | "room" | "message" | "error" | "status",
    ...args: any[]
  ) {
    if (this.debugMode) {
      console.log(
        `[Server Socket Service][${category.toUpperCase()}]`,
        ...args,
      );
    }
  }

  private addSocketToRoom(socketId: string, roomId: string) {
    // Track socket's rooms
    if (!this.socketRooms.has(socketId)) {
      this.socketRooms.set(socketId, new Set());
    }
    this.socketRooms.get(socketId)?.add(roomId);
  }

  private removeSocketFromRoom(socketId: string, roomId: string) {
    // Remove from socket's rooms
    const rooms = this.socketRooms.get(socketId);
    if (rooms) {
      this.log(
        "room",
        `Before removal - Socket ${socketId} rooms:`,
        Array.from(rooms),
      );
      rooms.delete(roomId);
      this.log(
        "room",
        `After removal - Socket ${socketId} rooms:`,
        Array.from(rooms),
      );
      if (rooms.size === 0) {
        this.socketRooms.delete(socketId);
        this.log("room", `Removed empty room set for socket ${socketId}`);
      }
    }
  }

  private getSocketRooms(socketId: string): string[] {
    const rooms = this.socketRooms.get(socketId);
    const socketIORooms =
      global.__socketIO?.sockets.sockets.get(socketId)?.rooms;
    this.log("room", `Room state for ${socketId}:`, {
      tracked: Array.from(rooms || []),
      socketIO: Array.from(socketIORooms || []),
    });
    return Array.from(rooms || []);
  }

  private getSocketRoomSize(roomId: string): number {
    return global.__socketIO?.sockets.adapter.rooms.get(roomId)?.size || 0;
  }

  // Get or create the singleton instance
  public static getInstance(): SocketServer {
    if (!global.__socketServer) {
      global.__socketServer = new SocketServer();
    }
    return global.__socketServer;
  }

  public initialize(httpServer: HTTPServer) {
    if (this.initialized) {
      this.log("connection", "SocketServer already initialized, skipping...");
      return global.__socketIO!;
    }

    this.log("connection", "Initializing SocketServer...");

    if (!global.__socketIO) {
      global.__socketIO = new Server(httpServer, {
        cors: {
          origin:
            process.env.NODE_ENV === "production"
              ? process.env.PRODUCTION_URL
              : "http://localhost:5173",
          methods: ["GET", "POST"],
          credentials: true,
        },
        pingInterval: 25000, // How often to ping clients
        pingTimeout: 20000, // How long to wait for pong
        connectTimeout: 20000, // Connection timeout
        transports: ["websocket", "polling"],
      });

      this.setupEventHandlers();
      this.initialized = true;
      this.log("connection", "Socket.IO server initialized successfully");
    }

    return global.__socketIO;
  }

  private createMessageData(data: {
    content: string;
    conversationId: string;
    senderId: string;
  }): SerializeFrom<MessageWithSender> {
    return {
      id: `temp-${Date.now()}`,
      content: data.content,
      conversationId: data.conversationId,
      senderId: data.senderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sender: {
        id: data.senderId,
        email: "",
        auth0Id: data.senderId,
        displayName: null,
        picture: null,
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    } as SerializeFrom<MessageWithSender>;
  }

  // Setup all WebSocket event handlers
  private setupEventHandlers() {
    if (!global.__socketIO) return;

    // Handle new client connections
    global.__socketIO.on("connection", (socket) => {
      const userId = socket.handshake.auth?.userId;

      if (!userId) {
        this.log("error", "Connection attempted without userId");
        socket.disconnect();
        return;
      }

      this.handleUserConnection(socket, userId);
      this.setupMessageHandlers(socket, userId);
      this.setupRoomHandlers(socket, userId);
      this.setupDisconnectHandlers(socket, userId);
    });
  }

  // Connection handling
  private handleUserConnection(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    userId: string,
  ) {
    this.log(
      "connection",
      `User ${userId} connected with socket ${socket?.id}`,
    );

    this.onlineUsers.set(userId, { socketId: socket.id });
    this.log(
      "status",
      "Updated onlineUsers map after connection:",
      Array.from(this.onlineUsers.entries()),
    );

    // Broadcast user's online status
    socket.broadcast.emit("user-status-change", {
      userId,
      status: "online",
    });
    this.log("status", `Emitted user-status-change for ${userId} as online`);

    // Set up initial online users request handler
    socket.on("get-online-users", () => this.handleGetOnlineUsers(socket));
  }

  private handleGetOnlineUsers(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  ) {
    this.log("status", "Client requested online users list");

    const onlineUsersList = Array.from(this.onlineUsers.entries())
      .filter(([userId, _]) => userId !== socket.handshake.auth?.userId) // Filter out self
      .map(([userId, value]) => ({
        userId,
        socketId: value.socketId,
      }));

    this.log("status", "Sending online users list:", onlineUsersList);
    socket.emit("initial-online-users", onlineUsersList);
  }

  private setupMessageHandlers(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    userId: string,
  ) {
    socket.on("send-message", (data: any) =>
      this.handleSendMessage(socket, data),
    );
  }

  private handleSendMessage(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    data: any,
  ) {
    try {
      // Verify sender is in the conversation
      if (!this.getSocketRooms(socket.id).includes(data.conversationId)) {
        this.log(
          "error",
          `Message not broadcast - socket not in room ${data.conversationId}`,
        );
        return;
      }

      const messageData = this.createMessageData(data);
      socket.to(data.conversationId).emit("new-message", messageData);

      this.log(
        "message",
        `Message sent in conversation ${data.conversationId}`,
        {
          socketId: socket.id,
          roomSize: this.getSocketRoomSize(data.conversationId),
        },
      );
    } catch (error) {
      this.log("error", "Error handling send-message:", error);
    }
  }

  // Room handling
  private setupRoomHandlers(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    userId: string,
  ) {
    socket.on("join-conversation", (conversationId: string) =>
      this.handleJoinConversation(socket, conversationId),
    );

    socket.on("leave-conversation", (conversationId: string) =>
      this.handleLeaveConversation(socket, conversationId),
    );
  }

  private async handleJoinConversation(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    conversationId: string,
  ) {
    try {
      const room = await global.__socketIO?.in(conversationId).allSockets();
      const isInRoom = room?.has(socket.id) || false;

      if (isInRoom) {
        this.log(
          "room",
          `Socket ${socket.id} already in room ${conversationId}`,
        );
        this.addSocketToRoom(socket.id, conversationId);
        return;
      }

      // Leave current rooms
      await this.leaveCurrentRooms(socket);
      this.log(
        "room",
        `Current rooms for socket ${socket.id} before joining:`,
        Array.from(this.socketRooms.get(socket.id) || []),
      );

      // Join new room
      await socket.join(conversationId);
      this.addSocketToRoom(socket.id, conversationId);
      this.log(
        "room",
        `Current rooms for socket ${socket.id} after joining:`,
        Array.from(this.socketRooms.get(socket.id) || []),
      );

      // Notify others
      socket.to(conversationId).emit("user-joined", {
        conversationId,
        userId: socket.id,
      });
      this.log("room", `Socket ${socket.id} joined room ${conversationId}`);
    } catch (error) {
      this.log("error", "Error in join-conversation:", error);
    }
  }

  private async leaveCurrentRooms(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  ) {
    const currentRooms = Array.from(this.socketRooms.get(socket.id) || []);
    for (const roomId of currentRooms) {
      await socket.leave(roomId);
      this.removeSocketFromRoom(socket.id, roomId);
    }
  }

  private handleLeaveConversation(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    conversationId: string,
  ) {
    try {
      const currentRooms = Array.from(this.socketRooms.get(socket.id) || []);

      if (!currentRooms.includes(conversationId)) {
        this.log("room", `Socket ${socket.id} not in room ${conversationId}`);
        return;
      }

      // Notify and leave
      socket.to(conversationId).emit("user-left", {
        conversationId,
        userId: socket.id,
        reason: "left",
      });

      socket.leave(conversationId);
      this.removeSocketFromRoom(socket.id, conversationId);
      this.log("room", `Socket ${socket.id} left room ${conversationId}`);
    } catch (error) {
      this.log("error", "Error in leave-conversation:", error);
    }
  }

  private setupDisconnectHandlers(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    userId: string,
  ) {
    socket.on("disconnecting", () => this.handleDisconnecting(socket));
    socket.on("disconnect", () => this.handleDisconnect(socket, userId));
  }

  private handleDisconnecting(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  ) {
    const rooms = this.getSocketRooms(socket.id);
    this.log(
      "connection",
      `Socket ${socket.id} disconnecting from rooms:`,
      rooms,
    );

    rooms.forEach((roomId) => {
      socket.to(roomId).emit("user-left", {
        conversationId: roomId,
        userId: socket.id,
        reason: "disconnected",
      });
      this.removeSocketFromRoom(socket.id, roomId);
    });
  }

  private handleDisconnect(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    userId: string,
  ) {
    const rooms = this.getSocketRooms(socket.id);

    if (userId) {
      this.onlineUsers.delete(userId);
      this.log(
        "status",
        "Updating onlineUsers map after disconnection:",
        Array.from(this.onlineUsers.entries()),
      );

      socket.broadcast.emit("user-status-change", {
        userId,
        status: "offline",
      });
      this.log("status", `Emitted user-status-change for ${userId} as offline`);
    }

    // Remove socket from all rooms it was part of
    rooms.forEach((roomId) => {
      this.removeSocketFromRoom(socket.id, roomId);
    });
    this.log("connection", "Client Disconnected:", socket.id);
  }

  public emit(
    event: keyof ServerToClientEvents,
    room: string,
    data: SerializeFrom<MessageWithSender>,
  ) {
    if (!global.__socketIO) {
      this.log("connection", "Socket.IO not initialized!");
      return;
    }

    try {
      global.__socketIO.to(room).emit(event, data);
      this.log("connection", `Event ${event} emitted to room ${room}`, {
        roomSize: this.getSocketRoomSize(room),
      });
    } catch (error) {
      this.log("error", `Error emitting event ${event}:`, error);
    }
  }

  public getOnlineUserCount(): number {
    return this.onlineUsers.size;
  }

  public isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  // Get the Socket.IO server instance
  public getIO() {
    if (!global.__socketIO) {
      throw new Error("Socket.IO not initialized");
    }
    return global.__socketIO;
  }
}

export const socketServer = SocketServer.getInstance();
