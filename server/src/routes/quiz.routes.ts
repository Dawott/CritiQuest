import { Router, Request, Response } from 'express';
import { z } from 'zod';
import admin from 'firebase-admin';
import { validateRequest, generalRateLimit, strictRateLimit, checkFirebaseConnection } from '../middleware/middleware';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler, AppError, ErrorType } from '../middleware/error.middleware';
import {EnhancedDatabaseService } from '../../../client/src/services/firebase/database.service';
import { QuizDatabaseService } from '../../../client/src/services/firebase/quiz-database.service';
import { QuizSchema, QuestionSchema } from '../../../shared/utils/schemas';
import { DB_PATHS } from '../../../server/src/config/firebase.config';
import { getErrorMessage } from '../../../shared/utils/error.utils';

const router = Router();
const dbService = new EnhancedDatabaseService();
const quizDbService = new QuizDatabaseService();

// Validation Schemas
const QuizQuerySchema = z.object({
  query: z.object({
    lessonId: z.string().optional(),
    type: z.enum(['multiple-choice', 'scenario', 'debate']).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  }).optional(),
});

const QuizParamsSchema = z.object({
  params: z.object({
    quizId: z.string().min(1),
  }),
});

const QuizSubmissionSchema = z.object({
  body: z.object({
    score: z.number().min(0).max(100),
    timeSpent: z.number().min(10).max(7200), // 10 seconds to 2 hours
    answers: z.record(z.string(), z.array(z.string())),
    debateResults: z.record(z.string(), z.object({
      winner: z.enum(['user', 'opponent', 'draw']),
      rounds: z.array(z.object({
        userArgument: z.string(),
        opponentArgument: z.string(),
        roundWinner: z.enum(['user', 'opponent', 'draw']),
        convincingScore: z.number().min(0).max(100),
      })),
      finalScore: z.number().min(0).max(100),
    })).optional(),
    hintsUsed: z.number().min(0).default(0),
    philosopherBonus: z.object({
      philosopherId: z.string(),
      multiplier: z.number().min(1).max(2),
    }).optional(),
    scenarioPath: z.array(z.string()).optional(),
    metadata: z.object({
      deviceType: z.enum(['android', 'ios', 'web']),
      appVersion: z.string(),
      ip: z.string().optional(),
    }),
  }),
  params: z.object({
    quizId: z.string().min(1),
  }),
});

const QuizHistoryQuerySchema = z.object({
  query: z.object({
    limit: z.string().optional(),
    lessonId: z.string().optional(),
    passed: z.enum(['true', 'false']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).optional(),
});

const CreateQuizSchema = z.object({
  body: QuizSchema,
});

const UpdateQuizSchema = z.object({
  body: QuizSchema.partial(),
  params: z.object({
    quizId: z.string().min(1),
  }),
});

// Apply middleware
router.use(generalRateLimit.middleware);
router.use(checkFirebaseConnection);

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'Quiz service is running',
    timestamp: Date.now(),
    availableEndpoints: [
      'GET /quizzes',
      'GET /quizzes/:id',
      'POST /quizzes/:id/submit',
      'GET /quizzes/history',
      'GET /quizzes/:id/analytics',
      'POST /quizzes/:id/retry'
    ]
  });
});

// Get all quizzes with filtering (public endpoint)
router.get('/',
  validateRequest(QuizQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { lessonId, type, difficulty, limit = '20', offset = '0' } = req.query as any;

    try {
      // Get all quizzes from database
      const allQuizzes = await admin.database().ref(DB_PATHS.QUIZZES).once('value');
      const quizzesData = allQuizzes.val() || {};

      let quizzesArray = Object.entries(quizzesData).map(([id, quiz]) => ({
        id,
        ...quiz as any
      }));

      // Apply filters
      if (lessonId) {
        quizzesArray = quizzesArray.filter(q => q.lessonId === lessonId);
      }

      if (type) {
        quizzesArray = quizzesArray.filter(q => q.type === type);
      }

      if (difficulty) {
        // Filter based on associated lesson difficulty if available
        quizzesArray = quizzesArray.filter(async (q) => {
          if (q.lessonId) {
            const lesson = await dbService.read(`${DB_PATHS.LESSONS}/${q.lessonId}`) as any;
            return lesson?.difficulty === difficulty;
          }
          return true;
        });
      }

      // Sort by creation time or lesson order
      quizzesArray.sort((a, b) => (a.order || 0) - (b.order || 0));

      // Apply pagination
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);
      const paginatedQuizzes = quizzesArray.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        data: paginatedQuizzes,
        pagination: {
          total: quizzesArray.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < quizzesArray.length
        },
        filters: {
          types: ['multiple-choice', 'scenario', 'debate'],
          difficulties: ['beginner', 'intermediate', 'advanced']
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania quizów', 500, ErrorType.INTERNAL);
    }
  })
);

// Get single quiz (public endpoint)
router.get('/:quizId',
  validateRequest(QuizParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { quizId } = req.params;

    try {
      const quiz = await admin.database().ref(`${DB_PATHS.QUIZZES}/${quizId}`).once('value');
      const quizData = quiz.val();
      
      if (!quizData) {
        throw new AppError('Quiz nie został znaleziony', 404, ErrorType.NOT_FOUND);
      }

      res.json({
        success: true,
        data: {
          id: quizId,
          ...quizData
        }
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Błąd podczas pobierania quizu', 500, ErrorType.INTERNAL);
    }
  })
);

// Submit quiz results (authenticated endpoint with strict rate limiting)
router.post('/:quizId/submit',
  authenticate,
  strictRateLimit.middleware, // Prevent spam submissions
  validateRequest(QuizSubmissionSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { quizId } = req.params;
    const submissionData = req.body;

    try {
      // Check if quiz exists
      const quiz = await admin.database().ref(`${DB_PATHS.QUIZZES}/${quizId}`).once('value');
      if (!quiz.exists()) {
        throw new AppError('Quiz nie został znaleziony', 404, ErrorType.NOT_FOUND);
      }

      // Prepare quiz submission
      const submission = {
        quizId,
        lessonId: quiz.val().lessonId,
        userId,
        score: submissionData.score,
        timeSpent: submissionData.timeSpent,
        answers: submissionData.answers,
        debateResults: submissionData.debateResults,
        hintsUsed: submissionData.hintsUsed,
        philosopherBonus: submissionData.philosopherBonus,
        scenarioPath: submissionData.scenarioPath,
        metadata: {
          ...submissionData.metadata,
          submittedAt: Date.now(),
          ip: req.ip || 'unknown'
        }
      };

      // Submit and process quiz result
      const result = await quizDbService.submitCompleteQuizResult(submission);

      res.json({
        success: true,
        message: result.passed 
          ? `Gratulacje! Zdobyłeś ${result.score} punktów i przeszedłeś quiz!`
          : `Zdobyłeś ${result.score} punktów. Minimum do zaliczenia to ${quiz.val().passingScore} punktów.`,
        data: {
          resultId: result.id,
          score: result.score,
          passed: result.passed,
          experience: result.experience,
          tickets: result.tickets,
          newPhilosopher: result.newPhilosopher,
          insights: result.philosophicalInsights,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          recommendations: result.recommendations,
          philosophicalAlignment: result.philosophicalAlignment,
          timeSpent: result.timeSpent
        }
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      
      // Handle specific quiz submission errors
      if (getErrorMessage(error).includes('Duplicate submission')) {
        throw new AppError('Quiz został już niedawno przesłany', 429, ErrorType.RATE_LIMIT);
      }
      if (getErrorMessage(error).includes('validation')) {
        throw new AppError('Nieprawidłowe dane quizu', 400, ErrorType.VALIDATION);
      }
      
      throw new AppError('Błąd podczas przesyłania quizu', 500, ErrorType.INTERNAL);
    }
  })
);

// Get user's quiz history (authenticated)
router.get('/history/user',
  authenticate,
  validateRequest(QuizHistoryQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { limit = '10', lessonId, passed, startDate, endDate } = req.query as any;

    try {
      const options: any = {};
      
      if (lessonId) options.lessonId = lessonId;
      if (passed !== undefined) options.passed = passed === 'true';
      if (startDate) options.startDate = parseInt(startDate);
      if (endDate) options.endDate = parseInt(endDate);

      const history = await quizDbService.getUserQuizHistory(
        userId,
        parseInt(limit),
        options
      );

      // Calculate user statistics
      const stats = {
        totalAttempts: history.length,
        passedAttempts: history.filter(h => h.passed).length,
        averageScore: history.length > 0 
          ? Math.round(history.reduce((sum, h) => sum + h.score, 0) / history.length * 10) / 10
          : 0,
        totalTimeSpent: history.reduce((sum, h) => sum + h.timeSpent, 0),
        perfectScores: history.filter(h => h.score === 100).length,
        recentImprovement: history.length >= 5 
          ? history.slice(0, 5).reduce((sum, h) => sum + h.score, 0) / 5 -
            history.slice(-5).reduce((sum, h) => sum + h.score, 0) / 5
          : 0
      };

      res.json({
        success: true,
        data: history,
        stats,
        pagination: {
          total: history.length,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania historii quizów', 500, ErrorType.INTERNAL);
    }
  })
);

// Get quiz analytics (public endpoint)
router.get('/:quizId/analytics',
  validateRequest(QuizParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { quizId } = req.params;

    try {
      const analytics = await quizDbService.getQuizAnalytics(quizId);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania analityki quizu', 500, ErrorType.INTERNAL);
    }
  })
);

// Retry failed submission (authenticated)
router.post('/:quizId/retry',
  authenticate,
  strictRateLimit.middleware,
  validateRequest(QuizSubmissionSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { quizId } = req.params;
    const submissionData = req.body;

    try {
      // Prepare submission for retry
      const submission = {
        quizId,
        userId,
        score: submissionData.score,
        timeSpent: submissionData.timeSpent,
        answers: submissionData.answers,
        debateResults: submissionData.debateResults,
        hintsUsed: submissionData.hintsUsed,
        philosopherBonus: submissionData.philosopherBonus,
        scenarioPath: submissionData.scenarioPath,
        metadata: {
          ...submissionData.metadata,
          submittedAt: Date.now(),
          ip: req.ip || 'unknown'
        }
      };

      // Retry with exponential backoff
      const result = await quizDbService.retryFailedSubmission(submission, 3);

      res.json({
        success: true,
        message: 'Quiz przesłany pomyślnie po ponownej próbie',
        data: {
          resultId: result.id,
          score: result.score,
          passed: result.passed,
          experience: result.experience,
          tickets: result.tickets
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas ponownego przesyłania quizu', 500, ErrorType.INTERNAL);
    }
  })
);

// Process offline submissions (authenticated)
router.post('/offline/process',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    try {
      const processedCount = await quizDbService.processOfflineSubmissions(userId);

      res.json({
        success: true,
        message: `Przetworzono ${processedCount} quizów offline`,
        data: {
          processedSubmissions: processedCount
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas przetwarzania quizów offline', 500, ErrorType.INTERNAL);
    }
  })
);

// Get user's learning analytics (authenticated)
router.get('/analytics/user',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    try {
      // Get recent quiz history for analytics
      const recentHistory = await quizDbService.getUserQuizHistory(userId, 20);
      
      // Calculate learning analytics
      const analytics = {
        learningVelocity: calculateLearningVelocity(recentHistory),
        conceptMastery: calculateConceptMastery(recentHistory),
        difficultyReadiness: calculateDifficultyReadiness(recentHistory),
        philosophicalConsistency: calculatePhilosophicalConsistency(recentHistory),
        streakAnalysis: calculateStreakAnalysis(recentHistory),
        engagementScore: calculateEngagementScore(recentHistory),
        timeEfficiency: calculateTimeEfficiency(recentHistory),
        improvementTrend: calculateImprovementTrend(recentHistory)
      };

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania analityki uczenia się', 500, ErrorType.INTERNAL);
    }
  })
);

// Admin endpoints for quiz management
router.post('/',
  authenticate,
  validateRequest(CreateQuizSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const quizData = req.body;

    try {
      // Generate quiz ID from title
      const quizId = quizData.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      // Check if quiz already exists
      const existingQuiz = await admin.database().ref(`${DB_PATHS.QUIZZES}/${quizId}`).once('value');
      if (existingQuiz.exists()) {
        throw new AppError('Quiz o tej nazwie już istnieje', 400, ErrorType.VALIDATION);
      }

      // Create quiz
      await admin.database()
        .ref(`${DB_PATHS.QUIZZES}/${quizId}`)
        .set({
          ...quizData,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

      res.status(201).json({
        success: true,
        message: 'Quiz został utworzony pomyślnie',
        data: {
          id: quizId,
          ...quizData
        }
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Błąd podczas tworzenia quizu', 500, ErrorType.INTERNAL);
    }
  })
);

// Update quiz (admin endpoint)
router.put('/:quizId',
  authenticate,
  validateRequest(UpdateQuizSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { quizId } = req.params;
    const updates = req.body;

    try {
      // Check if quiz exists
      const existingQuiz = await admin.database().ref(`${DB_PATHS.QUIZZES}/${quizId}`).once('value');
      if (!existingQuiz.exists()) {
        throw new AppError('Quiz nie został znaleziony', 404, ErrorType.NOT_FOUND);
      }

      // Update quiz
      await admin.database()
        .ref(`${DB_PATHS.QUIZZES}/${quizId}`)
        .update({
          ...updates,
          updatedAt: Date.now()
        });

      // Get updated data
      const updatedQuiz = await admin.database().ref(`${DB_PATHS.QUIZZES}/${quizId}`).once('value');

      res.json({
        success: true,
        message: 'Quiz został zaktualizowany pomyślnie',
        data: {
          id: quizId,
          ...updatedQuiz.val()
        }
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Błąd podczas aktualizacji quizu', 500, ErrorType.INTERNAL);
    }
  })
);

// Helper functions for analytics calculations
function calculateLearningVelocity(history: any[]): number {
  if (history.length < 2) return 0;
  
  const recent = history.slice(0, 5);
  const older = history.slice(5, 10);
  
  const recentAvg = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
  const olderAvg = older.reduce((sum, h) => sum + h.score, 0) / older.length;
  
  return Math.round((recentAvg - olderAvg) * 10) / 10;
}

function calculateConceptMastery(history: any[]): Record<string, number> {
  const concepts: Record<string, { total: number; correct: number }> = {};
  
  history.forEach(h => {
    h.strengths?.forEach((concept: string) => {
      if (!concepts[concept]) concepts[concept] = { total: 0, correct: 0 };
      concepts[concept].total++;
      concepts[concept].correct++;
    });
    
    h.weaknesses?.forEach((concept: string) => {
      if (!concepts[concept]) concepts[concept] = { total: 0, correct: 0 };
      concepts[concept].total++;
    });
  });
  
  return Object.entries(concepts).reduce((acc, [concept, data]) => {
    acc[concept] = Math.round((data.correct / data.total) * 100);
    return acc;
  }, {} as Record<string, number>);
}

function calculateDifficultyReadiness(history: any[]): 'beginner' | 'intermediate' | 'advanced' {
  const recentScores = history.slice(0, 10).map(h => h.score);
  const avgScore = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
  
  if (avgScore >= 85) return 'advanced';
  if (avgScore >= 70) return 'intermediate';
  return 'beginner';
}

function calculatePhilosophicalConsistency(history: any[]): number {
  const alignments = history.map(h => h.philosophicalAlignment).filter(Boolean);
  if (alignments.length < 2) return 0;
  
  const alignmentCounts = alignments.reduce((acc, alignment) => {
    acc[alignment] = (acc[alignment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const maxCount = Math.max(...Object.values(alignmentCounts) as number[]);
  return Math.round((maxCount / alignments.length) * 100);
}

function calculateStreakAnalysis(history: any[]): {
  currentStreak: number;
  longestStreak: number;
  streakTrend: 'improving' | 'stable' | 'declining';
} {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  history.reverse().forEach(h => {
    if (h.passed) {
      tempStreak++;
      if (currentStreak === 0) currentStreak = tempStreak;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 0;
      currentStreak = 0;
    }
  });
  
  longestStreak = Math.max(longestStreak, tempStreak);
  
  const trend = currentStreak > longestStreak * 0.8 ? 'improving' : 
                currentStreak > longestStreak * 0.5 ? 'stable' : 'declining';
  
  return { currentStreak, longestStreak, streakTrend: trend };
}

function calculateEngagementScore(history: any[]): number {
  if (history.length === 0) return 0;
  
  const factors = {
    frequency: Math.min(history.length / 20, 1) * 30, // 30 points for regular quizzing
    performance: (history.reduce((sum, h) => sum + h.score, 0) / history.length) * 0.4, // 40 points for performance
    consistency: calculateStreakAnalysis(history).currentStreak * 2, // 2 points per streak day
    time: Math.min(history.reduce((sum, h) => sum + h.timeSpent, 0) / 3600, 1) * 30 // 30 points for time investment
  };
  
  return Math.round(Math.min(Object.values(factors).reduce((sum, factor) => sum + factor, 0), 100));
}

function calculateTimeEfficiency(history: any[]): number {
  if (history.length === 0) return 0;
  
  const efficiency = history.map(h => h.score / (h.timeSpent / 60)); // Score per minute
  return Math.round(efficiency.reduce((sum, eff) => sum + eff, 0) / efficiency.length * 10) / 10;
}

function calculateImprovementTrend(history: any[]): 'improving' | 'stable' | 'declining' {
  if (history.length < 6) return 'stable';
  
  const recent = history.slice(0, 3).reduce((sum, h) => sum + h.score, 0) / 3;
  const older = history.slice(3, 6).reduce((sum, h) => sum + h.score, 0) / 3;
  
  const diff = recent - older;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

export default router;