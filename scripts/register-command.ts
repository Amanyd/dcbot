import { REST, Routes } from 'discord.js';
import { config } from '../src/config/env.js';
import { logger } from '../src/config/logger.js';

// import commands
import { ping } from '../src/commands/util/ping.js';
import { play } from '../src/commands/music/play.js';
import { skip } from '../src/commands/music/skip.js';
import { pause } from '../src/commands/music/pause.js';
import { resume } from '../src/commands/music/resume.js';
import { queue } from '../src/commands/music/queue.js';

const commands = [
  ping.data.toJSON(),
  play.data.toJSON(),
  skip.data.toJSON(),
  pause.data.toJSON(),
  resume.data.toJSON(),
  queue.data.toJSON(),
];

async function registerCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    logger.info(`Registering ${commands.length} commands...`);

    if (config.nodeEnv === 'development' && config.devGuildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.devGuildId),
        { body: commands }
      );
      logger.info(`Registered ${commands.length} guild commands`);
    } else {
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      logger.info(`Registered ${commands.length} global commands`);
    }
  } catch (error) {
    logger.logError('Failed to register commands', error);
  }
}

registerCommands();
