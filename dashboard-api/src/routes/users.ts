import { Router } from 'express';
import * as usersController from '../controllers/users.js';

const router = Router();

router.get('/', usersController.listUsers);
router.post('/', usersController.createUser);
router.get('/:id', usersController.getUser);
router.put('/:id/profile', usersController.updateProfile);
router.put('/:id', usersController.updateUser);
router.post('/:id/reset-password', usersController.resetPassword);
router.delete('/:id', usersController.deleteUser);

export default router;
