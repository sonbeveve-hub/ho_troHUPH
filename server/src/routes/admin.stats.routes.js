import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  getSummary,
  getTimeseries,
  getByAssignee,
  getAiStats,
  getConfirmationStats,
  buildStatsWorkbook,
} from '../services/stats.service.js';

export const adminStatsRouter = Router();
adminStatsRouter.use(requireAdmin);

adminStatsRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    res.json(await getSummary());
  })
);

adminStatsRouter.get(
  '/by-assignee',
  asyncHandler(async (req, res) => {
    res.json(await getByAssignee());
  })
);

adminStatsRouter.get(
  '/ai',
  asyncHandler(async (req, res) => {
    res.json(await getAiStats());
  })
);

adminStatsRouter.get(
  '/confirmation',
  asyncHandler(async (req, res) => {
    res.json(await getConfirmationStats());
  })
);

adminStatsRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    const buffer = await buildStatsWorkbook();
    const filename = `bao-cao-ho-tro-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  })
);

adminStatsRouter.get(
  '/timeseries',
  asyncHandler(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    res.json(await getTimeseries(days));
  })
);
