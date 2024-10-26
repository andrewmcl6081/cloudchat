import { db } from "~/services/db/index.server";
import type { User } from "@prisma/client";

// Handles all database operations related to users in your application. 
// It serves as an interface between your application and the user table
// in your PostgreSQL database (accessed through Prisma)

// Type for Auth0 user data we receive
export type Auth0User = {
  sub: string;      // Auth0's unique identifier for the user
  email: string;    // User's email address
  name?: string;    // Optional user's name
  picture?: string; // Optional profile picture URL
};

export class UserService {
  
  /**
   * Finds an existing user by Auth0 ID or creates a new one
   * This is typically called after Auth0 authentication
   */
  static async findOrCreate(auth0User: Auth0User): Promise<User> {
    return db.user.upsert({
      // Look for existing user by Auth0 ID
      where: { 
        auth0Id: auth0User.sub 
      },

      // If user exists, update their information
      update: {
        email: auth0User.email,
        displayName: auth0User.name,
        picture: auth0User.picture,
      },

      // If user doesn't exist, create new record
      create: {
        auth0Id: auth0User.sub,
        email: auth0User.email,
        displayName: auth0User.name,
      },
    });
  }

  static async getAllUsers(currentUserId: string) {
    return await db.user.findMany({
      where: {
        auth0Id: {
          not: currentUserId
        }
      },
      orderBy: {
        email: "asc"
      }
    });
  }

  /**
   * Finds a user by their Auth0 ID
   * Useful for looking up user details after authentication
   */
  static async findByAuth0Id(auth0Id: string): Promise<User | null> {
    return db.user.findUnique({
      where: { auth0Id },
    });
  }

  /**
   * Finds a user by their database ID
   * Useful when you have a user ID from a message or conversation
   */
  static async findById(id: string): Promise<User | null> {
    return db.user.findUnique({
      where: { id },
    });
  }

  /**
   * Finds a user by their email address
   * Useful for user lookup/search features
   */
  static async findByEmail(email: string): Promise<User | null> {
    return db.user.findUnique({
      where: { email },
    });
  }

  /**
   * Updates a user's profile information
   * Useful for profile editing features
   */
  static async updateProfile(userId: string, data: {
    displayName?: string;
    // Add other updatable fields here
  }): Promise<User> {
    return db.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Gets a list of users who are in a conversation
   * Useful for displaying conversation participants
   */
  static async getConversationParticipants(
    conversationId: string
  ): Promise<User[]> {
    const participants = await db.conversationParticipant.findMany({
      where: { conversationId },
      include: { user: true },
    });
    return participants.map(p => p.user);
  }

  /**
   * Soft delete a user (marks them as inactive rather than removing)
   * Useful for account deletion features
   * Note: You'd need to add an 'active' field to your schema first
   */
  /*
  static async deactivateAccount(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { active: false },
    });
  }
  */
}