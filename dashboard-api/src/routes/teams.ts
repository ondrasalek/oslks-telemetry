import { Router } from 'express';
import * as teamController from '../controllers/teams.js';

const router = Router();

router.get('/all', teamController.listAllTeams);
router.get('/', teamController.listTeams);
router.post('/', teamController.createTeam);

// Invitations (literal paths must precede '/:id')
router.get('/invites/:token', teamController.getInvite);
router.post('/invites/:token/accept', teamController.acceptInvite);

router.get('/:id', teamController.getTeam);
router.put('/:id', teamController.updateTeam);
router.delete('/:id', teamController.deleteTeam);
router.post('/:id/switch', teamController.switchTeam);
router.get('/:id/members', teamController.getTeamMembers);
router.post('/:id/members', teamController.addTeamMember);
router.post('/:id/transfer', teamController.transferTeamOwnership);
router.post('/:id/invites', teamController.createInvite);
router.get('/:id/websites', teamController.getTeamWebsites);

export default router;
