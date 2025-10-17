import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../src/config/logger.js';

const execAsync = promisify(exec);

async function checkFFmpeg(): Promise<void> {
  try {
    const { stdout } = await execAsync('ffmpeg -version');
    const version = stdout.split('\n')[0];
    logger.info(`FFmpeg found: ${version}`);
  } catch (error) {
    logger.error('FFmpeg not found! Please install FFmpeg.');
    logger.info('Installation guide: https://ffmpeg.org/download.html');
    process.exit(1);
  }
}

checkFFmpeg();
