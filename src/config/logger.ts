enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
} as const;

class Logger {
  private currentLogLevel: LogLevel;

  constructor() {
    const envLogLevel = process.env.LOG_LEVEL?.toLowerCase() || 'info';
    this.currentLogLevel = LogLevel[envLogLevel.toUpperCase() as keyof typeof LogLevel] ?? LogLevel.INFO;
  }

  private log(level: LogLevel, levelName: string, message: string, ...args: unknown[]): void {
    if (level < this.currentLogLevel) return;

    const timestamp = new Date().toISOString();
    const color = this.getColorForLevel(level);
    const prefix = `${colors.cyan}[${timestamp}]${colors.reset} ${color}[${levelName}]${colors.reset}`;
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, message, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, ...args);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, message, ...args);
        break;
      default:
        console.log(prefix, message, ...args);
    }
  }

  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return colors.red + colors.bright;
      case LogLevel.WARN: return colors.yellow + colors.bright;
      case LogLevel.DEBUG: return colors.blue;
      default: return colors.white;
    }
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, 'INFO', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, 'WARN', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, 'ERROR', message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, ...args);
  }

  // Helper for error objects
  logError(message: string, error: Error | unknown): void {
    if (error instanceof Error) {
      this.error(message, { name: error.name, message: error.message, stack: error.stack });
    } else {
      this.error(message, error);
    }
  }
}

export const logger = new Logger();
