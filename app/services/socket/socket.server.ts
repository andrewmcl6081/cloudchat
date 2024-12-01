import { Server } from "socket.io";
import { SerializeFrom } from "@remix-run/node";
import type { Server as HTTPServer } from "http";
import type { Socket } from "socket.io";
import { RedisSocketAdapter } from "../redis/redis.socket.adaptor";
import { configService } from "../config/environment.server";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  MessageWithSender,
  OnlineUserData,
} from "~/types";

declare global {
  // eslint-disable-next-line no-var
  var __socketIO:
    | Server<ClientToServerEvents, ServerToClientEvents>
    | undefined;
  // eslint-disable-next-line no-var
  var __socketServer: SocketServer | undefined;
  // eslint-disable-next-line no-var
  var __redisAdapter: RedisSocketAdapter | undefined;
}

export class SocketServer {
  private debugMode: boolean = true;
  private initialized: boolean = false;
  private redisAdapter: RedisSocketAdapter | null = null;

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

  // Get or create the singleton instance
  public static getInstance(): SocketServer {
    if (!global.__socketServer) {
      global.__socketServer = new SocketServer();
    }
    return global.__socketServer;
  }

  public async initialize(httpServer: HTTPServer) {
    if (this.initialized) {
      this.log("connection", "SocketServer already initialized, skipping...");
      return global.__socketIO!;
    }

    const env = await configService.getConfig();
    this.log("connection", "Initializing SocketServer...");
    console.log("ENV.DOMAIN:", env.DOMAIN);
    if (!global.__socketIO) {
      global.__socketIO = new Server(httpServer, {
        cors: {
          origin: ["https://www.cloudchatapp.com", "https://cloudchatapp.com"],
          methods: ["GET", "POST"],
          credentials: true,
        },
        path: "/socket.io",
        allowEIO3: true,
        pingInterval: 25000,
        pingTimeout: 20000,
        connectTimeout: 20000,
        transports: ["websocket", "polling"],
      });

      this.redisAdapter = new RedisSocketAdapter(global.__socketIO);
      try {
        await this.redisAdapter.connect();
        global.__redisAdapter = this.redisAdapter;
        this.log("connection", "Redis Adapter connected successfully");
      } catch (error) {
        this.log("error", "Failed to initialize Redis Adapter:", error);
        throw error;
      }

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

      this.setupUserConnection(socket, userId);
      this.setupMessageHandlers(socket, userId);
      this.setupRoomHandlers(socket, userId);
      this.setupDisconnectHandlers(socket, userId);
    });
  }

  private setupUserConnection(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    userId: string,
  ) {
    this.log(
      "connection",
      `User ${userId} connected with socket ${socket?.id}`,
    );

    if (this.redisAdapter) {
      this.redisAdapter
        .setUserPresence(userId, socket.id)
        .then((success) => {
          if (success) {
            // Notify other servers and the server's clients
            //this.redisAdapter?.publishUserStatus(userId, "online");

            // Notify clients and other servers
            socket.broadcast.emit("user-status-change", {
              userId,
              status: "online",
            });
          }
        })
        .catch((error) => this.log("error", "Failed to set presence:", error));
    }

    socket.on("get-online-users", async () => {
      try {
        if (this.redisAdapter) {
          const onlineUsers = await this.redisAdapter.getOnlineUsers();
          const filteredUsers = onlineUsers.filter(
            (user) => user.userId !== userId,
          );

          socket.emit("initial-online-users", filteredUsers);
          this.log("status", "Sent online users list:", filteredUsers);
        }
      } catch (error) {
        this.log("error", "Error getting online users:", error);
      }
    });
  }

  private setupMessageHandlers(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    userId: string,
  ) {
    socket.on("send-message", async (data: any) => {
      try {
        // Check if socket is in the room using Socket.IO's built in rooms
        if (!socket.rooms.has(data.conversationId)) {
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
            roomSize:
              global.__socketIO?.sockets.adapter.rooms.get(data.conversationId)
                ?.size || 0,
          },
        );
      } catch (error) {
        this.log("error", "Error handling send-message:", error);
      }
    });
  }

  private setupRoomHandlers(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    userId: string,
  ) {
    socket.on("join-conversation", async (conversationId: string) => {
      try {
        // Join the room - Redis Adapter handles the rest
        await socket.join(conversationId);
        this.log("room", `Socket ${socket.id} joined room ${conversationId}`);

        // Notify others in the room
        socket.to(conversationId).emit("user-joined", {
          conversationId,
          userId,
        });
      } catch (error) {
        this.log(
          "error",
          `Error joining conversation ${conversationId}:`,
          error,
        );
      }
    });

    socket.on("leave-conversation", async (conversationId: string) => {
      try {
        // Notify before leaving
        socket.to(conversationId).emit("user-left", {
          conversationId,
          userId,
          reason: "left",
        });

        // Simply leave the room
        await socket.leave(conversationId);
        this.log("room", `Socket ${socket.id} left room ${conversationId}`);
      } catch (error) {
        this.log(
          "error",
          `Error leaving conversation ${conversationId}:`,
          error,
        );
      }
    });
  }

  private setupDisconnectHandlers(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    userId: string,
  ) {
    socket.on("disconnecting", () => this.handleDisconnecting(socket, userId));
    socket.on("disconnect", () => this.handleDisconnect(socket, userId));
  }

  private handleDisconnecting(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    userId: string,
  ) {
    // Get all rooms except the socket's own room
    const rooms = Array.from(socket.rooms).filter((room) => room !== socket.id);
    this.log(
      "connection",
      `Socket ${socket.id} disconnecting from rooms:`,
      rooms,
    );

    // Notify all rooms except the socket's own room
    rooms.forEach((roomId) => {
      socket.to(roomId).emit("user-left", {
        conversationId: roomId,
        userId: userId,
        reason: "disconnected",
      });
    });
  }

  private async handleDisconnect(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    userId: string,
  ) {
    try {
      if (userId) {
        // Remove Redis presence first
        if (this.redisAdapter) {
          await this.redisAdapter.removeUserPresence(userId);
          //await this.redisAdapter.publishUserStatus(userId, "offline");
        }

        // Broadcast offline status
        socket.broadcast.emit("user-status-change", {
          userId,
          status: "offline",
        });
        this.log(
          "status",
          `Emitted user-status-change for ${userId} as offline`,
        );
      }

      // No need to clean up rooms - Redis adapter handles this automatically
      this.log("connection", `Socket ${socket.id} disconnected`);
    } catch (error) {
      this.log(
        "error",
        `Error in disconnect handler for user ${userId}:`,
        error,
      );
    }
  }

  public async emit(
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
      const roomSize =
        global.__socketIO.sockets.adapter.rooms.get(room)?.size || 0;
      this.log("connection", `Event ${event} emitted to room ${room}`, {
        roomSize,
      });
    } catch (error) {
      this.log("error", `Error emitting event ${event}:`, error);
    }
  }

  public async getOnlineUserCount(): Promise<number> {
    if (!this.redisAdapter) return 0;

    try {
      const onlineUsers = await this.redisAdapter.getOnlineUsers();
      return onlineUsers.length;
    } catch (error) {
      this.log("error", "Error getting online user count:", error);
      return 0;
    }
  }

  public async isUserOnline(userId: string): Promise<boolean> {
    if (!this.redisAdapter) return false;

    try {
      const exists = await this.redisAdapter
        .getRedisClient()
        ?.exists(`presence:${userId}`);
      return exists === 1;
    } catch (error) {
      this.log("error", `Error checking if user ${userId} is online:`, error);
      return false;
    }
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
