import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/index.js';
import { validateMemberInVoice } from '../../lib/permissions.js';
import { ReplyHelper } from '../../lib/replies.js';
import { play as playTrack } from '../../lib/player.js';
import { logger } from '../../config/logger.js';

export const play: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play audio from YouTube, SoundCloud, Bandcamp, Twitch')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Song name, URL, or search query')
        .setRequired(true)
    ),

  category: 'music',

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const query = interaction.options.getString('query', true);
    console.log('[play] Command received with query:', query);

    const validation = validateMemberInVoice(interaction);
    if (!validation.success) {
      console.log('[play] Validation failed:', validation.message);
      await ReplyHelper.error(interaction, validation.message!);
      return;
    }

    const { channel: voiceChannel } = validation;

    try {
      // defer reply immediately to avoid 3s timeout
      await interaction.deferReply();

      console.log('[play] Attempting to play track...');
      const result = await playTrack(
        voiceChannel!,
        interaction.channel as any,
        query,
        interaction.user.tag
      );

      await interaction.editReply(result);
    } catch (error) {
      console.error('[play] Command error:', error);
      logger.error('Error in play command:', error);
      await ReplyHelper.error(interaction, 'An error occurred while processing your request');
    }
  },
};

