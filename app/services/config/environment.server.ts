import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import dotenv from "dotenv";
import path from "path";
import { AppConfig, ProductionConfig, DevelopmentConfig } from "./env.d";

declare global {
  // eslint-disable-next-line no-var
  var __environment: AppConfig | undefined;
}

class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig | null = null;

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }

    return ConfigService.instance;
  }

  private async loadDevEnvironment(): Promise<AppConfig> {
    // Load .env.development
    // const envFile =
    //   process.env.SERVER_LABEL === "Server2"
    //     ? ".env.development2"
    //     : ".env.development";

    const envPath = path.resolve(process.cwd(), ".env.development");
    const result = dotenv.config({ path: envPath });

    if (result.error) {
      throw new Error(
        `Error loading development environment: ${result.error.message}`,
      );
    }

    console.log("LOADING DEV ENVIRONMENT:", process.env.AUTH0_CLIENT_ID!);

    return {
      APP_NAME: process.env.APP_NAME!,
      AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID!,
      AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET!,
      AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL!,
      AUTH0_DOMAIN: process.env.AUTH0_DOMAIN!,
      AUTH0_RETURN_TO_URL: process.env.AUTH0_RETURN_TO_URL!,
      DATABASE_URL: process.env.DATABASE_URL!,
      DOMAIN: process.env.DOMAIN!,
      PORT: process.env.PORT!,
      REDIS_HOST: process.env.REDIS_HOST!,
      REDIS_PORT: process.env.REDIS_PORT!,
    };
  }

  private async loadProductionEnvironment(): Promise<AppConfig> {
    const secretsManager = new SecretsManagerClient({ region: "us-east-1" });
    const command = new GetSecretValueCommand({
      SecretId: "prod/cloudchat/secrets",
    });

    try {
      const response = await secretsManager.send(command);

      if (!response.SecretString) {
        throw new Error("Secret prod/cloudchat/secrets not found");
      }

      const secrets = JSON.parse(response.SecretString);

      return {
        APP_NAME: secrets.APP_NAME,
        AUTH0_CLIENT_ID: secrets.AUTH0_CLIENT_ID,
        AUTH0_CLIENT_SECRET: secrets.AUTH0_CLIENT_SECRET,
        AUTH0_CALLBACK_URL: secrets.AUTH0_CALLBACK_URL,
        AUTH0_DOMAIN: secrets.AUTH0_DOMAIN,
        AUTH0_RETURN_TO_URL: secrets.AUTH0_RETURN_TO_URL,
        DOMAIN: secrets.DOMAIN,
        REDIS_AUTH_TOKEN: secrets.REDIS_AUTH_TOKEN,
        REDIS_ENDPOINT: secrets.REDIS_ENDPOINT,
      };
    } catch (error) {
      console.error("Error loading production environment:", error);
      throw error;
    }
  }

  public async getConfig(): Promise<AppConfig> {
    if (global.__environment) {
      return global.__environment;
    }

    const config =
      process.env.NODE_ENV === "production"
        ? await this.loadProductionEnvironment()
        : await this.loadDevEnvironment();

    global.__environment = config; // Cache the configuration globally
    return config;
  }

  public isProdEnvironment(config: AppConfig): config is ProductionConfig {
    const prodKeys: Array<keyof ProductionConfig> = [
      "APP_NAME",
      "AUTH0_CLIENT_ID",
      "AUTH0_CLIENT_SECRET",
      "AUTH0_CALLBACK_URL",
      "AUTH0_DOMAIN",
      "AUTH0_RETURN_TO_URL",
      "DOMAIN",
      "REDIS_AUTH_TOKEN",
      "REDIS_ENDPOINT",
    ];
    return prodKeys.every((key) => key in config);
  }
}

// Export singleton instance
export const configService = ConfigService.getInstance();
