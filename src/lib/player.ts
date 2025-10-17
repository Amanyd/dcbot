import {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  entersState,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  type AudioPlayer,
  type VoiceConnection,
  StreamType,
} from '@discordjs/voice';
import type { VoiceBasedChannel, TextChannel } from 'discord.js';
import type { Readable } from 'stream';
import { logger } from '../config/logger.js';
import type { BotConfig } from '../types/index.js';
import { createYtdlpStream, createStreamFromUrl, getDirectOpusUrl, getYtdlpInfo, formatDuration, type VideoInfo } from './ytdlp-stream.js';

export interface QueueItem {
  info: VideoInfo;
  requestedBy: string;
  cachedUrl?: string; // pre-fetched direct url
}

export interface GuildQueue {
  items: QueueItem[];
  player: AudioPlayer;
  connection: VoiceConnection;
  textChannel: TextChannel;
  volume: number;
  isPlaying: boolean;
  currentItem: QueueItem | null;
}

const guildQueues = new Map<string, GuildQueue>();

const defaultConfig: BotConfig = {
  defaultVolume: 80,
  maxQueueSize: 100,
  emptyChannelTimeout: 30_000,
  endQueueTimeout: 30_000,
  maxTrackDuration: 3_600_000,
};

export function createPlayer(): void {}

export function getQueue(guildId: string): GuildQueue | null {
  return guildQueues.get(guildId) || null;
}

export function getBotConfig(): BotConfig {
  return { ...defaultConfig };
}

export async function play(
  voiceChannel: VoiceBasedChannel,
  textChannel: TextChannel,
  query: string,
  requestedBy: string
): Promise<string> {
  console.log('[player] Play request for query:', query);
  try {
    console.log('[player] Getting video info...');
    const info = await getYtdlpInfo(query);
    console.log('[player] Got video info:', info.title);
    const guildId = voiceChannel.guild.id;
    
    let queue = getQueue(guildId);
    
    if (!queue) {
      console.log('[player] Creating new queue for guild:', guildId);
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      const player = createAudioPlayer();

      const subscription = connection.subscribe(player);
      if (!subscription) {
        console.error('[player] Failed to subscribe player to connection');
        throw new Error('Failed to subscribe player to connection');
      }

      queue = {
        items: [],
        player,
        connection,
        textChannel,
        volume: defaultConfig.defaultVolume,
        isPlaying: false,
        currentItem: null,
      };

      guildQueues.set(guildId, queue);

      player.on(AudioPlayerStatus.Idle, () => playNext(guildId));
      player.on('error', (err) => {
        console.error('[player] Player error:', err);
        playNext(guildId);
      });
      console.log('[player] Queue created successfully');
    }

    const queueItem: QueueItem = { info, requestedBy };
    queue.items.push(queueItem);
    console.log('[player] Added to queue. Queue length:', queue.items.length);

    if (!queue.isPlaying) {
      console.log('[player] Queue not playing, starting playback...');
      playNext(guildId);
      return `▶️ **Now playing:** ${info.title}\n🕒 Duration: ${formatDuration(info.duration)}`;
    }

    // pre-fetch url for next track (makes it start instant)
    if (queue.items.length === 1) {
      console.log('[player] Pre-fetching URL for next track');
      getDirectOpusUrl(queueItem.info.url).then(url => {
        if (url) {
          queueItem.cachedUrl = url;
          console.log('[player] Pre-fetched URL successfully');
        }
      }).catch(() => {});
    }

    return `✅ **Added to queue:** ${info.title}\n📍 Position: ${queue.items.length}\n🕒 Duration: ${formatDuration(info.duration)}`;
  } catch (error) {
    console.error('[player] Play error:', error);
    throw error;
  }
}

async function playNext(guildId: string): Promise<void> {
  console.log('[playNext] Called for guild:', guildId);
  const queue = getQueue(guildId);
  if (!queue || queue.items.length === 0) {
    console.log('[playNext] Queue empty or not found');
    if (queue) {
      queue.isPlaying = false;
      queue.currentItem = null;
      await queue.textChannel.send('✅ **Queue finished!**').catch(() => {});
    }
    return;
  }

  const item = queue.items.shift()!;
  queue.currentItem = item;
  queue.isPlaying = true;
  console.log('[playNext] Playing:', item.info.title);

  // pre-fetch next track while this one plays
  if (queue.items.length > 0 && !queue.items[0].cachedUrl) {
    console.log('[playNext] Pre-fetching next track');
    getDirectOpusUrl(queue.items[0].info.url).then(url => {
      if (url) {
        queue.items[0].cachedUrl = url;
        console.log('[playNext] Pre-fetched next track successfully');
      }
    }).catch(() => {});
  }

  try {
    let stream: Readable;
    let usedFast = false;

    // try fast path first (direct url)
    if (item.cachedUrl) {
      console.log('[playNext] Using cached URL');
      try {
        stream = await createStreamFromUrl(item.cachedUrl);
        usedFast = true;
      } catch (err) {
        console.error('[playNext] Cached URL failed, falling back:', err);
        stream = createYtdlpStream(item.info.url);
      }
    } else {
      console.log('[playNext] No cached URL, extracting...');
      const directUrl = await getDirectOpusUrl(item.info.url).catch(() => null);
      
      if (directUrl) {
        console.log('[playNext] Got direct URL');
        try {
          stream = await createStreamFromUrl(directUrl);
          usedFast = true;
        } catch (err) {
          console.error('[playNext] Direct URL failed, falling back:', err);
          stream = createYtdlpStream(item.info.url);
        }
      } else {
        console.log('[playNext] No direct URL, using pipe method');
        stream = createYtdlpStream(item.info.url);
      }
    }

    const resource = createAudioResource(stream, {
      inputType: StreamType.OggOpus,
      inlineVolume: true,
    });

    resource.volume?.setVolume(0.5);
    queue.player.play(resource);
    console.log('[playNext] Started playing audio resource');
    
    const speedIcon = usedFast ? '⚡' : '🎵';
    await queue.textChannel.send(
      `${speedIcon} **Now playing:** ${item.info.title}\n` +
      `🕒 Duration: ${formatDuration(item.info.duration)}\n` +
      `👤 Requested by: ${item.requestedBy}`
    ).catch(() => {});
  } catch (error) {
    console.error('[playNext] Error playing track:', error);
    queue.isPlaying = false;
    playNext(guildId);
  }
}

export function skip(guildId: string): boolean {
  const queue = getQueue(guildId);
  if (!queue || !queue.isPlaying) return false;
  
  queue.player.stop();
  return true;
}

export function pause(guildId: string): boolean {
  const queue = getQueue(guildId);
  if (!queue || !queue.isPlaying) return false;
  
  return queue.player.pause();
}

export function resume(guildId: string): boolean {
  const queue = getQueue(guildId);
  if (!queue) return false;
  
  return queue.player.unpause();
}

export async function destroyPlayer(): Promise<void> {
  for (const queue of guildQueues.values()) {
    queue.player.stop();
    queue.connection.destroy();
  }
  guildQueues.clear();
}
