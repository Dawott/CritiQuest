import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import EnhancedLessonService from '../services/lesson.service';
import { getErrorMessage } from '../../../shared/utils/error.utils';

// Schemy dla requestów
const QuerySchema = z.object({
  stage: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  includeCompleted: z.string().transform(val => val === 'true').optional(),
  limit: z.string().transform(val => parseInt(val)).optional(),
  offset: z.string().transform(val => parseInt(val)).optional(),
});

const CompletionSchema = z.object({
  score: z.number().min(0).max(100),
  timeSpent: z.number().min(0),
  notes: z.string().optional(),
});

export class EnhancedLessonController {
  private lessonService = EnhancedLessonService;

  // Pobierz lekcję z filtrowaniem
  getLessons = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const queryParams = QuerySchema.safeParse(req.query);
      
      if (!queryParams.success) {
        res.status(400).json({
          success: false,
          error: 'Błędne parametry query',
          details: queryParams.error.errors,
        });
        return;
      }

      const { stage, difficulty, includeCompleted, limit, offset } = queryParams.data;
      
      const result = await this.lessonService.getLessons(
        req.userId!,
        { stage, difficulty, includeCompleted },
        { limit, offset }
      );
      
      res.json({
        success: true,
        data: result.lessons,
        pagination: {
          total: result.total,
          hasMore: result.hasMore,
          limit: limit || 20,
          offset: offset || 0,
        },
        userProgress: result.userProgress,
      });
    } catch (error) {
      console.error('Błąd pobrania lekcji:', error);
      res.status(500).json({
        success: false,
        error: 'Nie udało się pobrać lekcji',
        message: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined,
      });
    }
  };

  // Pobierz jedną lekcję
  getLesson = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { lessonId } = req.params;
      
      if (!lessonId) {
        res.status(400).json({
          success: false,
          error: 'LessonID jest wymagane',
        });
        return;
      }
      
      const lesson = await this.lessonService.getLesson(lessonId, req.userId);
      
      if (!lesson) {
        res.status(404).json({
          success: false,
          error: 'Lekcja nieodnaleziona',
        });
        return;
      }
      
      res.json({
        success: true,
        data: lesson,
      });
    } catch (error) {
      console.error('Błąd pobrania lekcji:', error);
      res.status(500).json({
        success: false,
        error: 'Nie udało się pobrać lekcji',
        message: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined,
      });
    }
  };

  // Zakończ lekcję
  completeLesson = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { lessonId } = req.params;
      
      // walidacja request body
      const validationResult = CompletionSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Błędne dane zakończenia',
          details: validationResult.error.errors,
        });
        return;
      }
      
      const result = await this.lessonService.completeLesson(
        req.userId!,
        lessonId,
        validationResult.data
      );
      
      res.json({
        success: true,
        message: 'Lekcja zakończona z sukcesem',
        data: {
          experienceGained: result.experienceGained,
          rewards: result.rewards,
          ...(result.levelUp && { levelUp: result.levelUp }),
        },
      });
    } catch (error) {
      console.error('Błąd zakończenia lekcji:', error);
      
      if (getErrorMessage(error).includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Lekcja nieodnaleziona',
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Nie udało się zakończyć lekcji',
        message: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined,
      });
    }
  };

  // Pobierz rekomendacje
  getRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const recommendations = await this.lessonService.getRecommendations(req.userId!);
      
      res.json({
        success: true,
        data: recommendations,
        count: recommendations.length,
      });
    } catch (error) {
      console.error('Błąd pobierania rekomendacji:', error);
      res.status(500).json({
        success: false,
        error: 'Błąd pobierania rekomendacji',
        message: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined,
      });
    }
  };

  // Pobierz lekcję featured
  getFeaturedLessons = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const limitParam = req.query.limit as string;
      const limit = limitParam ? parseInt(limitParam) : 10;
      
      if (isNaN(limit) || limit < 1 || limit > 50) {
        res.status(400).json({
          success: false,
          error: 'Limit musi być między 1 i 50',
        });
        return;
      }
      
      const lessons = await this.lessonService.getFeaturedLessons(limit);
      
      res.json({
        success: true,
        data: lessons,
        count: lessons.length,
      });
    } catch (error) {
      console.error('Pobierz lekcję error:', error);
      res.status(500).json({
        success: false,
        error: 'Nie udało się pobrać featured',
        message: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined,
      });
    }
  };

  // Pobierz analitykę
  getLessonAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { lessonId } = req.params;
      
      const analytics = await this.lessonService.getLessonAnalytics(lessonId);
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Get lesson analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get lesson analytics',
        message: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined,
      });
    }
  };

  // Utwórz lekcję
  createLesson = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Pozwolenia admina
      if (!req.user?.admin) {
        res.status(403).json({
          success: false,
          error: 'Niedostateczne dostępy',
        });
        return;
      }
      
      const lessonId = await this.lessonService.createLesson(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Lekcja zakończona z sukcesem',
        data: { lessonId },
      });
    } catch (error) {
      console.error('Błąd utworzenia lekcji:', error);
      res.status(500).json({
        success: false,
        error: 'Błąd utworzenia lekcji',
        message: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined,
      });
    }
  };

  // Health check
  healthCheck = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        message: 'Zdrowe!',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Niezdrowe!',
      });
    }
  };
}

export default new EnhancedLessonController();