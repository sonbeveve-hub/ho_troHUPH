import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { getSummary, getTimeseries } from '../services/stats.service.js';

export const adminStatsRouter = Router();
adminStatsRouter.use(requireAdmin);

adminStatsRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    res.json(getSummary());
  })
);

adminStatsRouter.get(
  '/timeseries',
  asyncHandler(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    res.json(getTimeseries(days));
  })
);
