import { Router } from 'express';
import * as settingsController from '../controllers/settings.js';

const router = Router();

router.get('/general', settingsController.getGeneralSettings);
router.post('/general', settingsController.saveGeneralSettings);
router.get('/smtp', settingsController.getSmtpSettings);
router.post('/smtp', settingsController.saveSmtpSettings);
router.post('/test-email', settingsController.sendTestEmail);

export default router;
