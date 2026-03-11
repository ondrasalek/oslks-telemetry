import { Router } from 'express';
import * as websiteController from '../controllers/websites.js';

const router = Router();

router.get('/all', websiteController.listAllWebsites);
router.get('/', websiteController.listWebsites);
router.post('/', websiteController.createWebsite);
router.get('/:id', websiteController.getWebsite);

export default router;
