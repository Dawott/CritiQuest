import { z } from 'zod';
import { Lesson, LessonWithId } from '@/types/database.types';
import EnhancedDatabaseService from './firebase/database.service';
import { DB_PATHS } from '@/config/firebase.config';
import { getErrorMessage } from '../utils/error.utils';

// Validation schemas using Zod
const LessonCompletionSchema = z.object({
  score: z.number().min(0).max(100),
  timeSpent: z.number().min(0),
  notes: z.string().optional(),
});

const LessonQuerySchema = z.object({
  stage: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  limit: z.number().min(1).max(50).optional(),
  offset: z.number().min(0).optional(),
});

export interface LessonFilters {
  stage?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  userId?: string;
  includeCompleted?: boolean;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  sortDirection?: 'asc' | 'desc';
}

interface SectionCompletionData {
  timeSpent: number;
  sectionsCompleted: number;
  totalSections: number;
  interactionData?: Record<string, any>;
}

interface LessonAnalytics {
  totalViews: number;
  averageTimeSpent: number;
  completionRate: number;
  sectionAnalytics: Array<{
    sectionIndex: number;
    averageTimeSpent: number;
    completionRate: number;
    dropOffRate: number;
  }>;
  userEngagement: {
    mostEngagingSections: number[];
    commonDropOffPoints: number[];
    averageSessionLength: number;
  };
}


export class EnhancedLessonService {
  private db = EnhancedDatabaseService;

  // Pobierz lekcje (z paginacją)
  async getLessons(
    userId: string, 
    filters: LessonFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{
    lessons: LessonWithId[];
    total: number;
    hasMore: boolean;
    userProgress: Record<string, any>;
  }> {
    try {
      // walidacja
      const validatedQuery = LessonQuerySchema.parse(filters);
      
      const { limit = 20, offset = 0 } = pagination;
      
      // User progress z filtrem
      const userProgress = await this.db.read<Record<string, any>>(
        `${DB_PATHS.USER_PROGRESS}/${userId}`
      ) || {};
      
      const completedLessons = await this.getUserCompletedLessons(userId);
      
      // query lekcji
      let lessonsQuery = await this.db.query<Lesson>(
        DB_PATHS.LESSONS,
        'order',
        undefined,
        undefined
      );
      
      let lessons = Object.entries(lessonsQuery).map(([id, lesson]) => ({
        id,
        ...lesson,
      })) as LessonWithId[];
      
      // filtry
      if (filters.stage) {
        lessons = lessons.filter(lesson => lesson.stage === filters.stage);
      }
      
      if (filters.difficulty) {
        lessons = lessons.filter(lesson => lesson.difficulty === filters.difficulty);
      }
      
      if (!filters.includeCompleted) {
        lessons = lessons.filter(lesson => !completedLessons.includes(lesson.id));
      }
      
      // paginacja
      const total = lessons.length;
      const paginatedLessons = lessons.slice(offset, offset + limit);
      
      const enrichedLessons = await this.enrichLessonsWithProgress(paginatedLessons, userId);
      
      return {
        lessons: enrichedLessons,
        total,
        hasMore: offset + limit < total,
        userProgress,
      };
    } catch (error) {
      throw new Error(`Nie udało się pobrać lekcji: ${getErrorMessage(error)}`);
    }
  }

  // Pobierz jedną lekcję
  async getLesson(lessonId: string, userId?: string): Promise<LessonWithId | null> {
    try {
      const lesson = await this.db.read<Lesson>(`${DB_PATHS.LESSONS}/${lessonId}`);
      
      if (!lesson) {
        return null;
      }
      
      const lessonWithId: LessonWithId = {
        id: lessonId,
        source: 'internal',
        ...lesson,
      };
      
      // Dodaj user-specific
      if (userId) {
        const userProgress = await this.db.read<any>(
          `${DB_PATHS.USER_PROGRESS}/${userId}/${lessonId}`
        );
        
        lessonWithId.userProgress = userProgress;
        lessonWithId.isCompleted = !!userProgress;
      }
      
      return lessonWithId;
    } catch (error) {
      throw new Error(`Nie udało się pobrać lekcji: ${getErrorMessage(error)}`);
    }
  }

  // tracking
  async completeLesson(
    userId: string, 
    lessonId: string, 
    completionData: z.infer<typeof LessonCompletionSchema>
  ): Promise<{
    success: boolean;
    experienceGained: number;
    levelUp?: {
      newLevel: number;
      leveledUp: boolean;
    };
    rewards?: string[];
  }> {
    try {
      // dane zakończenia
      const validatedData = LessonCompletionSchema.parse(completionData);
      
      // sprawdzenie czy lekcja istnieje
      const lesson = await this.getLesson(lessonId);
      if (!lesson) {
        throw new Error('Lekcja nieodnaleziona');
      }
      
      // Oblicz doświadczenie
      const baseExperience = this.calculateExperience(lesson, validatedData.score);
      
      await this.db.completeLessonWithProgress(userId, lessonId, validatedData);
      
      const levelUpResult = await this.db.addExperienceWithLevelUp(userId, baseExperience);
      
      const rewards = await this.generateCompletionRewards(lesson, validatedData.score);
      
      return {
        success: true,
        experienceGained: baseExperience,
        levelUp: levelUpResult.leveledUp ? levelUpResult : undefined,
        rewards,
      };
    } catch (error) {
      throw new Error(`Nie udało się zakończyć leckji: ${getErrorMessage(error)}`);
    }
  }

  // otrzymaj rekomendacje
  async getRecommendations(userId: string, limit: number = 5): Promise<LessonWithId[]> {
    try {
      const userProgress = await this.db.read<any>(`${DB_PATHS.USER_PROGRESS}/${userId}`) || {};
      const userProfile = await this.db.read<any>(`${DB_PATHS.USER_PROFILES}/${userId}`) || {};
      
      const completedLessons = Object.keys(userProgress);
      const userStage = userProfile.progression?.currentStage || 'introduction';
      const preferredDifficulty = this.calculatePreferredDifficulty(userProgress);

      const allLessons = await this.getLessons(userId, {
        includeCompleted: false,
      });

      const scoredLessons = allLessons.lessons.map(lesson => ({
        ...lesson,
        score: this.calculateRecommendationScore(lesson, {
          userStage,
          preferredDifficulty,
          completedLessons,
          userProgress,
        }),
      }));

      return scoredLessons
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      throw new Error(`Nie udało się pobrać rekomendacji: ${getErrorMessage(error)}`);
    }
  }

    private calculatePreferredDifficulty(userProgress: Record<string, any>): string {
    const recentScores = Object.values(userProgress)
      .filter((progress: any) => progress.score)
      .slice(-5)
      .map((progress: any) => progress.score);

    if (recentScores.length === 0) return 'beginner';

    const averageScore = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;

    if (averageScore >= 85) return 'advanced';
    if (averageScore >= 70) return 'intermediate';
    return 'beginner';
  }

  private calculateRecommendationScore(
    lesson: LessonWithId,
    context: {
      userStage: string;
      preferredDifficulty: string;
      completedLessons: string[];
      userProgress: Record<string, any>;
    }
  ): number {
    let score = 0;

    // Stage matching 
    if (lesson.stage === context.userStage) score += 50;
    
    // Matching na trudność
    if (lesson.difficulty === context.preferredDifficulty) score += 30;
    else if (lesson.difficulty === 'intermediate' && context.preferredDifficulty === 'beginner') score += 15;
    
    // Preferencje
    score += Math.max(0, 20 - lesson.order);
    
    // opcjonalnie - wymagany filozog
    if (lesson.requiredPhilosopher) {
      // TBD
      score -= 5;
    }

    // TBD
    // score += lessonPopularityScore;

    return score;
  }

  // pobierz polecane lekcje
  async getFeaturedLessons(limit: number = 10): Promise<LessonWithId[]> {
    try {
      const featuredLessons = await this.db.query<Lesson>(
        DB_PATHS.LESSONS,
        'featured',
        true,
        limit
      );
      
      return Object.entries(featuredLessons).map(([id, lesson]) => ({
        id,
        ...lesson,
      })) as LessonWithId[];
    } catch (error) {
      throw new Error(`Nie udało się pobrać rekomendowanych lekcji: ${getErrorMessage(error)}`);
    }
  }

  async prefetchLessonContent(lessonId: string): Promise<void> {
    try {
      const lesson = await this.getLesson(lessonId);
      if (!lesson) throw new Error('Lekcji nie ma');

      // Cache
      const cacheKey = `lesson_content_${lessonId}`;
      await this.cacheService.set(cacheKey, lesson, { ttl: 3600 });

      // Prefetch media - TBD
      /*
      const videoSections = lesson.content.sections.filter(s => s.type === 'video');
      for (const section of videoSections) {
        // Trigger video preload (implementation would depend on video library)
        this.prefetchVideoContent(section.content);
      }*/

    } catch (error) {
      console.error('Nie powiodło się pobranie treści lekcji:', error);
    }
  }

  async batchFetchLessons(lessonIds: string[], userId?: string): Promise<LessonWithId[]> {
    try {
      const lessons = await Promise.all(
        lessonIds.map(id => this.getLesson(id, userId))
      );

      return lessons.filter(lesson => lesson !== null) as LessonWithId[];
    } catch (error) {
      throw new Error(`Nie powiodło się ściągnięcie batcha: ${getErrorMessage(error)}`);
    }
  }

  // pobierz analitykę
  async getLessonAnalytics(lessonId: string): Promise<LessonAnalytics> {
    try {
      const analyticsPath = `${DB_PATHS.LESSON_ANALYTICS}/${lessonId}`;
      const analytics = await this.db.read<any>(analyticsPath);
      
      if (!analytics) {
        return {
          totalViews: 0,
          averageTimeSpent: 0,
          completionRate: 0,
          sectionAnalytics: [],
          userEngagement: {
            mostEngagingSections: [],
            commonDropOffPoints: [],
            averageSessionLength: 0,
          },
        };
      }
      const sectionAnalytics = Object.entries(analytics.sections || {}).map(([index, data]: [string, any]) => ({
        sectionIndex: parseInt(index),
        averageTimeSpent: data.averageTimeSpent || 0,
        completionRate: (data.totalCompletions / analytics.totalViews) * 100,
        dropOffRate: 100 - ((data.totalCompletions / analytics.totalViews) * 100),
      }));

      const mostEngagingSections = sectionAnalytics
        .sort((a, b) => b.averageTimeSpent - a.averageTimeSpent)
        .slice(0, 3)
        .map(s => s.sectionIndex);

      const commonDropOffPoints = sectionAnalytics
        .sort((a, b) => b.dropOffRate - a.dropOffRate)
        .slice(0, 3)
        .map(s => s.sectionIndex);

      return {
        totalViews: analytics.totalViews || 0,
        averageTimeSpent: analytics.averageTimeSpent || 0,
        completionRate: analytics.completionRate || 0,
        sectionAnalytics,
        userEngagement: {
          mostEngagingSections,
          commonDropOffPoints,
          averageSessionLength: analytics.averageSessionLength || 0,
        },
      };

    } catch (error) {
      throw new Error(`Nie powiodła się próba ładowania analityki: ${getErrorMessage(error)}`);
    }
  }

  // Twórz lekcję
  async createLesson(lessonData: Omit<Lesson, 'id'>): Promise<string> {
    try {
      // waliduj lekcję, gdy potrzeba
      const lessonId = await this.db.create(DB_PATHS.LESSONS, {
        ...lessonData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      return lessonId;
    } catch (error) {
      throw new Error(`Nie udało się utworzyć lekcji: ${getErrorMessage(error)}`);
    }
  }

  // Private helper
  private async getUserCompletedLessons(userId: string): Promise<string[]> {
    const user = await this.db.read<any>(`${DB_PATHS.USERS}/${userId}`);
    return user?.progression?.completedLessons || [];
  }

  private async enrichLessonsWithProgress(
    lessons: LessonWithId[], 
    userId: string
  ): Promise<LessonWithId[]> {
    const userProgress = await this.db.read<Record<string, any>>(
      `${DB_PATHS.USER_PROGRESS}/${userId}`
    ) || {};
    
    return lessons.map(lesson => ({
      ...lesson,
      userProgress: userProgress[lesson.id],
      isCompleted: !!userProgress[lesson.id],
    }));
  }

  private calculateExperience(lesson: Lesson, score: number): number {
    const baseExp = 50;
    const difficultyMultiplier = {
      beginner: 1,
      intermediate: 1.5,
      advanced: 2,
      expert: 3,
    };
    
    const scoreMultiplier = score / 100;
    const difficulty = lesson.difficulty || 'beginner';
    
    return Math.floor(baseExp * difficultyMultiplier[difficulty] * scoreMultiplier);
  }

  async trackSectionCompletion(
    lessonId: string,
    sectionIndex: number,
    data: SectionCompletionData,
    userId?: string
  ): Promise<void> {
    try {
      const timestamp = Date.now();
      
      if (userId) {
        const userProgressPath = `${DB_PATHS.USER_PROGRESS}/${userId}/${lessonId}/sections/${sectionIndex}`;
        await this.db.update(userProgressPath, {
          completedAt: timestamp,
          timeSpent: data.timeSpent,
          interactionData: data.interactionData,
        });
      }

      const analyticsPath = `${DB_PATHS.LESSON_ANALYTICS}/${lessonId}/sections/${sectionIndex}`;
      const currentAnalytics = await this.db.read<any>(analyticsPath) || {
        totalCompletions: 0,
        totalTimeSpent: 0,
        averageTimeSpent: 0,
      };

      const newTotalCompletions = currentAnalytics.totalCompletions + 1;
      const newTotalTimeSpent = currentAnalytics.totalTimeSpent + data.timeSpent;

      await this.db.update(analyticsPath, {
        totalCompletions: newTotalCompletions,
        totalTimeSpent: newTotalTimeSpent,
        averageTimeSpent: newTotalTimeSpent / newTotalCompletions,
        lastUpdated: timestamp,
      });

    } catch (error) {
      console.error('Nie udało się prześledzić kompletności sekcji:', error);
      throw new Error(`Nie udało się prześledzić kompletności sekcji: ${getErrorMessage(error)}`);
    }
  }


  private async generateCompletionRewards(lesson: Lesson, score: number): Promise<string[]> {
    const rewards: string[] = [];
    
    if (score >= 90) {
      rewards.push('Perfect Score Bonus');
    }
    
    if (score >= 80) {
      rewards.push('Gacha Ticket');
    }
    
    if (lesson.difficulty === 'advanced' && score >= 70) {
      rewards.push('Szansa na Rzadkiego Filozofa');
    }
    
    return rewards;
  }
}

export default new EnhancedLessonService();