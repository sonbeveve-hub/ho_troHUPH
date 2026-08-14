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
  confirmation: {
    // Số ngày kể từ khi IT đánh dấu "đã xử lý" mà người gửi chưa xác nhận thì gửi nhắc nhở,
    // và tổng số ngày (kể từ cùng mốc) trước khi hệ thống tự động đóng nếu vẫn im lặng.
    reminderDays: Number(process.env.CONFIRM_REMINDER_DAYS) || 2,
    timeoutDays: Number(process.env.CONFIRM_TIMEOUT_DAYS) || 5,
    sweepIntervalMinutes: Number(process.env.CONFIRM_SWEEP_INTERVAL_MINUTES) || 60,
    // Số ngày kể từ lần cập nhật gần nhất mà yêu cầu vẫn "Đang xử lý" (chưa chuyển sang
    // chờ xác nhận hay trạng thái khác) thì nhắc người phụ trách — nhắc 1 lần duy nhất.
    inprogressStaleDays: Number(process.env.INPROGRESS_STALE_DAYS) || 3,
  },
};

export const isSmtpConfigured = () =>
  Boolean(env.smtp.host && env.smtp.port && env.smtp.user && env.smtp.pass && env.smtp.from);

export const isGeminiConfigured = () => Boolean(env.gemini.apiKey);
