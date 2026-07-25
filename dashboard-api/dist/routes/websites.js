import { Router } from 'express';
import * as websiteController from '../controllers/websites.js';
import { enforceApiKeyTeamScope } from '../middleware/apiKeyAuth.js';
const router = Router();
router.get('/all', websiteController.listAllWebsites);
router.get('/team/:team_id', enforceApiKeyTeamScope, websiteController.listTeamWebsites);
router.get('/', websiteController.listWebsites);
router.post('/', websiteController.createWebsite);
router.get('/:id', enforceApiKeyTeamScope, websiteController.getWebsite);
export default router;
//# sourceMappingURL=websites.js.map