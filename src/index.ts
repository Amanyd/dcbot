import { Client, GatewayIntentBits } from 'discord.js';
import { createPlayer } from './lib/player.js';
import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { ready } from './events/ready.js';
import { interactionCreate } from './events/interactionCreate.js';

async function main(): Promise<void> {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
    ],
  });

  try {
    createPlayer();

    client.once(ready.name, (...args) => ready.execute(...args));
    client.on(interactionCreate.name, (...args) => interactionCreate.execute(...args));

    client.on('error', (error) => logger.logError('Client error', error));

    // ignore random udp socket errors (they're harmless)
    process.on('unhandledRejection', (error) => {
      if (error instanceof Error && 
          (error.message.includes('IP discovery') || 
           error.message.includes('socket closed'))) {
        return;
      }
      logger.logError('Unhandled rejection', error);
    });

    process.on('uncaughtException', (error) => {
      logger.logError('Uncaught exception', error);
      process.exit(1);
    });

    await client.login(config.token);
  } catch (error) {
    logger.logError('Failed to start bot', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main().catch((error) => {
  logger.logError('Fatal error', error);
  process.exit(1);
});
