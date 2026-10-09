import { Router } from 'express';
import * as websiteController from '../controllers/websites.js';
import { enforceApiKeyTeamScope } from '../middleware/apiKeyAuth.js';

const router = Router();

router.get('/all', websiteController.listAllWebsites);
router.get('/shared/:share_id', websiteController.getSharedWebsite);
router.get(
    '/team/:team_id',
    enforceApiKeyTeamScope,
    websiteController.listTeamWebsites,
);
router.get('/', websiteController.listWebsites);
router.post('/', websiteController.createWebsite);
router.get('/:id', enforceApiKeyTeamScope, websiteController.getWebsite);
router.put('/:id', websiteController.updateWebsite);
router.delete('/:id', websiteController.deleteWebsite);
router.delete('/:id/data', websiteController.resetWebsiteData);
router.post('/:id/toggle-pin', websiteController.togglePinWebsite);
router.put('/:id/share', websiteController.updateWebsiteShare);
router.post('/:id/transfer', websiteController.transferWebsite);

export default router;
