import { Router } from 'express';
import * as teamController from '../controllers/teams.js';

const router = Router();

router.get('/', teamController.listTeams);
router.get('/:id', teamController.getTeam);

export default router;
