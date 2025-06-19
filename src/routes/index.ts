import { Router } from 'express';
import authRoutes from './auth.routes.ts';
import lessonRoutes from './lesson.routes';
import philosopherRoutes from './philosopher.routes.ts';
import quizRoutes from './quiz.routes.ts';
import gachaRoutes from './gacha.routes.ts';
import userRoutes from './user.routes.ts';

const router = Router();

router.use('/auth', authRoutes);
router.use('/lessons', lessonRoutes);
router.use('/philosophers', philosopherRoutes);
router.use('/quizzes', quizRoutes);
router.use('/gacha', gachaRoutes);
router.use('/users', userRoutes);

export default router;