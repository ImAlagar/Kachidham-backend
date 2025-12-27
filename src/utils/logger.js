import winston from 'winston';
import 'winston-daily-rotate-file';
import { NODE_ENV, LOG_LEVEL } from '../config/index.js';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Development format (pretty print)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Create the logger
const logger = winston.createLogger({
  level: LOG_LEVEL || 'info',
  levels,
  format: NODE_ENV === 'production' ? format : devFormat,
  defaultMeta: { service: 'velan-ecommerce' },
  transports: [
    // Write all logs with importance level of 'error' or less to 'error.log'
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),

    // Write all logs with importance level of 'info' and below to 'combined.log'
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

// If not in production, also log to console
if (NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: devFormat,
    })
  );
} else {
  // In production, add console transport with JSON format
  logger.add(
    new winston.transports.Console({
      format: format,
    })
  );
}

// Create a stream object for Morgan (HTTP logging)
export const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

export default logger;