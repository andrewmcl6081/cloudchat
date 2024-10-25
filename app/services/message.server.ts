import { db } from "~/services/db/index.server";
import type { Message, User } from "@prisma/client";

export interface MessageWithSender extends Message {
  sender: User;
}

export class MessageService {
  /**
   * Create a new message and save it to the database
   */
  static async createMessage(data: {
    conversationId: string;
    senderId: string;
    content: string;
  }): Promise<MessageWithSender> {
    return db.message.create({
      data,
      include: {
        sender: true,
      },
    });
  }

  /**
   * Fetch messages for a specific conversation
   */
  static async getConversationMessages(
    conversationId: string
  ): Promise<MessageWithSender[]> {
    return db.message.findMany({
      where: {
        conversationId,
      },
      include: {
        sender: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Get or create a conversation between two users
   */
  static async getOrCreateConversation(
    user1Id: string,
    user2Id: string
  ): Promise<string> {
    // First, try to find an existing conversation
    const existingConversation = await db.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: user1Id } } },
          { participants: { some: { userId: user2Id } } },
        ],
      },
    });

    if (existingConversation) {
      return existingConversation.id;
    }

    // If no conversation exists, create a new one
    const newConversation = await db.conversation.create({
      data: {
        participants: {
          create: [
            { userId: user1Id },
            { userId: user2Id },
          ],
        },
      },
    });

    return newConversation.id;
  }
}