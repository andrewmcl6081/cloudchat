// app/server/socket.server.ts
import type { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import { MessageWithSender } from '~/services/message.server';

export class SocketServer {
  private static instance: SocketServer | null = null;
  private io: Server | null = null;

  private constructor() {}

  /**
   * Get singleton instance of SocketServer
   */
  public static getInstance(): SocketServer {
    if (!SocketServer.instance) {
      SocketServer.instance = new SocketServer();
    }
    return SocketServer.instance;
  }

  /**
   * Initialize Socket.IO server
   */
  public initialize(httpServer: HTTPServer) {
    if (!this.io) {
      this.io = new Server(httpServer);
      this.setupEventHandlers();
    }
    return this.io;
  }

  /**
   * Set up Socket.IO event handlers
   */
  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join-conversation', (conversationId: string) => {
        socket.join(conversationId);
        console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  /**
   * Emit an event to all clients in a room
   */
  public emit(event: string, room: string, data: MessageWithSender) {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }
    this.io.to(room).emit(event, data);
  }

  /**
   * Get the Socket.IO server instance
   */
  public getIO(): Server | null {
    return this.io;
  }
}