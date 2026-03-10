import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.js';

const router = Router();

router.get('/:website_id/stats', analyticsController.getStats);
router.get('/:website_id/metrics', analyticsController.getMetrics);
router.get('/:website_id/chart', analyticsController.getChartData);
router.get('/:website_id/active', analyticsController.getActiveVisitors);

// Team stats
router.get('/team/:team_id/stats', analyticsController.getTeamStats);

// Shared analytics
router.get('/shared/:share_id/stats', analyticsController.getSharedStats);
router.get('/shared/:share_id/metrics', analyticsController.getSharedMetrics);
router.get('/shared/:share_id/chart', analyticsController.getSharedChartData);
router.get(
    '/shared/:share_id/active',
    analyticsController.getSharedActiveVisitors,
);

export default router;
