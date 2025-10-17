import 'dotenv/config';

interface Config {
  token: string;
  clientId: string;
  devGuildId?: string;
  nodeEnv: string;
  logLevel: string;
}

const requiredEnvVars = ['DISCORD_TOKEN', 'CLIENT_ID'] as const;

// Check for missing env vars on startup
const missing: string[] = [];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) missing.push(envVar);
}

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}\n` +
    'Check your .env file and make sure all required vars are set.'
  );
}

export const config: Config = {
  token: process.env.DISCORD_TOKEN!,
  clientId: process.env.CLIENT_ID!,
  devGuildId: process.env.DEV_GUILD_ID,
  nodeEnv: process.env.NODE_ENV || 'production',
  logLevel: process.env.LOG_LEVEL || 'info',
};

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
