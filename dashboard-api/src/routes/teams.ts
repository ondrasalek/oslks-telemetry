import { Router } from 'express';
import * as teamController from '../controllers/teams.js';

const router = Router();

router.get('/all', teamController.listAllTeams);
router.get('/', teamController.listTeams);
router.get('/:id', teamController.getTeam);
router.get('/:id/members', teamController.getTeamMembers);
router.get('/:id/websites', teamController.getTeamWebsites);

export default router;
