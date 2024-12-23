import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  OnlineUserData,
} from "~/types";
import { redisConfig } from "../config/redis.server";

export class RedisSocketAdapter {
  private pubClient: ReturnType<typeof createClient> | null = null;
  private subClient: ReturnType<typeof createClient> | null = null;
  private connected: boolean = false;
  private debugMode: boolean = true;
  private static PRESENCE_PREFIX = "presence:";

  constructor(private io: Server<ClientToServerEvents, ServerToClientEvents>) {}

  private log(category: "redis" | "error" | "presence", ...args: any[]) {
    if (this.debugMode) {
      console.log(`[Redis Adapter][${category.toUpperCase()}]`, ...args);
    }
  }

  async connect() {
    if (this.connected) {
      this.log("redis", "Already connected");
      return;
    }

    try {
      const config = await redisConfig.getConfig();
      console.log("CONFIG:", config);
      this.log("redis", "Initializing with config", {
        host: config.host,
        port: config.port,
        tls: config.tls,
      });

      const baseConfig = {
        socket: {
          host: config.host,
          port: config.port,
          tls: config.tls,
        },
        password: config.password,
      };

      this.pubClient = createClient(baseConfig);
      this.subClient = this.pubClient.duplicate();

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      this.connected = true;

      this.io.adapter(createAdapter(this.pubClient, this.subClient, {}));
      this.log("redis", "Successfully connected and configured");
    } catch (error) {
      this.log("error", "Connection failed:", error);
      throw error;
    }
  }

  isConnected(): boolean {
    return (
      this.connected && !!this.pubClient?.isOpen && !!this.subClient?.isOpen
    );
  }

  async cleanup() {
    if (!this.connected) return;

    try {
      this.log("redis", "Cleaning up Redis connections...");
      await Promise.all([this.pubClient?.quit(), this.subClient?.quit()]);
      this.connected = false;
      this.log("redis", "Redis connections cleaned up");
    } catch (error) {
      this.log("error", "Cleanup error:", error);
    }
  }

  async setUserPresence(userId: string, socketId: string): Promise<boolean> {
    if (!this.pubClient || !this.connected) {
      this.log("error", "Cannot set presence - Redis not connected");
      return false;
    }

    try {
      await this.pubClient.set(
        `${RedisSocketAdapter.PRESENCE_PREFIX}${userId}`,
        socketId,
      );

      this.log(
        "presence",
        `Set presence for user ${userId} with socket ${socketId}`,
      );
      return true;
    } catch (error) {
      this.log("error", "Failed to set user presence:", error);
      return false;
    }
  }

  async removeUserPresence(userId: string): Promise<boolean> {
    if (!this.pubClient || !this.connected) return false;

    try {
      await this.pubClient.del(
        `${RedisSocketAdapter.PRESENCE_PREFIX}${userId}`,
      );
      this.log("presence", `Removed presence for user ${userId}`);
      return true;
    } catch (error) {
      this.log("error", "Failed to remove user presence:", error);
      return false;
    }
  }

  // async getOnlineUsers(): Promise<string[]> {
  //   if (!this.pubClient || !this.connected) return [];

  //   try {
  //     const keys = await this.pubClient.keys(
  //       `${RedisSocketAdapter.PRESENCE_PREFIX}*`,
  //     );
  //     this.log("presence", `Retrieved presence keys: ${keys}`);

  //     const userIds = keys.map((key) =>
  //       key.replace(RedisSocketAdapter.PRESENCE_PREFIX, ""),
  //     );
  //     this.log("presence", `Found ${userIds.length} online users`);
  //     return userIds;
  //   } catch (error) {
  //     this.log("error", "Failed to get online users:", error);
  //     return [];
  //   }
  // }

  async getOnlineUsers(): Promise<OnlineUserData[]> {
    if (!this.pubClient || !this.connected) return [];

    try {
      const keys = await this.pubClient.keys(
        `${RedisSocketAdapter.PRESENCE_PREFIX}*`,
      );
      this.log("presence", `Retrieved presence keys: ${keys}`);

      const onlineUsers = await Promise.all(
        keys.map(async (key) => {
          const socketId = await this.pubClient?.get(key);
          const userId = key.replace(RedisSocketAdapter.PRESENCE_PREFIX, "");

          const userData: OnlineUserData = {
            userId,
            socketId,
          };

          return userData;
        }),
      );
      this.log("presence", `Found ${onlineUsers.length} online users`);
      return onlineUsers;
    } catch (error) {
      this.log("error", "Failed to get online users:", error);
      return [];
    }
  }

  public getServerId() {
    return process.env.SERVER_ID || "default-server";
  }

  getRedisClient() {
    return this.pubClient;
  }
}
