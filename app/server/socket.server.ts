import type { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import type { MessageWithSender } from "~/services/message.server";

// Define the events the server can send to clients
interface ServerToClientEvents {
  "new-message": (message: MessageWithSender) => void;
  "user-joined": (data: { userId: string, conversationId: string }) => void;
  "user-left":   (data: { userId: string, conversationId: string }) => void;
}

// Define the events the server can receive from clients
interface ClientToServerEvents {
  "join-conversation":  (conversationId: string) => void;
  "leave-conversation": (conversationId: string) => void;
  "send-message":       (data: {
    content: string;
    conversationId: string;
    senderId: string;
  }) => void;
}

export class SocketServer {
  // Singleton pattern: maintain only one instance
  private static instance: SocketServer | null = null;

  //The Socket.IO server instance
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
  private constructor() {}

  // Get or create the singleton instance
  public static getInstance(): SocketServer {
    if (!SocketServer.instance) {
      SocketServer.instance = new SocketServer();
    }

    return SocketServer.instance;
  }

  // Initialize the Socket.IO server
  public initialize(httpServer: HTTPServer) {
    if (!this.io) {
      // Create new Socket.IO server attached to the HTTP Server
      this.io = new Server(httpServer, {
        // Configure CORS for Websocket connections
        cors: {
          origin: process.env.NODE_ENV === "production"
            ? process.env.PRODUCTION_URL
            : "http://localhost:5173",
          methods: ["GET", "POST"],
          credentials: true
        }
      });

      // Set up event handlers
      this.setupEventHandlers();
      console.log("Socket.IO server initialized");
    }

    return this.io;
  }

  // Setup all WebSocket event handlers
  private setupEventHandlers() {
    if (!this.io) return;

    // Handle new client connections
    this.io.on("connection", (socket) => {
      console.log("Client connected!", socket.id);

      // Handle client joining a conversation
      socket.on("join-conversation", (conversationId: string) => {
        // Socket.IO rooms are used to group connections
        socket.join(conversationId);
        console.log(`Socket ${socket.id} joined conversation ${conversationId}`);

        // Notify other clients that a user joined
        socket.to(conversationId).emit("user-joined", {
          conversationId,
          userId: socket.id
        });
      });

      // Handle client leaving a conversation
      socket.on("leave-conversation", (conversationId: string) => {
        socket.leave(conversationId);
        console.log(`Socket ${socket.id} left conversation ${conversationId}`);

        // Notify other clients that a user left
        socket.to(conversationId).emit("user-left", {
          conversationId,
          userId: socket.id
        });
      });

      // Handle client disconnection
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        // Additional clean up can be done here
      });

      // Handle new message from clients
      socket.on("send-message", (data) => {
        console.log("New message received:", data);

        // Create a temporary message object
        const messageData: MessageWithSender = {
          id: "temp-" + Date.now(), // Temporary Id
          content: data.content,
          conversationId: data.conversationId,
          senderId: data.senderId,
          createdAt: new Date(),
          updatedAt: new Date(),
          sender: {
            id:  data.senderId
            // Other sender fields will be filled when saved to database
          }
        } as MessageWithSender;

        // Broadcast the message to all clients in the conversation
        this.io?.to(data.conversationId).emit("new-message", messageData);
      });
    });
  }

  // Utility method to emit events to specific rooms
  public emit(event: keyof ServerToClientEvents, room: string, data: any) {
    if (!this.io) {
      console.warn("Socket.IO not initialized");
      return;
    }
    this.io.to(room).emit(event, data);
  }

  // Get the Socket.IO server instance
  public getIO() {
    return this.io;
  }
}