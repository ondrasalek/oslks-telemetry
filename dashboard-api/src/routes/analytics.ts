import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.js';

const router = Router();

router.get('/:website_id/stats', analyticsController.getStats);
router.get('/:website_id/metrics', analyticsController.getMetrics);
router.get('/:website_id/chart', analyticsController.getChartData);
router.get('/:website_id/active', analyticsController.getActiveVisitors);

export default router;
