import { Router } from 'express';
import authRoutes from './auth.routes';
import lessonRoutes from './lesson.routes';
import philosopherRoutes from './philosopher.routes';
import quizRoutes from './quiz.routes';
import gachaRoutes from './gacha.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/lessons', lessonRoutes);
router.use('/philosophers', philosopherRoutes);
router.use('/quizzes', quizRoutes);
router.use('/gacha', gachaRoutes);
router.use('/users', userRoutes);

export default router;