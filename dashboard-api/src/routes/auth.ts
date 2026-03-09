import { Router } from 'express';
import * as authController from '../controllers/auth.js';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);
router.get('/me', authController.me);

export default router;
