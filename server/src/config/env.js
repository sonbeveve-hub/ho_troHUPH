import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-insecure-secret',
  appUrl: (process.env.APP_URL || 'https://hotrohuph.site').replace(/\/+$/, ''),
  notifyCcEmail: process.env.NOTIFY_CC_EMAIL || '',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 0,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  },
};

export const isSmtpConfigured = () =>
  Boolean(env.smtp.host && env.smtp.port && env.smtp.user && env.smtp.pass && env.smtp.from);

export const isGeminiConfigured = () => Boolean(env.gemini.apiKey);
