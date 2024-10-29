import type { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import type { MessageWithSender } from "~/services/message.server";
import { SerializeFrom } from "@remix-run/node";

// Define the events the server can send to clients
export interface ServerToClientEvents {
  "new-message": (message: SerializeFrom<MessageWithSender>) => void;
  "user-joined": (data: { userId: string, conversationId: string }) => void;
  "user-left":   (data: {
    userId: string,
    conversationId: string,
    reason: "left" | "disconnected"
  }) => void;
  "participant-update": (data: {
    conversationId: string;
    activeParticipants: number;
    isActive: boolean;
  }) => void;
}

// Define the events the server can receive from clients
 export interface ClientToServerEvents {
  "join-conversation":  (conversationId: string) => void;
  "leave-conversation": (conversationId: string) => void;
  "send-message":       (data: {
    content: string;
    conversationId: string;
    senderId: string;
  }) => void;
}

declare global {
  // eslint-disable-next-line no-var
  var __socketIO: Server<ClientToServerEvents, ServerToClientEvents> | undefined;
  // eslint-disable-next-line no-var
  var __socketServer: SocketServer | undefined;
}

export class SocketServer {
  private static instance: SocketServer | null = null;
  private debugMode: boolean = true;
  private initialized: boolean = false;
  private socketRooms: Map<string, Set<string>> = new Map(); // socketId -> Set of roomIds
  private conversationParticipants: Map<string, Set<string>> = new Map(); // conversationId -> Set of socketIds

  private constructor() {
    this.log('SocketServer constructor called');
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

    // Track room's participants
    if (!this.conversationParticipants.has(roomId)) {
      this.conversationParticipants.set(roomId, new Set());
    }
    this.conversationParticipants.get(roomId)?.add(socketId);
  }

  private removeSocketFromRoom(socketId: string, roomId: string) {
    // Remove from socket's rooms
    const rooms = this.socketRooms.get(socketId);
    if (rooms) {
      rooms.delete(roomId);
      if (rooms.size === 0) {
        this.socketRooms.delete(socketId);
      }
    }

    // Remove from room's participants
    const participants = this.conversationParticipants.get(roomId);
    if (participants) {
      participants.delete(socketId);
      if (participants.size === 0) {
        this.conversationParticipants.delete(roomId);
      }
    }
  }

  private emitParticipantUpdate(room: string) {
    const participantCount = this.conversationParticipants.get(room)?.size || 0;
    global.__socketIO?.to(room).emit("participant-update", {
      conversationId: room,
      activeParticipants: participantCount,
      isActive: participantCount === 2 // Chat is fully active when both users are present
    });
  }

  private getSocketRooms(socketId: string): string[] {
    return Array.from(this.socketRooms.get(socketId) || []);
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
        }
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
      socket.on("join-conversation", (conversationId: string) => {
        try {
          socket.join(conversationId);
          this.addSocketToRoom(socket.id, conversationId);

          const participantCount = this.conversationParticipants.get(conversationId)?.size || 0;

          this.log(`Socket ${socket.id} joined conversation ${conversationId}`, {
            participantCount,
            participants: Array.from(this.conversationParticipants.get(conversationId) || []),
            socketRooms: this.getSocketRooms(socket.id)
          });

          // Notify participants about the new joiner
          socket.to(conversationId).emit("user-joined", {
            conversationId,
            userId: socket.id,
            activeParticipants: participantCount,
          });

          // Emit updated participant count to all users in the conversation
          this.emitParticipantUpdate(conversationId);
        } catch (error) {
          this.log("Error in join-conversation:", error);
        }
      });

      // Handle client leaving a conversation
      socket.on("leave-conversation", (conversationId: string) => {
        try {
          this.log(`Socket ${socket.id} leaving conversation ${conversationId}`);

          // Emit to the other clients that we are leaving conversation
          socket.to(conversationId).emit("user-left", {
            conversationId,
            userId: socket.id,
            reason: "left"
          });

          // Leave conversation
          socket.leave(conversationId);
          this.removeSocketFromRoom(socket.id, conversationId);

          // Emit updated participant count
          this.emitParticipantUpdate(conversationId);

          this.log(`Socket ${socket.id} left conversation ${conversationId}`);
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
          this.emitParticipantUpdate(roomId);
        });
      });

      // Handle client disconnection
      socket.on("disconnect", () => {
        const rooms = this.getSocketRooms(socket.id);
        rooms.forEach(roomId => {
          this.removeSocketFromRoom(socket.id, roomId);
          this.emitParticipantUpdate(roomId);
        });
        this.log("Client Disconnected:", socket.id);
      });

      socket.on("send-message", (data) => {
        try {
          // Verify sender is in the conversation
          const isParticipant = this.conversationParticipants.get(data.conversationId)?.has(socket.id);

          if (!isParticipant) {
            this.log(`Message not broadcast - socket not in room ${data.conversationId}`);
            return;
          }

          const messageData = this.createMessageData(data);
          socket.to(data.conversationId).emit("new-message", messageData);

          this.log(`Message sent in conversation ${data.conversationId}`, {
            socketId: socket.id,
            participants: Array.from(this.conversationParticipants.get(data.conversationId) || [])
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