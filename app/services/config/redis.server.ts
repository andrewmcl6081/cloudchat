import { configService } from "./environment.server";

interface RedisConfig {
  host: string;
  port: number;
  tls: boolean;
  password?: string;
}

class RedisConfigService {
  private static instance: RedisConfigService;
  private config: RedisConfig | null = null;

  private constructor() {
    if (RedisConfigService.instance) {
      throw new Error(
        "Use RedisConfigService.getInstance() to create an instance",
      );
    }
  }

  public static getInstance(): RedisConfigService {
    if (!RedisConfigService.instance) {
      RedisConfigService.instance = new RedisConfigService();
    }

    return RedisConfigService.instance;
  }

  public async getConfig(): Promise<RedisConfig> {
    if (this.config) {
      return this.config;
    }

    const config = await configService.getConfig();

    if (configService.isProdEnvironment(config)) {
      if (!config.REDIS_ENDPOINT) {
        throw new Error(
          "REDIS_ENDPOINT env variable is required in production",
        );
      }

      let redisUrl;
      try {
        redisUrl = new URL(config.REDIS_ENDPOINT);
      } catch (error) {
        throw new Error(`Invalid REDIS_ENDPOINT: ${config.REDIS_ENDPOINT}`);
      }

      // Production configuration
      this.config = {
        host: redisUrl.hostname,
        port: parseInt(redisUrl.port || "6379", 10),
        tls: true,
        password: config.REDIS_AUTH_TOKEN,
      };
    } else {
      // Development configuration
      console.log("CONFIG REDIS SERVER:", config.REDIS_PORT!);
      this.config = {
        host: config.REDIS_HOST!,
        port: parseInt(config.REDIS_PORT!),
        tls: false,
      };
    }

    return this.config;
  }
}

export const redisConfig = RedisConfigService.getInstance();