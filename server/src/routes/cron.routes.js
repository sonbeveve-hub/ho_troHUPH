import { Router } from 'express';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  runConfirmationSweep,
  runInProgressStaleSweep,
} from '../services/confirmationTimeout.service.js';
import { runFaqCandidateSweep } from '../services/faqCandidate.service.js';
import { runMonthlyReportSweep } from '../services/monthlyReport.service.js';
import { pool } from '../db/index.js';

// Thay cho các setInterval trong server/src/index.js khi chạy trên Vercel (serverless không có
// tiến trình chạy liên tục). Vercel Cron gọi GET /api/cron/daily kèm header
// "Authorization: Bearer <CRON_SECRET>" — xem "crons" trong vercel.json.
export const cronRouter = Router();

const jobs = [
  ['confirmation-sweep', runConfirmationSweep],
  ['inprogress-stale-sweep', runInProgressStaleSweep],
  ['faq-candidate-sweep', runFaqCandidateSweep],
  ['monthly-report', runMonthlyReportSweep],
  // connect-pg-simple tự dọn phiên hết hạn bằng setInterval — không chạy được trên serverless.
  ['prune-sessions', () => pool.query('DELETE FROM session WHERE expire < now()')],
];

cronRouter.get(
  '/daily',
  asyncHandler(async (req, res) => {
    if (!env.cronSecret || req.get('authorization') !== `Bearer ${env.cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Chạy tuần tự, job lỗi không chặn job sau.
    const results = {};
    for (const [name, run] of jobs) {
      try {
        await run();
        results[name] = 'ok';
      } catch (err) {
        console.error(`[cron] Lỗi ở ${name}:`, err);
        results[name] = `error: ${err.message}`;
      }
    }
    res.json(results);
  })
);
