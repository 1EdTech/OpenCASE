import pino from 'pino';

export const logger = pino({
  name: 'case-provider',
  level: process.env.LOG_LEVEL ?? 'info'
});

