import { Router } from 'express';
import * as usersController from '../controllers/users.js';

const router = Router();

router.get('/', usersController.listUsers);
router.get('/:id', usersController.getUser);

export default router;
