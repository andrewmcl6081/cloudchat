// app/server/index.ts
import express from 'express';
import { createServer } from 'http';
import { createRequestHandler } from '@remix-run/express';
import { Server } from 'socket.io';
import { PubSub } from '@google-cloud/pubsub';
import { db } from '../services/db/index.server';  // Your existing Prisma client
import type { Message } from '@prisma/client';

// Initialize Express app
const app = express();
// Create HTTP server from Express app - needed for Socket.IO
const httpServer = createServer(app);
// Initialize Socket.IO, attaching it to our HTTP server
const io = new Server(httpServer);

// Initialize Google Cloud Pub/Sub client
const pubsub = new PubSub();
const topicName = 'chat-messages';
const subscriptionName = 'chat-messages-sub';

// Socket.IO connection handler
io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);
  
  // When a user joins a specific chat conversation
  socket.on('join-conversation', (conversationId: string) => {
    // Socket.IO rooms feature - puts this socket in a specific "room"
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  // When a user sends a new message
  socket.on('send-message', async (messageData: {
    conversationId: string;
    senderId: string;
    content: string;
  }) => {
    try {
      // First, save the message to the database using Prisma
      const savedMessage = await db.message.create({
        data: {
          conversationId: messageData.conversationId,
          senderId: messageData.senderId,
          content: messageData.content,
        },
        include: {
          sender: true,  // Include sender details based on your schema
        },
      });

      // Publish message to Pub/Sub for background processing
      const messageBuffer = Buffer.from(JSON.stringify(savedMessage));
      await pubsub.topic(topicName).publish(messageBuffer);
      
      // Emit the saved message to all clients in this conversation
      io.to(messageData.conversationId).emit('new-message', savedMessage);
    } catch (error) {
      console.error('Error handling message:', error);
      // You might want to emit an error event back to the client
      socket.emit('message-error', { error: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Set up Pub/Sub subscription for background processing
async function setupPubSubSubscription() {
  const subscription = pubsub.subscription(subscriptionName);
  
  subscription.on('message', async (message) => {
    try {
      const messageData = JSON.parse(message.data.toString()) as Message;
      
      // Here you could:
      // 1. Update conversation last activity
      await db.conversation.update({
        where: { id: messageData.conversationId },
        data: { updatedAt: new Date() },
      });
      
      // 2. Create notifications for other participants
      // 3. Update message statistics
      // 4. Process any attachments
      
      message.ack();
    } catch (error) {
      console.error('Error processing Pub/Sub message:', error);
      message.nack();
    }
  });
}

// Initialize Pub/Sub subscription
setupPubSubSubscription().catch(console.error);

// This is the key part - we're telling Express to use Remix to handle all HTTP requests
// This means Remix still handles all your routes and server-side rendering
app.all(
  '*',
  createRequestHandler({
    build: require('../../build'),
    mode: process.env.NODE_ENV,
  })
);

const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});