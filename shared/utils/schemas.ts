import { z} from 'zod';

export const PhilosopherStatsSchema = z.object({
  logic: z.number().min(0).max(100),
  ethics: z.number().min(0).max(100),
  metaphysics: z.number().min(0).max(100),
  epistemology: z.number().min(0).max(100),
  aesthetics: z.number().min(0).max(100),
  mind: z.number().min(0).max(100),
  language: z.number().min(0).max(100),
  science: z.number().min(0).max(100),
  social: z.number().min(0).max(100),
});

export const UserProfileSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  avatarUrl: z.string().url().optional(),
  joinedAt: z.number(),
  lastActive: z.number(),
});

export const UserProgressionSchema = z.object({
  level: z.number().min(1),
  experience: z.number().min(0),
  currentStage: z.string(),
  completedLessons: z.array(z.string()),
  unlockedPhilosophers: z.array(z.string()),
});

export const PhilosopherSchema = z.object({
  name: z.string(),
  era: z.string(),
  school: z.string(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
  baseStats: PhilosopherStatsSchema,
  description: z.string(),
  imageUrl: z.string().url(),
  quotes: z.array(z.string()),
  specialAbility: z.object({
    name: z.string(),
    description: z.string(),
    effect: z.string(),
  }),
});

export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(['single', 'multiple', 'scenario']),
  options: z.array(z.string()).min(2).max(6),
  correctAnswers: z.array(z.string()).min(1),
  explanation: z.string(),
  philosophicalContext: z.string(),
  points: z.number().positive(),
});

export const QuizSchema = z.object({
  lessonId: z.string(),
  title: z.string(),
  type: z.enum(['multiple-choice', 'scenario', 'debate']),
  timeLimit: z.number().positive().optional(),
  questions: z.array(QuestionSchema).min(1),
  passingScore: z.number().min(0).max(100),
  philosopherBonus: z.object({
    philosopherId: z.string(),
    bonusMultiplier: z.number().min(1).max(2),
  }).optional(),
});

export const LessonSectionSchema = z.object({
  type: z.enum(['text', 'interactive', 'video']),
  content: z.string().min(1),
  order: z.number().min(0),
});

export const LessonRewardsSchema = z.object({
  experience: z.number().min(0).max(1000),
  gachaTickets: z.number().min(0).max(10),
});

export const LessonSchema = z.object({
  id: z.string().optional(), // Opcjonalne
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(1000),
  stage: z.string().min(1),
  order: z.number().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedTime: z.number().min(1).max(180), // 1-180 minut
  philosophicalConcepts: z.array(z.string()).min(1).max(10),
  requiredPhilosopher: z.string().optional(),
  content: z.object({
    sections: z.array(LessonSectionSchema).min(1),
  }),
  quiz: z.string().min(1),
  rewards: LessonRewardsSchema,
  source: z.enum(['internal', 'external']).optional(),
  externalUrl: z.string().url().optional(),
});

export const UserStatsSchema = z.object({
  totalTimeSpent: z.number().min(0),
  streakDays: z.number().min(0),
  lastStreakUpdate: z.number(),
  quizzesCompleted: z.number().min(0),
  perfectScores: z.number().min(0),
  gachaTickets: z.number().min(0),
});

export const AchievementSchema = z.object({
  unlockedAt: z.number(),
  progress: z.number().min(0).max(100),
});

export const OwnedPhilosopherSchema = z.object({
  level: z.number().min(1).max(50),
  experience: z.number().min(0),
  duplicates: z.number().min(0),
  stats: PhilosopherStatsSchema,
  school: z.string(),
});

export const UserSchema = z.object({
  profile: UserProfileSchema,
  progression: UserProgressionSchema,
  stats: UserStatsSchema,
  achievements: z.record(AchievementSchema),
  philosopherCollection: z.record(OwnedPhilosopherSchema),
});


// Validation helper
export class ValidationService {
  static validateUser(data: unknown): boolean {
    try {
      UserSchema.parse(data);
      return true;
    } catch (error) {
      console.error('Walidacja użytkownika nie powiodła się:', error);
      return false;
    }
  }

  static validatePhilosopher(data: unknown): boolean {
    try {
      PhilosopherSchema.parse(data);
      return true;
    } catch (error) {
      console.error('Walidacja Filozofa nie powiodła się:', error);
      return false;
    }
  }
  static validateQuiz(data: unknown): boolean {
    try {
      QuizSchema.parse(data);
      return true;
    } catch (error) {
      console.error('Walidacja Quizu nie powiodła się:', error);
      return false;
    }
  }

  static validateLesson(data: unknown): boolean {
    try {
      LessonSchema.parse(data);
      return true;
    } catch (error) {
      console.error('Walidacja Lekcji nie powiodła się:', error);
      return false;
    }
  }

  static validateLessonDetailed(data: unknown): {
    isValid: boolean;
    errors: string[];
    sanitizedData?: any;
  } {
    try {
      const validated = LessonSchema.parse(data);
      return {
        isValid: true,
        errors: [],
        sanitizedData: validated,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(err => {
            const path = err.path.join('.');
            return `${path}: ${err.message}`;
          }),
        };
      }
      
      return {
        isValid: false,
        errors: ['Nieznany błąd walidacji'],
      };
    }
  }

  static validateLessonCreation(data: unknown): boolean {
    try {
      const CreationSchema = LessonSchema.extend({
        title: z.string().min(10).max(100), 
        description: z.string().min(50).max(500), 
        philosophicalConcepts: z.array(z.string()).min(1).max(5), 
        content: z.object({
          sections: z.array(LessonSectionSchema).min(1).max(20),
        }),
      });

      CreationSchema.parse(data);
      return true;
    } catch (error) {
      console.error('Walidacja tworzenia lekcji nie powiodła się:', error);
      return false;
    }
  }

  static sanitizeUserInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove basic HTML tags
      .replace(/javascript:/gi, '') // Remove javascript
      .slice(0, 1000);
  }

  static validateQuizAnswers(answers: Record<string, string[]>): boolean {
    try {
      const AnswersSchema = z.record(
        z.string(), 
        z.array(z.string()).min(1).max(10) // 1- 10 odpowiedzi
      );
      AnswersSchema.parse(answers);
      return true;
    } catch (error) {
      console.error('Walidacja odpowiedzi quizu nie powiodła się:', error);
      return false;
    }
  }

  static validateProgressionUpdate(data: unknown): boolean {
    try {
      const ProgressionUpdateSchema = z.object({
        level: z.number().min(1).max(100).optional(),
        experience: z.number().min(0).optional(),
        currentStage: z.string().optional(),
        completedLessons: z.array(z.string()).optional(),
        unlockedPhilosophers: z.array(z.string()).optional(),
      });

      ProgressionUpdateSchema.parse(data);
      return true;
    } catch (error) {
      console.error('Walidacja aktualizacji postępu nie powiodła się:', error);
      return false;
    }
  }
}