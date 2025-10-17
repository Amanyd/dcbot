import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder
} from 'discord.js';

export interface Command {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  category?: 'music' | 'utility' | 'admin';
  cooldown?: number;
}

export interface PlayerEvent {
  name: string;
  execute: (...args: unknown[]) => void | Promise<void>;
  once?: boolean;
}

export interface ClientEvent {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => void | Promise<void>;
}

export interface BotConfig {
  defaultVolume: number;
  maxQueueSize: number;
  emptyChannelTimeout: number;
  endQueueTimeout: number;
  maxTrackDuration: number;
}
