import { Router } from 'express';
import * as settingsController from '../controllers/settings.js';

const router = Router();

router.get('/general', settingsController.getGeneralSettings);
router.get('/smtp', settingsController.getSmtpSettings);

export default router;
