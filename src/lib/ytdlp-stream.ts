import { spawn } from 'child_process';
import type { Readable } from 'stream';

export interface VideoInfo {
  title: string;
  duration: number;
  url: string;
  thumbnail: string;
  uploader: string;
}

interface CachedURL {
  url: string;
  expires: number;
  clientType: string;
}

// cache direct stream urls (6 hour expiry from youtube)
const urlCache = new Map<string, CachedURL>();

// path to https-enabled ffmpeg
const FFMPEG_HTTPS = process.env.FFMPEG_HTTPS_PATH || 
  `${process.env.HOME}/ffmpeg_https/ffmpeg_https.sh`;

// yt-dlp pipes to ffmpeg, ffmpeg spits opus for discord
export function createYtdlpStream(url: string): Readable {
  const ytdlp = spawn('yt-dlp', [
    '-f', 'bestaudio/best',
    '-o', '-',
    '--no-playlist',
    '--quiet',
    '--no-warnings',
    url
  ], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  const ffmpeg = spawn('ffmpeg', [
    '-i', 'pipe:0',
    '-f', 'opus',
    '-ar', '48000',
    '-ac', '2',
    '-b:a', '128k',
    '-strict', '-2',
    '-loglevel', 'warning',
    'pipe:1'
  ]);

  ytdlp.stdout.pipe(ffmpeg.stdin);
  
  // suppress pipe errors (normal when stream stops)
  ytdlp.stdout.on('error', () => {});
  ffmpeg.stdin.on('error', () => {});
  ytdlp.stderr.on('data', () => {});
  ffmpeg.stderr.on('data', () => {});
  
  return ffmpeg.stdout;
}

// streams from direct url using https ffmpeg (fast af)
export function createStreamFromUrl(streamUrl: string): Readable {
  const ffmpeg = spawn(FFMPEG_HTTPS, [
    '-hide_banner',
    '-loglevel', 'error',
    '-headers', 'User-Agent: yt-dlp/2025.10.14',
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-i', streamUrl,
    '-analyzeduration', '0',
    '-probesize', '32',
    '-buffer_size', '4096',
    '-f', 'opus',
    '-ar', '48000',
    '-ac', '2',
    '-b:a', '128k',
    '-strict', '-2',
    'pipe:1'
  ]);

  ffmpeg.stderr.on('data', () => {}); // ignore errors (normal when track ends)
  ffmpeg.on('error', () => {});
  
  return ffmpeg.stdout;
}

// grabs direct url for fast streaming (cached for 5h, non-blocking)
export async function getDirectOpusUrl(url: string): Promise<string | null> {
  const videoId = extractVideoId(url);
  
  if (videoId) {
    const cached = urlCache.get(videoId);
    if (cached && Date.now() < cached.expires * 1000) {
      return cached.url;
    }
  }

  return new Promise((resolve) => {
    const ytdlp = spawn('yt-dlp', ['-f', 'bestaudio', '--get-url', url]);
    let output = '';

    ytdlp.stdout.on('data', (chunk) => output += chunk);
    
    ytdlp.on('close', (code) => {
      if (code === 0 && output.trim().startsWith('http')) {
        const result = output.trim();
        if (videoId) {
          urlCache.set(videoId, {
            url: result,
            expires: Math.floor(Date.now() / 1000) + (5 * 60 * 60),
            clientType: 'default'
          });
        }
        resolve(result);
      } else {
        resolve(null);
      }
    });

    ytdlp.on('error', () => resolve(null));
  });
}

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// grabs metadata without downloading the whole thing
export async function getYtdlpInfo(query: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    const args = isUrl 
      ? ['--dump-json', '--no-playlist', '--skip-download', query]
      : ['--dump-json', '--no-playlist', '--skip-download', `ytsearch1:${query}`];

    const ytdlp = spawn('yt-dlp', args);
    let data = '';
    let errorData = '';

    ytdlp.stdout.on('data', (chunk) => data += chunk);
    ytdlp.stderr.on('data', (chunk) => errorData += chunk);

    ytdlp.on('close', (code) => {
      if (code === 0 && data) {
        try {
          const info = JSON.parse(data);
          resolve({
            title: info.title || 'Unknown',
            duration: info.duration || 0,
            url: info.webpage_url || info.url || query,
            thumbnail: info.thumbnail || '',
            uploader: info.uploader || 'Unknown'
          });
        } catch (err) {
          reject(new Error('Failed to parse video info'));
        }
      } else {
        reject(new Error(`yt-dlp failed: ${errorData || 'Unknown error'}`));
      }
    });

    ytdlp.on('error', (err) => reject(new Error(`Failed to spawn yt-dlp: ${err.message}`)));
  });
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
