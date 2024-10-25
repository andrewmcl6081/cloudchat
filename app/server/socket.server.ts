// app/server/socket/socketServer.ts
import type { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';
import { db } from '~/services/db/index.server';
import { PubSubService } from '~/services/pubsub/pubsub.server';

export class SocketServer {
  // Class members
  private io: Server;                // Socket.IO server instance
  private pubsub: PubSubService;     // Pub/Sub service for background processing

  /**
   * Initialize Socket.IO server with an HTTP server instance
   * @param httpServer - The HTTP server to attach Socket.IO to
   */
  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer);
    this.pubsub = new PubSubService();
    this.initialize();
  }

  /**
   * Set up Socket.IO event handlers
   * This is where we define all our real-time messaging logic
   */
  private initialize() {
    // Handle new client connections
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      /**
       * Handle joining a conversation
       * Uses Socket.IO rooms to manage conversation memberships
       */
      socket.on('join-conversation', (conversationId: string) => {
        // Add socket to the conversation's room
        socket.join(conversationId);
        console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
      });

      /**
       * Handle new messages from clients
       * Saves to database and broadcasts to other clients
       */
      socket.on('send-message', async (messageData: {
        conversationId: string;
        senderId: string;
        content: string;
      }) => {
        try {
          // Save message to database first
          const savedMessage = await db.message.create({
            data: {
              conversationId: messageData.conversationId,
              senderId: messageData.senderId,
              content: messageData.content,
            },
            include: {
              sender: true, // Include sender details for UI
            },
          });

          // Broadcast message to all clients in the conversation
          this.io.to(messageData.conversationId).emit('new-message', savedMessage);

          // Send to Pub/Sub for background processing
          // This handles things like notifications, analytics, etc.
          await this.pubsub.publishMessage('new-message', savedMessage);

        } catch (error) {
          console.error('Error processing message:', error);
          // Notify sender of failure
          socket.emit('message-error', { error: 'Failed to send message' });
        }
      });

      // Handle client disconnections
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Could add cleanup logic here if needed
      });
    });
  }

  /**
   * Public method to emit events from outside the class
   * Useful for broadcasting events from other parts of the application
   * @param event - The event name
   * @param room - The room (conversation) to emit to
   * @param data - The data to emit
   */
  public emit(event: string, room: string, data: any) {
    this.io.to(room).emit(event, data);
  }
}