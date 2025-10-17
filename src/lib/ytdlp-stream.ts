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

// POT provider URL for Railway private networking
const POT_PROVIDER_URL = process.env.POT_PROVIDER_URL || 'http://localhost:4416';

// Build yt-dlp args with POT provider
function buildYtdlpArgs(baseArgs: string[]): string[] {
  const args = [...baseArgs];
  
  // Add POT provider for YouTube bot bypass
  if (process.env.POT_PROVIDER_URL) {
    console.log('[ytdlp] Using POT provider at:', POT_PROVIDER_URL);
    args.push('--extractor-args', `youtube:po_token_url=${POT_PROVIDER_URL}/token`);
  } else {
    console.log('[ytdlp] No POT provider configured, using client rotation');
    args.push('--extractor-args', 'youtube:player_client=android,web');
  }
  
  args.push('--no-check-certificates');
  return args;
}

// yt-dlp pipes to ffmpeg, ffmpeg spits opus for discord
export function createYtdlpStream(url: string): Readable {
  console.log('[ytdlp-pipe] Using fallback pipe method for:', url);
  
  const baseArgs = ['-f', 'bestaudio', '-o', '-', url];
  const args = buildYtdlpArgs(baseArgs);
  
  console.log('[ytdlp-pipe] Args:', args.join(' '));
  const ytdlp = spawn('yt-dlp', args);

  ytdlp.stderr.on('data', (data) => {
    console.error('[ytdlp-pipe] Error:', data.toString());
  });

  const ffmpegPath = process.env.FFMPEG_HTTPS_PATH || 'ffmpeg';
  console.log('[ffmpeg-pipe] Using FFmpeg path:', ffmpegPath);
  const ffmpeg = spawn(ffmpegPath, [
    '-i', 'pipe:0',
    '-analyzeduration', '0',
    '-loglevel', '0',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1',
  ]);

  ffmpeg.stderr.on('data', (data) => {
    console.error('[ffmpeg-pipe] Error:', data.toString());
  });

  ytdlp.stdout.pipe(ffmpeg.stdin);
  return ffmpeg.stdout;
}

// streams from direct url using https ffmpeg (fast af)
export async function createStreamFromUrl(directUrl: string): Promise<Readable> {
  const ffmpegPath = process.env.FFMPEG_HTTPS_PATH || 'ffmpeg';
  console.log('[ffmpeg] Using FFmpeg path:', ffmpegPath);
  console.log('[ffmpeg] Streaming from direct URL');
  
  const ffmpeg = spawn(ffmpegPath, [
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-i', directUrl,
    '-analyzeduration', '0',
    '-loglevel', '0',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1',
  ]);

  ffmpeg.stderr.on('data', (data) => {
    console.error('[ffmpeg] Error:', data.toString());
  });

  ffmpeg.on('error', (err) => {
    console.error('[ffmpeg] Process error:', err);
  });

  return ffmpeg.stdout;
}

// grabs direct url for fast streaming (cached for 5h, non-blocking)
export async function getDirectOpusUrl(url: string): Promise<string | null> {
  console.log('[ytdlp] Getting direct URL for:', url);
  const videoId = extractVideoId(url);
  
  if (videoId && urlCache.has(videoId)) {
    const cached = urlCache.get(videoId)!;
    if (Date.now() < cached.expires) {
      console.log('[ytdlp] Using cached URL for:', videoId);
      return cached.url;
    }
    console.log('[ytdlp] Cache expired for:', videoId);
    urlCache.delete(videoId);
  }

  console.log('[ytdlp] Extracting fresh URL...');
  return new Promise((resolve) => {
    const baseArgs = ['--get-url', '-f', 'bestaudio', url];
    const args = buildYtdlpArgs(baseArgs);
    
    console.log('[ytdlp] Running with args:', args.join(' '));
    const ytdlp = spawn('yt-dlp', args);

    let output = '';
    let errorOutput = '';

    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code === 0 && output.trim()) {
        const directUrl = output.trim();
        console.log('[ytdlp] Successfully extracted URL');
        if (videoId) {
          urlCache.set(videoId, {
            url: directUrl,
            expires: Date.now() + (5 * 60 * 60 * 1000), // 5 hours
            clientType: 'web'
          });
          console.log('[ytdlp] Cached URL for:', videoId);
        }
        resolve(directUrl);
      } else {
        console.error('[ytdlp] Failed to extract URL. Exit code:', code);
        if (errorOutput) console.error('[ytdlp] Error:', errorOutput);
        resolve(null);
      }
    });

    ytdlp.on('error', (err) => {
      console.error('[ytdlp] Process error:', err);
      resolve(null);
    });
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
    const searchQuery = isUrl ? query : `ytsearch1:${query}`;
    
    const baseArgs = ['--dump-json', '--no-playlist', '--skip-download', searchQuery];
    const args = buildYtdlpArgs(baseArgs);

    console.log('[ytdlp-info] Running:', args.join(' '));
    const ytdlp = spawn('yt-dlp', args);
    let data = '';
    let errorData = '';

    ytdlp.stdout.on('data', (chunk) => data += chunk);
    ytdlp.stderr.on('data', (chunk) => errorData += chunk);

    ytdlp.on('close', (code) => {
      if (code === 0 && data) {
        try {
          const info = JSON.parse(data);
          console.log('[ytdlp-info] Successfully got info for:', info.title);
          resolve({
            title: info.title || 'Unknown',
            duration: info.duration || 0,
            url: info.webpage_url || info.url || query,
            thumbnail: info.thumbnail || '',
            uploader: info.uploader || 'Unknown'
          });
        } catch (err) {
          console.error('[ytdlp-info] Failed to parse JSON:', err);
          reject(new Error('Failed to parse video info'));
        }
      } else {
        console.error('[ytdlp-info] Failed. Exit code:', code);
        console.error('[ytdlp-info] Error:', errorData);
        reject(new Error(`yt-dlp failed: ${errorData || 'Unknown error'}`));
      }
    });

    ytdlp.on('error', (err) => {
      console.error('[ytdlp-info] Spawn error:', err);
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });
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
