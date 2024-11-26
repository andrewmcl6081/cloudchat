import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import dotenv from "dotenv";
import path from "path";

interface BaseEnvironmentConfig {
  AUTH0_DOMAIN: string;
  AUTH0_CLIENT_ID: string;
  AUTH0_CALLBACK_URL: string;
}

interface DevEnvironmentConfig extends BaseEnvironmentConfig {
  PORT: string;
}

interface ProdEnvironmentConfig extends BaseEnvironmentConfig {}

type EnvironmentConfig = DevEnvironmentConfig | ProdEnvironmentConfig;

declare global {
  // eslint-disable-next-line no-var
  var __environment: EnvironmentConfig | undefined;
}

class EnvironmentConfigService {
  private static instance: EnvironmentConfigService;
  private config: EnvironmentConfig | null = null;

  private constructor() {}

  public static getInstance(): EnvironmentConfigService {
    if (!EnvironmentConfigService.instance) {
      EnvironmentConfigService.instance = new EnvironmentConfigService();
    }

    return EnvironmentConfigService.instance;
  }

  private async loadDevEnvironment(): Promise<EnvironmentConfig> {
    // Load .env.development
    const envPath = path.resolve(process.cwd(), ".env.development");
    const result = dotenv.config({ path: envPath });

    if (result.error) {
      throw new Error(
        `Error loading development environment: ${result.error.message}`,
      );
    }

    // Validate required variables
    if (!process.env.PORT) {
      throw new Error("PORT is required in development mode");
    }

    return {
      AUTH0_DOMAIN: process.env.AUTH0_DOMAIN!,
      AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID!,
      AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL!,
      PORT: process.env.PORT!,
    };
  }

  private async loadProductionEnvironment(): Promise<EnvironmentConfig> {
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
        AUTH0_DOMAIN: secrets.AUTH0_DOMAIN,
        AUTH0_CLIENT_ID: secrets.AUTH0_CLIENT_ID,
        AUTH0_CALLBACK_URL: secrets.AUTH0_CALLBACK_URL,
      };
    } catch (error) {
      console.error("Error loading production environment:", error);
      throw error;
    }
  }

  // Overloaded getConfig method for type-safe return values
  public async getConfig(): Promise<DevEnvironmentConfig>;
  public async getConfig(): Promise<ProdEnvironmentConfig>;
  public async getConfig(): Promise<EnvironmentConfig> {
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
}

// Export singleton instance
export const environmentConfig = EnvironmentConfigService.getInstance();
