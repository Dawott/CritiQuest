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

// Validation helper
export class ValidationService {
  static validateUser(data: unknown): boolean {
    try {
      const UserSchema = z.object({
        profile: UserProfileSchema,
        progression: UserProgressionSchema,
        // TBD - dalsze staty usera
      });
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
}