import { Router } from 'express';
import * as apiKeyController from '../controllers/apiKeys.js';
import { sessionOnly } from '../middleware/apiKeyAuth.js';
const router = Router();
// Key management is session-only: an API key must never be able to mint,
// list or revoke keys.
router.use(sessionOnly);
router.get('/', apiKeyController.listApiKeys);
router.post('/', apiKeyController.createApiKey);
router.delete('/:id', apiKeyController.revokeApiKey);
export default router;
//# sourceMappingURL=api-keys.js.map