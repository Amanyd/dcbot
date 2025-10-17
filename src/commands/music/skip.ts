import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/index.js';
import { validateMemberInVoice } from '../../lib/permissions.js';
import { ReplyHelper } from '../../lib/replies.js';
import { skip as skipTrack, getQueue } from '../../lib/player.js';

export const skip: Command = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),

  category: 'music',

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const validation = validateMemberInVoice(interaction);
    if (!validation.success) {
      await ReplyHelper.error(interaction, validation.message!);
      return;
    }

    const queue = getQueue(interaction.guildId!);
    
    if (!queue || !queue.isPlaying) {
      await ReplyHelper.error(interaction, 'Nothing is playing!');
      return;
    }

    try {
      const skipped = skipTrack(interaction.guildId!);
      
      if (skipped) {
        const nextTrack = queue.items.length > 0 ? `\nUp next: **${queue.items[0].info.title}**` : '';
        await ReplyHelper.success(interaction, `⏭️ Skipped!${nextTrack}`);
      } else {
        await ReplyHelper.error(interaction, 'Failed to skip track');
      }
    } catch (error) {
      await ReplyHelper.error(interaction, 'Failed to skip track');
    }
  },
};
