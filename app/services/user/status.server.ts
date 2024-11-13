import { db } from "~/services/db/index.server";

export class UserStatusServive {
  static async updateOnlineStatus(auth0Id: string, isOnline: boolean) {
    try {
      const user = await db.user.update({
        where: { auth0Id },
        data: {
          lastActive: new Date(),
          isOnline
        }
      });

      return user;
    } catch (error) {
      console.error(`Failed to update user ${auth0Id} status to ${isOnline}:`, error);
      throw error;
    }
  }

  static async markOnline(auth0Id: string) {
    return this.updateOnlineStatus(auth0Id, true);
  }

  static async markOffline(auth0Id: string) {
    return this.updateOnlineStatus(auth0Id, false);
  }

  static async getOnlineUsers() {
    try {
      const users = await db.user.findMany({
        where: { isOnline: true },
        select: {
          id: true,
          auth0Id: true,
          email: true,
          displayName: true,
          lastActive: true
        }
      });

      return users;
    } catch (error) {
      console.error("Failed to fetch online users:", error);
      throw error;
    }
  }

  static async getUserStatus(auth0Id: string) {
    try {
      const user = await db.user.findUnique({
        where: { auth0Id },
        select: {
          isOnline: true,
          lastActive: true
        }
      });

      return user;
    } catch (error) {
      console.error(`Failed to get status for user ${auth0Id}:`, error);
      throw error;
    }
  }
}