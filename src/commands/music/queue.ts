import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types/index.js';
import { ReplyHelper } from '../../lib/replies.js';
import { getQueue } from '../../lib/player.js';
import { formatDuration } from '../../lib/ytdlp-stream.js';

export const queue: Command = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue'),

  category: 'music',

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const q = getQueue(interaction.guildId!);

    if (!q || !q.currentItem) {
      await ReplyHelper.error(interaction, 'No music playing!');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(ReplyHelper.getColor('MUSIC'))
      .setTitle('🎵 Music Queue')
      .setTimestamp();

    embed.addFields({
      name: '▶️ Now Playing',
      value: `**[${q.currentItem.info.title}](${q.currentItem.info.url})**\n` +
             `Duration: ${formatDuration(q.currentItem.info.duration)} | Requested by: ${q.currentItem.requestedBy}`,
      inline: false,
    });

    if (q.items.length > 0) {
      const upcoming = q.items
        .slice(0, 10)
        .map((item, i) => `**${i + 1}.** [${item.info.title}](${item.info.url})`)
        .join('\n');

      embed.addFields({
        name: `📋 Up Next (${q.items.length} track${q.items.length !== 1 ? 's' : ''})`,
        value: upcoming,
        inline: false,
      });

      if (q.items.length > 10) {
        embed.setFooter({ text: `... and ${q.items.length - 10} more track(s)` });
      }
    }

    await interaction.reply({ embeds: [embed] });
  },
};
