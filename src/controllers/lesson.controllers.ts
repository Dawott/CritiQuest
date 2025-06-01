import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { LessonService } from '../services/lesson.service';
import { validationResult } from 'express-validator';

export class LessonController {
  private lessonService = new LessonService();

  getLessons = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { stage, includeExternal } = req.query;
      
      const lessons = await this.lessonService.getLessons(req.userId!, {
        stage: stage as string,
        includeExternal: includeExternal === 'true',
      });
      
      res.json({
        success: true,
        data: lessons,
        count: lessons.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Nie udało sie pobrać lekcji',
      });
    }
  };

  getLesson = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { lessonId } = req.params;
      
      const lesson = await this.lessonService.getLesson(lessonId);
      
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
      res.status(500).json({
        success: false,
        error: 'Nie udało się pobrać lekcji',
      });
    }
  };

  completeLesson = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }
      
      const { lessonId } = req.params;
      const { score, timeSpent, notes } = req.body;
      
      await this.lessonService.completeLesson(req.userId!, lessonId, {
        score,
        timeSpent,
        notes,
      });
      
      res.json({
        success: true,
        message: 'Lekcja zakończona z powodzeniem',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Nie udało się ukończyć lekcji',
      });
    }
  };

  getRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const recommendations = await this.lessonService.getRecommendations(req.userId!);
      
      res.json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Nie udało się pobrać rekomendacji',
      });
    }
  };

  getFeaturedLessons = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      //Endpoint publiczny
      const lessons = await this.lessonService.getFeaturedLessons();
      
      res.json({
        success: true,
        data: lessons,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Nie udało się pobrać lekcji',
      });
    }
  };

  getLessonAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { lessonId } = req.params;
      
      const analytics = await this.lessonService.getLessonAnalytics(lessonId);
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics',
      });
    }
  };

  createLesson = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Sprawdzanie admina
      if (!req.user?.admin) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }
      
      const lessonId = await this.lessonService.createLesson(req.body);
      
      res.status(201).json({
        success: true,
        data: { lessonId },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Nie udało się utworzyć',
      });
    }
  };

  updateLesson = async (req: AuthRequest, res: Response): Promise<void> => {
    // TBD
  };
}
