import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/index.js';
import { validateMemberInVoice } from '../../lib/permissions.js';
import { ReplyHelper } from '../../lib/replies.js';
import { play as playTrack } from '../../lib/player.js';

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

    const validation = validateMemberInVoice(interaction);
    if (!validation.success) {
      await ReplyHelper.error(interaction, validation.message!);
      return;
    }

    const { channel: voiceChannel } = validation;

    try {
      // defer reply immediately to avoid 3s timeout
      await interaction.deferReply();

      const result = await playTrack(
        voiceChannel!,
        interaction.channel as any,
        query,
        interaction.user.tag
      );

      await interaction.editReply(result);
    } catch (error) {
      await interaction.editReply('❌ Failed to play track. Try again!').catch(() => {});
    }
  },
};

