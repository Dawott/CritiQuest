import { z } from 'zod';
import { Lesson, LessonWithId } from '@/types/database.types';
import EnhancedDatabaseService from './firebase/database.service';
import { DB_PATHS } from '@/config/firebase.config';

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
      throw new Error(`Nie udało się pobrać lekcji: ${error.message}`);
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
      throw new Error(`Nie udało się pobrać lekcji: ${error.message}`);
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
      throw new Error(`Nie udało się zakończyć leckji: ${error.message}`);
    }
  }

  // otrzymaj rekomendacje
  async getRecommendations(userId: string): Promise<LessonWithId[]> {
    try {
      const user = await this.db.read<any>(`${DB_PATHS.USERS}/${userId}`);
      if (!user) throw new Error('User nieodnaleziony');
      
      const completedLessons = user.progression.completedLessons || [];
      const currentStage = user.progression.currentStage;
      
      // Pobierz lekcje dla niezakończonych
      const stageLessons = await this.db.query<Lesson>(
        DB_PATHS.LESSONS,
        'stage',
        currentStage,
        5
      );
      
      const recommendations = Object.entries(stageLessons)
        .filter(([id]) => !completedLessons.includes(id))
        .map(([id, lesson]) => ({ id, ...lesson })) as LessonWithId[];
      
      return recommendations;
    } catch (error) {
      throw new Error(`Nie udało się pobrać rekomendacji: ${error.message}`);
    }
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
      throw new Error(`Nie udało się pobrać rekomendowanych lekcji: ${error.message}`);
    }
  }

  // pobierz analitykę
  async getLessonAnalytics(lessonId: string): Promise<any> {
    try {
      const analytics = await this.db.read<any>(`${DB_PATHS.ANALYTICS}/lessons/${lessonId}`);
      
      return {
        completions: analytics?.completions || 0,
        averageScore: analytics?.averageScore || 0,
        averageTime: analytics?.averageTime || 0,
        lastUpdated: analytics?.lastUpdated || null,
      };
    } catch (error) {
      throw new Error(`Nie udało się pobrać analityki: ${error.message}`);
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
      throw new Error(`Nie udało się utworzyć lekcji: ${error.message}`);
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
    };
    
    const scoreMultiplier = score / 100;
    const difficulty = lesson.difficulty || 'beginner';
    
    return Math.floor(baseExp * difficultyMultiplier[difficulty] * scoreMultiplier);
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