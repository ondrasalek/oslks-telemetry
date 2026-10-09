import { Router } from 'express';
import * as installController from '../controllers/install.js';

const router = Router();

router.get('/check', installController.checkInstall);
router.post('/setup', installController.setupInstall);

export default router;
