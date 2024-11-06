import { Server } from "socket.io";
import { SerializeFrom } from "@remix-run/node";
import type { Server as HTTPServer } from "http";
import type { ServerToClientEvents, ClientToServerEvents, MessageWithSender } from "~/types";

declare global {
  // eslint-disable-next-line no-var
  var __socketIO: Server<ClientToServerEvents, ServerToClientEvents> | undefined;
  // eslint-disable-next-line no-var
  var __socketServer: SocketServer | undefined;
}

export class SocketServer {
  private debugMode: boolean = true;
  private initialized: boolean = false;
  private socketRooms: Map<string, Set<string>> = new Map(); // socketId -> Set of roomIds

  private constructor() {
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private log(...args: any[]) {
    if (this.debugMode) {
      console.log("[Server Socket Service]", ...args);
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
      this.log(`Before removal - Socket ${socketId} rooms:`, Array.from(rooms));
      rooms.delete(roomId);
      this.log(`After removal - Socket ${socketId} rooms:`, Array.from(rooms));
      if (rooms.size === 0) {
        this.socketRooms.delete(socketId);
        this.log(`Removed empty room set for socket ${socketId}`);
      }
    }
  }

  private getSocketRooms(socketId: string): string[] {
    const rooms = this.socketRooms.get(socketId);
    const socketIORooms = global.__socketIO?.sockets.sockets.get(socketId)?.rooms;
    this.log(`Room state for ${socketId}:`, {
      tracked: Array.from(rooms || []),
      socketIO: Array.from(socketIORooms || [])
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
      this.log("SocketServer already initialized, skipping...");
      return global.__socketIO!;
    }

    this.log("Initializing SocketServer...");

    if (!global.__socketIO) {
      global.__socketIO = new Server(httpServer, {
        cors: {
          origin: process.env.NODE_ENV === "production"
            ? process.env.PRODUCTION_URL
            : "http://localhost:5173",
          methods: ["GET", "POST"],
          credentials: true
        },
        pingInterval: 25000, // How often to ping clients
        pingTimeout: 20000, // How long to wait for pong
        connectTimeout: 20000, // Connection timeout
        transports: ["websocket", "polling"]
      });

      this.setupEventHandlers();
      this.initialized = true;
      this.log("Socket.IO server initialized successfully");
    }

    return global.__socketIO;
  }

  private createMessageData(data: { content: string; conversationId: string; senderId: string }): SerializeFrom<MessageWithSender> {
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
        isOnline: true,
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    } as SerializeFrom<MessageWithSender>;
  }

  // Setup all WebSocket event handlers
  private setupEventHandlers() {
    if (!global.__socketIO) return;

    // Handle new client connections
    global.__socketIO.on("connection", (socket) => {
      this.log("Client connected!", socket.id);

      // Handle client joining a conversation
      socket.on("join-conversation", async (conversationId: string) => {
        try {
          // First check if already in room from reconnection
          const room = await global.__socketIO?.in(conversationId).allSockets();
          const isInRoom = room?.has(socket.id) || false;

          if (isInRoom) {
            this.log(`Socket ${socket.id} reconnected to room ${conversationId}`);
            this.addSocketToRoom(socket.id, conversationId); // Update our tracking
            return;
          }

          // Get current rooms and leave them before joining new one
          const currentRooms = Array.from(this.socketRooms.get(socket.id) || []);
          for (const roomId of currentRooms) {
            socket.leave(roomId);
            this.removeSocketFromRoom(socket.id, roomId);
          }

          this.log(`Current rooms for socket ${socket.id} before joining:`, Array.from(this.socketRooms.get(socket.id) || []));

          // Join the room
          await socket.join(conversationId);
          this.addSocketToRoom(socket.id, conversationId);

          // Log rooms after joining
          this.log(`Current rooms for socket ${socket.id} after joining:`, Array.from(this.socketRooms.get(socket.id) || []));

          // Only emit user-joined for new joins (not reconnects)
          socket.to(conversationId).emit("user-joined", {
            conversationId,
            userId: socket.id,
          });

          // Log final room state
          const updatedRoom = await global.__socketIO?.in(conversationId).allSockets();
          this.log(`Room ${conversationId} members:`, Array.from(updatedRoom || []));
        } catch (error) {
          this.log("Error in join-conversation:", error);
        }
      });

      // Handle client leaving a conversation
      socket.on("leave-conversation", (conversationId: string) => {
        try {
          const currentRooms = Array.from(this.socketRooms.get(socket.id) || []);

          // Only proceed if socket is actually in this room
          if (!currentRooms.includes(conversationId)) {
            this.log(`Socket ${socket.id} attempted to leave room ${conversationId} but wasn't in it`);
            return;
          }
        
          // Debug logs
          console.log("\nLeave Conversation Debug:");
          console.log("Socket ID:", socket.id);
          console.log("Attempting to leave:", conversationId);
          console.log("Server tracked rooms:", currentRooms);
          console.log("Socket.IO rooms:", Array.from(socket.rooms));

          // Emit to the other clients that we are leaving conversation
          socket.to(conversationId).emit("user-left", {
            conversationId,
            userId: socket.id,
            reason: "left"
          });

          // Leave conversation
          socket.leave(conversationId);
          this.removeSocketFromRoom(socket.id, conversationId);
          
          // Logging
          console.log("Rooms after leaving:", Array.from(this.socketRooms.get(socket.id) || []));
          console.log("Socket.IO rooms after leaving:", Array.from(socket.rooms));
          console.log("Leave Conversation Debug End\n");
        } catch (error) {
          this.log("Error in leave-conversation:", error);
        }
      });

      // Handle disconnects (browser close, tab close, etc)
      socket.on("disconnecting", () => {
        const rooms = this.getSocketRooms(socket.id);
        this.log(`Socket ${socket.id} disconnecting from rooms:`, rooms);

        // Notify all rooms this socket is in
        rooms.forEach(roomId => {
          socket.to(roomId).emit("user-left", {
            conversationId: roomId,
            userId: socket.id,
            reason: "disconnected"
          });
          this.removeSocketFromRoom(socket.id, roomId);
        });
      });

      // Handle client disconnection
      socket.on("disconnect", () => {
        const rooms = this.getSocketRooms(socket.id);
        rooms.forEach(roomId => {
          this.removeSocketFromRoom(socket.id, roomId);
        });
        this.log("Client Disconnected:", socket.id);
      });

      socket.on("send-message", (data) => {
        try {
          // Verify sender is in the conversation
          if (!this.getSocketRooms(socket.id).includes(data.conversationId)) {
            this.log(`Message not broadcast - socket not in room ${data.conversationId}`);
            return;
          }

          const messageData = this.createMessageData(data);
          socket.to(data.conversationId).emit("new-message", messageData);

          this.log(`Message sent in conversation ${data.conversationId}`, {
            socketId: socket.id,
            roomSize: this.getSocketRoomSize(data.conversationId)
          });
        } catch (error) {
          this.log("Error handling send-message:", error);
        }
      });
    });
  }

  public emit(event: keyof ServerToClientEvents, room: string, data: SerializeFrom<MessageWithSender>) {
    if (!global.__socketIO) {
      this.log("Socket.IO not initialized!");
      return;
    }

    try {
      global.__socketIO.to(room).emit(event, data);
      this.log(`Event ${event} emitted to room ${room}`, {
        roomSize: this.getSocketRoomSize(room)
      });
    } catch (error) {
      this.log(`Error emitting event ${event}:`, error);
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