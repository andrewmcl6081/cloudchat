// app/services/pubsub/pubsubService.ts
import { PubSub } from '@google-cloud/pubsub';
import { db } from '~/services/db/index.server';
import type { Message } from '@prisma/client';

export class PubSubService {
  // Class members
  private pubsub: PubSub | null = null;  // The Pub/Sub client instance
  private initialized: boolean = false;    // Track initialization status

  constructor() {
    // Attempt to initialize Pub/Sub when service is created
    this.initialize().catch(error => {
      console.warn('PubSub initialization failed, running without background processing:', error);
    });
  }

  /**
   * Initialize the Pub/Sub client and set up subscriptions
   * This is private because we only want it called during construction
   */
  private async initialize() {
    try {
      // Create new Pub/Sub client with project ID from environment variables
      this.pubsub = new PubSub({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      });

      // Set up message subscriptions
      await this.setupSubscriptions();
      
      this.initialized = true;
      console.log('PubSub initialized successfully');
    } catch (error) {
      // If initialization fails, reset state to null
      this.pubsub = null;
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Set up subscription to handle background processing of messages
   * This is where we handle async tasks that don't need immediate user feedback
   */
  private async setupSubscriptions() {
    if (!this.pubsub) return;

    // Get subscription reference
    const subscription = this.pubsub.subscription('chat-messages-sub');

    // Handle incoming messages
    subscription.on('message', async (message) => {
      try {
        // Parse the message data into our Message type
        const messageData = JSON.parse(message.data.toString()) as Message;

        // Update conversation's last activity timestamp
        // This is an example of background processing
        await db.conversation.update({
          where: { id: messageData.conversationId },
          data: { updatedAt: new Date() },
        });

        // Other potential background tasks:
        // - Update user activity statistics
        // - Process message attachments
        // - Generate notifications
        // - Update search indices
        // - Run content moderation
        // - Archive old messages

        // Acknowledge the message so it won't be sent again
        message.ack();
      } catch (error) {
        console.error('Error processing Pub/Sub message:', error);
        // Negative acknowledgment - message will be resent
        message.nack();
      }
    });

    // Handle subscription errors
    subscription.on('error', (error) => {
      console.error('PubSub subscription error:', error);
    });
  }

  /**
   * Publish a message to Pub/Sub topic
   * This is the main public interface for other services to use
   * @param eventType - Type of event (e.g., 'new-message', 'user-typing')
   * @param data - The message payload
   */
  public async publishMessage(eventType: string, data: any) {
    // Skip if Pub/Sub isn't properly initialized
    if (!this.pubsub || !this.initialized) {
      console.log('PubSub not initialized, skipping message publish');
      return;
    }

    try {
      // Get reference to the topic
      const topic = this.pubsub.topic('chat-messages');

      // Construct message with metadata
      const message = {
        json: {
          eventType,
          data,
          timestamp: new Date().toISOString(),
        },
      };

      // Publish the message and get message ID
      const messageId = await topic.publishMessage(message);
      console.log(`Message ${messageId} published`);
      
    } catch (error) {
      console.error('Error publishing to PubSub:', error);
    }
  }
}