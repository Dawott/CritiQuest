import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { LessonController } from 'src/controllers/lesson.controllers';

const router = Router();
const lessonController = new LessonController();

// Publiczne
router.get('/featured', lessonController.getFeaturedLessons);

// Uwierzytelnione
router.use(authenticate);

router.get('/', lessonController.getLessons);
router.get('/recommendations', lessonController.getRecommendations);
router.get('/:lessonId', lessonController.getLesson);
router.post('/:lessonId/complete', lessonController.completeLesson);
router.get('/:lessonId/analytics', lessonController.getLessonAnalytics);

// Adminowe
router.post('/', lessonController.createLesson);
router.put('/:lessonId', lessonController.updateLesson);

export default router;