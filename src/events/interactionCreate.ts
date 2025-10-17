import { Events } from 'discord.js';
import type { ClientEvent } from '../types/index.js';
import { ReplyHelper } from '../lib/replies.js';

// commands
import { ping } from '../commands/util/ping.js';
import { play } from '../commands/music/play.js';
import { skip } from '../commands/music/skip.js';
import { pause } from '../commands/music/pause.js';
import { resume } from '../commands/music/resume.js';
import { queue } from '../commands/music/queue.js';

const commands = new Map([
  [ping.data.name, ping],
  [play.data.name, play],
  [skip.data.name, skip],
  [pause.data.name, pause],
  [resume.data.name, resume],
  [queue.data.name, queue],
]);

export const interactionCreate: ClientEvent = {
  name: Events.InteractionCreate,
  execute: async (interaction: unknown) => {
    const inter = interaction as any;
    
    if (!inter.isChatInputCommand?.()) return;

    const command = commands.get(inter.commandName);
    if (!command) return;

    try {
      await command.execute(inter);
    } catch (error) {
      await ReplyHelper.error(inter, 'Command failed!');
    }
  },
};
