import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/index.js';
import { ReplyHelper } from '../../lib/replies.js';
import { resume as resumeTrack, getQueue } from '../../lib/player.js';
import { validateMemberInVoice } from '../../lib/permissions.js';

export const resume: Command = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the current track'),

  category: 'music',

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const validation = validateMemberInVoice(interaction);
    
    if (!validation.success) {
      await ReplyHelper.error(interaction, validation.message!);
      return;
    }

    const queue = getQueue(interaction.guildId!);
    if (!queue) {
      await ReplyHelper.error(interaction, 'No music playing!');
      return;
    }

    const resumed = resumeTrack(interaction.guildId!);
    if (resumed) {
      await ReplyHelper.success(interaction, '▶️ Resumed!');
    } else {
      await ReplyHelper.error(interaction, 'Failed to resume');
    }
  },
};
