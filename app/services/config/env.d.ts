export interface DevelopmentConfig {
  APP_NAME: string;
  AUTH0_CLIENT_ID: string;
  AUTH0_CLIENT_SECRET: string;
  AUTH0_CALLBACK_URL: string;
  AUTH0_DOMAIN: string;
  AUTH0_RETURN_TO_URL: string;
  DATABASE_URL: string;
  DOMAIN: string;
  PORT: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
}

export interface ProductionConfig {
  APP_NAME: string;
  AUTH0_CLIENT_ID: string;
  AUTH0_CLIENT_SECRET: string;
  AUTH0_CALLBACK_URL: string;
  AUTH0_DOMAIN: string;
  AUTH0_RETURN_TO_URL: string;
  DOMAIN: string;
  REDIS_AUTH_TOKEN: string;
  REDIS_ENDPOINT: string;
}

export type AppConfig = DevelopmentConfig | ProductionConfig;
