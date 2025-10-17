import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/index.js';
import { ReplyHelper } from '../../lib/replies.js';

export const ping: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot responsiveness'),

  category: 'utility',

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sent = await interaction.reply({ 
      content: '🏓 Pinging...', 
      fetchReply: true, 
      ephemeral: true 
    });
    
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await ReplyHelper.info(
      interaction, 
      `🏓 Pong!\n**Latency:** ${latency}ms\n**API Latency:** ${apiLatency}ms`,
      true
    );
  },
};
