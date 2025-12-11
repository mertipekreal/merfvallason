/**
 * Logger Utility
 * Simple logging system with different levels
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  service?: string;
}

class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'DuyguMotor') {
    this.serviceName = serviceName;
  }

  private formatLog(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      service: this.serviceName,
    };
  }

  private output(entry: LogEntry): void {
    const { timestamp, level, message, data, service } = entry;
    const prefix = `[${timestamp}] [${service}] [${level}]`;
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, message, data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, message, data || '');
        break;
      case LogLevel.DEBUG:
        if (process.env.NODE_ENV === 'development') {
          console.debug(prefix, message, data || '');
        }
        break;
    }
  }

  debug(message: string, data?: any): void {
    this.output(this.formatLog(LogLevel.DEBUG, message, data));
  }

  info(message: string, data?: any): void {
    this.output(this.formatLog(LogLevel.INFO, message, data));
  }

  warn(message: string, data?: any): void {
    this.output(this.formatLog(LogLevel.WARN, message, data));
  }

  error(message: string, error?: any): void {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    this.output(this.formatLog(LogLevel.ERROR, message, errorData));
  }

  // Service-specific logger factory
  static create(serviceName: string): Logger {
    return new Logger(serviceName);
  }
}

// Default logger instance
export const logger = new Logger();

// Export Logger class for service-specific loggers
export default Logger;

