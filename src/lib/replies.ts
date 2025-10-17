import { ChatInputCommandInteraction, EmbedBuilder, ColorResolvable } from 'discord.js';
import { logger } from '../config/logger.js';

const COLORS = {
  SUCCESS: 0x00FF00,
  ERROR: 0xFF0000,
  INFO: 0x0099FF,
  MUSIC: 0x9932CC,
} as const;

export class ReplyHelper {
  static async success(interaction: ChatInputCommandInteraction, message: string, ephemeral = false): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setDescription(`✅ ${message}`)
      .setTimestamp();

    await this.sendReply(interaction, { embeds: [embed], ephemeral });
  }

  static async error(interaction: ChatInputCommandInteraction, message: string, ephemeral = true): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setDescription(`❌ ${message}`)
      .setTimestamp();

    await this.sendReply(interaction, { embeds: [embed], ephemeral });
  }

  static async info(interaction: ChatInputCommandInteraction, message: string, ephemeral = false): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setDescription(`ℹ️ ${message}`)
      .setTimestamp();

    await this.sendReply(interaction, { embeds: [embed], ephemeral });
  }

  static async music(interaction: ChatInputCommandInteraction, message: string, ephemeral = false): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(COLORS.MUSIC)
      .setDescription(`🎵 ${message}`)
      .setTimestamp();

    await this.sendReply(interaction, { embeds: [embed], ephemeral });
  }

  static createEmbed(title?: string, description?: string, color: ColorResolvable = COLORS.INFO): EmbedBuilder {
    const embed = new EmbedBuilder().setColor(color).setTimestamp();
    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    return embed;
  }

  static getColor(type: keyof typeof COLORS): number {
    return COLORS[type] || COLORS.INFO;
  }

  private static async sendReply(interaction: ChatInputCommandInteraction, options: any): Promise<void> {
    try {
      // Convert ephemeral to flags if present
      if (options.ephemeral !== undefined) {
        const ephemeral = options.ephemeral;
        delete options.ephemeral;
        if (ephemeral) {
          options.flags = 1 << 6; // MessageFlags.Ephemeral
        }
      }
      
      if (interaction.deferred) {
        await interaction.editReply(options);
      } else if (interaction.replied) {
        await interaction.followUp(options);
      } else {
        await interaction.reply(options);
      }
    } catch (error) {
      logger.logError('Failed to send reply', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ An error occurred.', flags: 1 << 6 });
        }
      } catch {}
    }
  }
}
