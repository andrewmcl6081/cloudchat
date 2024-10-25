import { db } from "~/services/db/index.server";
import type { Message, User } from "@prisma/client";

export interface MessageWithSender extends Message {
  sender: User;
}

export class MessageService {
  /**
   * Get or create a conversation between two users
   * @param auth0Id1 - First user's Auth0 ID
   * @param auth0Id2 - Second user's Auth0 ID
   */
  static async getOrCreateConversation(
    auth0Id1: string,
    auth0Id2: string
  ): Promise<string> {
    // First get both users by their Auth0 IDs
    const dbUsers = await db.user.findMany({
      where: {
        auth0Id: {
          in: [auth0Id1, auth0Id2]
        }
      }
    });

    console.log("Found DB users:", dbUsers); // Debug log

    if (dbUsers.length !== 2) {
      throw new Error("One or both users not found");
    }

    // Get their database IDs
    const [user1, user2] = dbUsers;

    // Look for existing conversation
    const existingConversation = await db.conversation.findFirst({
      where: {
        AND: [
          {
            participants: {
              some: {
                userId: user1.id
              }
            }
          },
          {
            participants: {
              some: {
                userId: user2.id
              }
            }
          }
        ]
      }
    });

    if (existingConversation) {
      return existingConversation.id;
    }

    // Create new conversation
    const newConversation = await db.conversation.create({
      data: {
        participants: {
          createMany: {
            data: [
              { userId: user1.id },
              { userId: user2.id }
            ]
          }
        }
      },
      include: {
        participants: true
      }
    });

    console.log("Created new conversation:", newConversation); // Debug log
    return newConversation.id;
  }

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

  static async createMessage(data: {
    conversationId: string;
    senderId: string; // This is Auth0 ID
    content: string;
  }): Promise<MessageWithSender> {
    // Get the user's database ID from their Auth0 ID
    const user = await db.user.findUnique({
      where: { auth0Id: data.senderId }
    });

    if (!user) {
      throw new Error("Sender not found");
    }

    return db.message.create({
      data: {
        content: data.content,
        conversationId: data.conversationId,
        senderId: user.id // Use database ID
      },
      include: {
        sender: true,
      },
    });
  }
}