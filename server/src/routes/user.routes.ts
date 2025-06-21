import { Router, Request, Response } from 'express';
import { z } from 'zod';
import admin from 'firebase-admin';
import { validateRequest, generalRateLimit, checkFirebaseConnection } from '../middleware/middleware';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler, AppError, ErrorType } from '../middleware/error.middleware';
import { EnhancedDatabaseService } from '../services/firebase/database.service';
import { QuizDatabaseService } from '../services/firebase/quiz-database.service';
import GachaService from '../services/gacha.service';
import { DB_PATHS } from '../../server/src/config/firebase.config';

const router = Router();
const dbService = new EnhancedDatabaseService();
const quizDbService = new QuizDatabaseService();

// Validation Schemas
const UserPreferencesSchema = z.object({
  body: z.object({
    learningPace: z.enum(['slow', 'normal', 'fast']).optional(),
    preferredDifficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    philosophicalInterests: z.array(z.string()).max(10).optional(),
    dailyGoalMinutes: z.number().min(5).max(300).optional(),
    reminderTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:MM format
    preferredSchools: z.array(z.string()).max(5).optional(),
    notifications: z.object({
      achievements: z.boolean().optional(),
      dailyReminders: z.boolean().optional(),
      weeklyProgress: z.boolean().optional(),
      newPhilosophers: z.boolean().optional(),
    }).optional(),
  }),
});

const GoalSchema = z.object({
  body: z.object({
    type: z.enum(['daily_quiz', 'weekly_lessons', 'collection_milestone', 'streak_goal', 'custom']),
    title: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    targetValue: z.number().min(1).max(1000),
    deadline: z.number().optional(), // timestamp
    reward: z.object({
      experience: z.number().min(0).optional(),
      tickets: z.number().min(0).optional(),
      philosopherId: z.string().optional(),
    }).optional(),
  }),
});

const LeaderboardQuerySchema = z.object({
  query: z.object({
    type: z.enum(['experience', 'quiz_scores', 'collection_size', 'streak_days', 'weekly_active']).optional(),
    timeframe: z.enum(['daily', 'weekly', 'monthly', 'all_time']).optional(),
    limit: z.string().optional(),
    includeUser: z.enum(['true', 'false']).optional(),
  }).optional(),
});

const ExportQuerySchema = z.object({
  query: z.object({
    format: z.enum(['json', 'csv']).optional(),
    includeHistory: z.enum(['true', 'false']).optional(),
    dateRange: z.string().optional(), // "startDate,endDate"
  }).optional(),
});

const PublicProfileParamsSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
});

// Apply middleware
router.use(generalRateLimit.middleware);
router.use(checkFirebaseConnection);

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'User service is running',
    timestamp: Date.now(),
    availableEndpoints: [
      'GET /users/dashboard',
      'GET /users/progress',
      'PUT /users/preferences',
      'GET /users/achievements',
      'GET /users/leaderboards',
      'POST /users/goals',
      'GET /users/statistics/export'
    ]
  });
});

// Get user dashboard (authenticated)
router.get('/dashboard',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    try {
      // Get user data
      const userData = await dbService.getUser(userId);
      if (!userData) {
        throw new AppError('Dane użytkownika nie zostały znalezione', 404, ErrorType.NOT_FOUND);
      }

      // Get recent activity
      const recentQuizzes = await quizDbService.getUserQuizHistory(userId, 5);
      const gachaStats = await GachaService.getUserPullStats(userId);
      const tickets = await GachaService.getUserTickets(userId);

      // Calculate progress metrics
      const progressMetrics = {
        level: userData.progression.level,
        experience: userData.progression.experience,
        experienceToNextLevel: (userData.progression.level * 100) - userData.progression.experience,
        lessonsCompleted: userData.progression.completedLessons.length,
        quizzesCompleted: userData.stats.quizzesCompleted,
        currentStreak: userData.stats.streakDays,
        collectionSize: Object.keys(userData.philosopherCollection || {}).length,
        gachaTickets: tickets
      };

      // Get achievements progress
      const achievements = await getAchievementProgress(userId, userData);

      // Generate personalized recommendations
      const recommendations = await generateRecommendations(userId, userData, recentQuizzes);

      // Get current daily challenge
      const dailyChallenge = await getCurrentDailyChallenge(userId);

      res.json({
        success: true,
        data: {
          user: {
            username: userData.profile.username,
            level: userData.progression.level,
            joinedAt: userData.profile.joinedAt,
            lastActive: userData.profile.lastActive
          },
          progress: progressMetrics,
          recentActivity: {
            quizzes: recentQuizzes.slice(0, 3),
            lastGachaPull: gachaStats.lastLegendary,
            recentAchievements: achievements.recentUnlocks
          },
          achievements: {
            unlocked: achievements.unlocked,
            inProgress: achievements.inProgress,
            featured: achievements.featured
          },
          recommendations,
          dailyChallenge,
          quickStats: {
            todayProgress: 0, // TODO: implement daily tracking
            weeklyGoal: 70, // percentage
            favoritePhilosopher: getMostUsedPhilosopher(userData),
            learningStreak: userData.stats.streakDays
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Błąd podczas ładowania pulpitu', 500, ErrorType.INTERNAL);
    }
  })
);

// Get detailed user progress (authenticated)
router.get('/progress',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    try {
      const userData = await dbService.getUser(userId);
      if (!userData) {
        throw new AppError('Dane użytkownika nie zostały znalezione', 404, ErrorType.NOT_FOUND);
      }

      // Get detailed quiz analytics
      const quizHistory = await quizDbService.getUserQuizHistory(userId, 50);
      const quizAnalytics = calculateQuizAnalytics(quizHistory);

      // Get collection analytics
      const collectionAnalytics = calculateCollectionAnalytics(userData.philosopherCollection || {});

      // Get learning velocity and trends
      const learningTrends = calculateLearningTrends(quizHistory, userData);

      // Get time-based analytics
      const timeAnalytics = calculateTimeAnalytics(quizHistory, userData);

      res.json({
        success: true,
        data: {
          overview: {
            totalExperience: userData.progression.experience,
            currentLevel: userData.progression.level,
            globalRanking: await getUserGlobalRanking(userId),
            learningVelocity: learningTrends.velocity
          },
          quizAnalytics,
          collectionAnalytics,
          learningTrends,
          timeAnalytics,
          milestones: {
            next: calculateNextMilestones(userData),
            recent: calculateRecentMilestones(userData)
          },
          insights: generateLearningInsights(userData, quizHistory)
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania szczegółów postępu', 500, ErrorType.INTERNAL);
    }
  })
);

// Update user preferences (authenticated)
router.put('/preferences',
  authenticate,
  validateRequest(UserPreferencesSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const preferences = req.body;

    try {
      // Update user preferences in database
      const updates: any = {};
      
      if (preferences.learningPace) {
        updates['preferences/learningPace'] = preferences.learningPace;
      }
      
      if (preferences.preferredDifficulty) {
        updates['preferences/preferredDifficulty'] = preferences.preferredDifficulty;
      }
      
      if (preferences.philosophicalInterests) {
        updates['preferences/philosophicalInterests'] = preferences.philosophicalInterests;
      }
      
      if (preferences.dailyGoalMinutes) {
        updates['preferences/dailyGoalMinutes'] = preferences.dailyGoalMinutes;
      }
      
      if (preferences.reminderTime) {
        updates['preferences/reminderTime'] = preferences.reminderTime;
      }
      
      if (preferences.preferredSchools) {
        updates['preferences/preferredSchools'] = preferences.preferredSchools;
      }
      
      if (preferences.notifications) {
        updates['preferences/notifications'] = preferences.notifications;
      }

      await admin.database().ref(`${DB_PATHS.USERS}/${userId}`).update(updates);

      res.json({
        success: true,
        message: 'Preferencje zostały zaktualizowane pomyślnie',
        data: {
          updatedFields: Object.keys(preferences),
          recommendations: generatePreferenceRecommendations(preferences)
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas aktualizacji preferencji', 500, ErrorType.INTERNAL);
    }
  })
);

// Get user achievements (authenticated)
router.get('/achievements',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    try {
      const userData = await dbService.getUser(userId);
      if (!userData) {
        throw new AppError('Dane użytkownika nie zostały znalezione', 404, ErrorType.NOT_FOUND);
      }

      const achievements = await getDetailedAchievementProgress(userId, userData);

      res.json({
        success: true,
        data: {
          summary: {
            totalUnlocked: achievements.unlocked.length,
            totalAvailable: achievements.total,
            completionPercentage: Math.round((achievements.unlocked.length / achievements.total) * 100),
            pointsEarned: achievements.totalPoints
          },
          categories: {
            learning: achievements.byCategory.learning,
            collection: achievements.byCategory.collection,
            social: achievements.byCategory.social,
            special: achievements.byCategory.special
          },
          recent: achievements.recentUnlocks,
          nextGoals: achievements.nearCompletion
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania osiągnięć', 500, ErrorType.INTERNAL);
    }
  })
);

// Get leaderboards (authenticated)
router.get('/leaderboards',
  authenticate,
  validateRequest(LeaderboardQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { type = 'experience', timeframe = 'weekly', limit = '50', includeUser = 'true' } = req.query as any;

    try {
      const leaderboard = await generateLeaderboard(type, timeframe, parseInt(limit));
      
      let userPosition = null;
      if (includeUser === 'true') {
        userPosition = await getUserLeaderboardPosition(userId, type, timeframe);
      }

      res.json({
        success: true,
        data: {
          leaderboard,
          userPosition,
          metadata: {
            type,
            timeframe,
            updatedAt: Date.now(),
            totalParticipants: leaderboard.length
          }
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania rankingów', 500, ErrorType.INTERNAL);
    }
  })
);

// Create user goal (authenticated)
router.post('/goals',
  authenticate,
  validateRequest(GoalSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const goalData = req.body;

    try {
      const goalId = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const goal = {
        id: goalId,
        ...goalData,
        userId,
        createdAt: Date.now(),
        status: 'active',
        progress: 0,
        updatedAt: Date.now()
      };

      await admin.database()
        .ref(`${DB_PATHS.USERS}/${userId}/goals/${goalId}`)
        .set(goal);

      res.status(201).json({
        success: true,
        message: 'Cel został utworzony pomyślnie',
        data: goal
      });

    } catch (error) {
      throw new AppError('Błąd podczas tworzenia celu', 500, ErrorType.INTERNAL);
    }
  })
);

// Get user's learning streaks (authenticated)
router.get('/streaks',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    try {
      const userData = await dbService.getUser(userId);
      if (!userData) {
        throw new AppError('Dane użytkownika nie zostały znalezione', 404, ErrorType.NOT_FOUND);
      }

      const streaks = {
        daily: {
          current: userData.stats.streakDays,
          longest: await getLongestStreak(userId, 'daily'),
          lastUpdate: userData.stats.lastStreakUpdate
        },
        quiz: {
          current: await getCurrentQuizStreak(userId),
          longest: await getLongestStreak(userId, 'quiz')
        },
        login: {
          current: await getCurrentLoginStreak(userId),
          longest: await getLongestStreak(userId, 'login')
        }
      };

      res.json({
        success: true,
        data: {
          streaks,
          rewards: {
            nextMilestone: calculateNextStreakReward(streaks.daily.current),
            availableRewards: getAvailableStreakRewards(streaks)
          }
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania informacji o seriach', 500, ErrorType.INTERNAL);
    }
  })
);

// Export user statistics (authenticated)
router.get('/statistics/export',
  authenticate,
  validateRequest(ExportQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { format = 'json', includeHistory = 'false', dateRange } = req.query as any;

    try {
      const userData = await dbService.getUser(userId);
      if (!userData) {
        throw new AppError('Dane użytkownika nie zostały znalezione', 404, ErrorType.NOT_FOUND);
      }

      let exportData: any = {
        exportDate: new Date().toISOString(),
        userId,
        profile: userData.profile,
        progression: userData.progression,
        stats: userData.stats,
        achievements: userData.achievements,
        collectionSummary: {
          totalPhilosophers: Object.keys(userData.philosopherCollection || {}).length,
          averageLevel: calculateAveragePhilosopherLevel(userData.philosopherCollection || {}),
          totalDuplicates: calculateTotalDuplicates(userData.philosopherCollection || {})
        }
      };

      if (includeHistory === 'true') {
        const quizHistory = await quizDbService.getUserQuizHistory(userId, 1000);
        const gachaHistory = await GachaService.getUserHistory(userId, 1000);
        
        exportData.history = {
          quizzes: quizHistory,
          gachaPulls: gachaHistory
        };
      }

      if (format === 'csv') {
        const csv = convertToCSV(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="critiquest-data-${userId}-${Date.now()}.csv"`);
        res.send(csv);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="critiquest-data-${userId}-${Date.now()}.json"`);
        res.json({
          success: true,
          data: exportData
        });
      }

    } catch (error) {
      throw new AppError('Błąd podczas eksportowania danych', 500, ErrorType.INTERNAL);
    }
  })
);

// Get public user profile (public endpoint with user ID)
router.get('/:userId/public-profile',
  validateRequest(PublicProfileParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
      const userData = await dbService.getUser(userId);
      if (!userData) {
        throw new AppError('Profil użytkownika nie został znaleziony', 404, ErrorType.NOT_FOUND);
      }

      // Return only public information
      const publicProfile = {
        username: userData.profile.username,
        level: userData.progression.level,
        joinedAt: userData.profile.joinedAt,
        stats: {
          lessonsCompleted: userData.progression.completedLessons.length,
          quizzesCompleted: userData.stats.quizzesCompleted,
          currentStreak: userData.stats.streakDays,
          collectionSize: Object.keys(userData.philosopherCollection || {}).length
        },
        achievements: {
          total: Object.keys(userData.achievements || {}).length,
          featured: Object.values(userData.achievements || {}).slice(0, 3) // Top 3
        },
        favoritePhilosopher: getMostUsedPhilosopher(userData)
      };

      res.json({
        success: true,
        data: publicProfile
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Błąd podczas pobierania profilu publicznego', 500, ErrorType.INTERNAL);
    }
  })
);

// Get daily challenges (authenticated)
router.get('/daily-challenges',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    try {
      const dailyChallenges = await getDailyChallenges(userId);

      res.json({
        success: true,
        data: {
          today: dailyChallenges.today,
          streak: dailyChallenges.completionStreak,
          upcoming: dailyChallenges.upcoming,
          rewards: {
            completed: dailyChallenges.completedRewards,
            available: dailyChallenges.availableRewards
          }
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania wyzwań dnia', 500, ErrorType.INTERNAL);
    }
  })
);

// Helper functions
async function getAchievementProgress(userId: string, userData: any) {
  // Mock implementation - in real app, this would check against achievement definitions
  return {
    unlocked: Object.keys(userData.achievements || {}),
    inProgress: [],
    featured: [],
    recentUnlocks: []
  };
}

async function generateRecommendations(userId: string, userData: any, recentQuizzes: any[]) {
  const recommendations = [];
  
  if (recentQuizzes.length < 3) {
    recommendations.push({
      type: 'quiz',
      title: 'Kontynuuj naukę',
      description: 'Rozwiąż więcej quizów aby podnieść swój poziom',
      action: 'take_quiz'
    });
  }
  
  if (Object.keys(userData.philosopherCollection || {}).length < 5) {
    recommendations.push({
      type: 'gacha',
      title: 'Rozbuduj kolekcję',
      description: 'Zdobądź nowych filozofów przez losowanie',
      action: 'gacha_pull'
    });
  }
  
  return recommendations;
}

async function getCurrentDailyChallenge(userId: string) {
  // Mock implementation
  return {
    id: `daily_${new Date().toDateString()}`,
    title: 'Filozoficzny umysł',
    description: 'Ukończ 3 quizy z wynikiem powyżej 80%',
    progress: 0,
    target: 3,
    reward: {
      experience: 200,
      tickets: 2
    }
  };
}

function getMostUsedPhilosopher(userData: any): string {
  const collection = userData.philosopherCollection || {};
  let mostUsed = '';
  let highestLevel = 0;
  
  Object.entries(collection).forEach(([id, phil]: [string, any]) => {
    if (phil.level > highestLevel) {
      highestLevel = phil.level;
      mostUsed = id;
    }
  });
  
  return mostUsed || 'none';
}

function calculateQuizAnalytics(quizHistory: any[]) {
  if (quizHistory.length === 0) {
    return {
      averageScore: 0,
      totalTime: 0,
      improvement: 0,
      strongestConcepts: [],
      weakestConcepts: []
    };
  }
  
  return {
    averageScore: quizHistory.reduce((sum, quiz) => sum + quiz.score, 0) / quizHistory.length,
    totalTime: quizHistory.reduce((sum, quiz) => sum + quiz.timeSpent, 0),
    improvement: calculateImprovement(quizHistory),
    strongestConcepts: extractStrongestConcepts(quizHistory),
    weakestConcepts: extractWeakestConcepts(quizHistory)
  };
}

function calculateCollectionAnalytics(collection: any) {
  const philosophers = Object.values(collection);
  
  return {
    totalCount: philosophers.length,
    averageLevel: philosophers.length > 0 
      ? philosophers.reduce((sum: number, phil: any) => sum + phil.level, 0) / philosophers.length 
      : 0,
    totalDuplicates: philosophers.reduce((sum: number, phil: any) => sum + (phil.duplicates || 0), 0),
    rarityDistribution: calculateRarityDistribution(philosophers)
  };
}

function calculateLearningTrends(quizHistory: any[], userData: any) {
  return {
    velocity: calculateLearningVelocity(quizHistory),
    consistency: calculateConsistency(quizHistory),
    peakPerformanceTime: findPeakPerformanceTime(quizHistory)
  };
}

function calculateTimeAnalytics(quizHistory: any[], userData: any) {
  return {
    totalLearningTime: quizHistory.reduce((sum, quiz) => sum + quiz.timeSpent, 0),
    averageSessionLength: quizHistory.length > 0 
      ? quizHistory.reduce((sum, quiz) => sum + quiz.timeSpent, 0) / quizHistory.length 
      : 0,
    mostActiveDay: findMostActiveDay(quizHistory),
    learningPattern: analyzeLearningPattern(quizHistory)
  };
}

// Additional helper functions (simplified implementations)
function calculateImprovement(quizHistory: any[]): number { return 0; }
function extractStrongestConcepts(quizHistory: any[]): string[] { return []; }
function extractWeakestConcepts(quizHistory: any[]): string[] { return []; }
function calculateRarityDistribution(philosophers: any[]): any { return {}; }
function calculateLearningVelocity(quizHistory: any[]): number { return 0; }
function calculateConsistency(quizHistory: any[]): number { return 0; }
function findPeakPerformanceTime(quizHistory: any[]): string { return 'morning'; }
function findMostActiveDay(quizHistory: any[]): string { return 'Monday'; }
function analyzeLearningPattern(quizHistory: any[]): string { return 'consistent'; }
function calculateNextMilestones(userData: any): any[] { return []; }
function calculateRecentMilestones(userData: any): any[] { return []; }
function generateLearningInsights(userData: any, quizHistory: any[]): string[] { return []; }
function generatePreferenceRecommendations(preferences: any): string[] { return []; }
async function getDetailedAchievementProgress(userId: string, userData: any): Promise<any> { return {}; }
async function generateLeaderboard(type: string, timeframe: string, limit: number): Promise<any[]> { return []; }
async function getUserLeaderboardPosition(userId: string, type: string, timeframe: string): Promise<any> { return null; }
async function getUserGlobalRanking(userId: string): Promise<number> { return 0; }
async function getLongestStreak(userId: string, type: string): Promise<number> { return 0; }
async function getCurrentQuizStreak(userId: string): Promise<number> { return 0; }
async function getCurrentLoginStreak(userId: string): Promise<number> { return 0; }
function calculateNextStreakReward(currentStreak: number): any { return {}; }
function getAvailableStreakRewards(streaks: any): any[] { return []; }
function calculateAveragePhilosopherLevel(collection: any): number { return 0; }
function calculateTotalDuplicates(collection: any): number { return 0; }
function convertToCSV(data: any): string { return ''; }
async function getDailyChallenges(userId: string): Promise<any> { return {}; }

export default router;