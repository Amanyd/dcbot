import { 
  GuildMember, 
  PermissionsBitField, 
  VoiceBasedChannel,
  ChatInputCommandInteraction 
} from 'discord.js';

interface ValidationResult {
  success: boolean;
  message?: string;
  channel?: VoiceBasedChannel;
}

export function validateMemberInVoice(
  interaction: ChatInputCommandInteraction
): ValidationResult {
  if (!interaction.guild) {
    return { success: false, message: '❌ This command only works in servers!' };
  }

  const member = interaction.member as GuildMember | null;
  if (!member?.voice?.channel) {
    return { success: false, message: '❌ You need to be in a voice channel!' };
  }

  const voiceChannel = member.voice.channel;
  if (!voiceChannel.isVoiceBased()) {
    return { success: false, message: '❌ Invalid voice channel!' };
  }

  // Check member permissions
  const memberPerms = voiceChannel.permissionsFor(member);
  if (!memberPerms?.has(PermissionsBitField.Flags.Connect) || 
      !memberPerms?.has(PermissionsBitField.Flags.Speak)) {
    return { success: false, message: '❌ You lack voice channel permissions!' };
  }

  // Check bot permissions
  const botMember = interaction.guild.members.me;
  if (botMember) {
    const botPerms = voiceChannel.permissionsFor(botMember);
    if (!botPerms?.has(PermissionsBitField.Flags.Connect) || 
        !botPerms?.has(PermissionsBitField.Flags.Speak)) {
      return { success: false, message: '❌ I lack voice channel permissions!' };
    }
  }

  return { success: true, channel: voiceChannel };
}

export function isAdmin(member: GuildMember): boolean {
  return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
         member.permissions.has(PermissionsBitField.Flags.ManageGuild);
}
