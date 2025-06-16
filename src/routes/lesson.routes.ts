import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest, generalRateLimit, checkFirebaseConnection } from '../middleware/middleware';
import EnhancedLessonController from '../controllers/lesson.controllers';

const router = Router();
const lessonController = EnhancedLessonController;

const LessonQuerySchema = z.object({
  query: z.object({
    stage: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    includeCompleted: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  }).optional(),
});

const LessonParamsSchema = z.object({
  params: z.object({
    lessonId: z.string().min(1),
  }),
});

const LessonCompletionSchema = z.object({
  body: z.object({
    score: z.number().min(0).max(100),
    timeSpent: z.number().min(0),
    notes: z.string().optional(),
  }),
  params: z.object({
    lessonId: z.string().min(1),
  }),
});

router.use(generalRateLimit.middleware);
router.use(checkFirebaseConnection);

// Publiczne
router.get('/featured', lessonController.getFeaturedLessons);
router.get('/health', lessonController.healthCheck);

// Uwierzytelnione
router.use(authenticate);

router.get('/', validateRequest(LessonQuerySchema),
  lessonController.getLessons);
router.get('/recommendations', lessonController.getRecommendations);
router.get('/:lessonId', validateRequest(LessonParamsSchema),
  lessonController.getLesson);
router.post('/:lessonId/complete', validateRequest(LessonCompletionSchema),
  lessonController.completeLesson);
router.get('/:lessonId/analytics', validateRequest(LessonParamsSchema),
  lessonController.getLessonAnalytics);

// Adminowe
router.post('/', lessonController.createLesson);
//router.put('/:lessonId', lessonController.updateLesson);

export default router;