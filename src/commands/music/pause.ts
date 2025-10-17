import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/index.js';
import { ReplyHelper } from '../../lib/replies.js';
import { pause as pauseTrack, getQueue } from '../../lib/player.js';
import { validateMemberInVoice } from '../../lib/permissions.js';

export const pause: Command = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current track'),

  category: 'music',

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const validation = validateMemberInVoice(interaction);
    
    if (!validation.success) {
      await ReplyHelper.error(interaction, validation.message!);
      return;
    }

    const queue = getQueue(interaction.guildId!);
    if (!queue || !queue.isPlaying) {
      await ReplyHelper.error(interaction, 'No music playing!');
      return;
    }

    const paused = pauseTrack(interaction.guildId!);
    if (paused) {
      await ReplyHelper.success(interaction, '⏸️ Paused!');
    } else {
      await ReplyHelper.error(interaction, 'Failed to pause');
    }
  },
};
