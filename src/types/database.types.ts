export interface UserProfile {
  username: string;
  email: string;
  avatarUrl?: string;
  joinedAt: number;
  lastActive: number;
}

export interface UserProgression {
  level: number;
  experience: number;
  currentStage: string;
  completedLessons: string[];
  unlockedPhilosophers: string[];
}

export interface UserStats {
  totalTimeSpent: number;
  streakDays: number;
  lastStreakUpdate: number;
  quizzesCompleted: number;
  perfectScores: number;
  gachaTickets: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  criteria: {
    type: string;
    maxTime?: number;
    minWins?: number;
    minCount?: number;
    minDays?: number;
  },
  rewards: {
    experience: number;
    gachaTickets: number;
  }
}

export interface PhilosopherStats {
  logic: number;
  wisdom: number;
  rhetoric: number;
  influence: number;
  originality: number;
}

export interface OwnedPhilosopher {
  level: number;
  experience: number;
  duplicates: number;
  stats: PhilosopherStats;
  school: string; //coś jak frakcja albo żywioł w pewnej grze o stworkach
}

export interface User {
  profile: UserProfile;
  progression: UserProgression;
  stats: UserStats;
  achievements: Record<string, AchievementProgress>;
  philosopherCollection: Record<string, OwnedPhilosopher>;
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface SpecialAbility {
  name: string;
  description: string;
  effect: string;
}

export interface Philosopher {
  name: string;
  era: string;
  school: string;
  rarity: Rarity;
  baseStats: PhilosopherStats;
  description: string;
  imageUrl: string;
  quotes: string[];
  specialAbility: SpecialAbility;
}

//Typy lekcji
export type ContentType = 'text' | 'interactive' | 'video';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface LessonSection {
  type: ContentType;
  content: string;
  order: number;
}

export interface LessonRewards {
  experience: number;
  gachaTickets: number;
}

export interface Lesson {
  title: string;
  description: string;
  stage: string;
  order: number;
  difficulty: Difficulty;
  estimatedTime: number;
  philosophicalConcepts: string[];
  requiredPhilosopher?: string;
  content: {
    sections: LessonSection[];
  };
  quiz: string;
  rewards: LessonRewards;
}

export interface LessonProgress {
  completedAt: number;
  score: number;
  timeSpent: number;
  notes?: string;
  attempts?: number;
  bestScore?: number;
}

export interface LessonWithId extends Lesson {
  id: string;
  source: 'internal' | 'external';
  userProgress?: LessonProgress | null;
  isCompleted?: boolean;
  featured?: boolean;
  createdAt?: number;
  updatedAt?: number;
}
//Nadchodzące eventy
export interface ProgressionMilestone {
  id: string;
  name: string;
  description: string;
  requiredValue: number;
  currentValue: number;
  completed: boolean;
  reward: {
    type: 'milestone';
    rewards: {
      experience?: number;
      gachaTickets?: number;
      philosopherId?: string;
      badgeId?: string;
    };
    message: string;
  };
}

export interface ProgressionReward {
  type: 'level_up' | 'achievement' | 'milestone' | 'streak' | 'lesson_complete';
  rewards: {
    experience?: number;
    gachaTickets?: number;
    philosopherId?: string;
    badgeId?: string;
  };
  message: string;
}

export interface ProgressionUpdate {
  experience?: number;
  lessonsCompleted?: string[];
  quizzesCompleted?: number;
  timeSpent?: number;
  philosophersUnlocked?: string[];
  achievementsEarned?: string[];
  customData?: Record<string, any>;
}

//Progress
export interface ProgressionEvent {
  id: string;
  userId: string;
  type: 'lesson_complete' | 'quiz_complete' | 'level_up' | 'achievement_unlock' | 'milestone_reached' | 'streak_update';
  timestamp: number;
  data: {
    experience?: number;
    level?: number;
    lessonId?: string;
    quizId?: string;
    achievementId?: string;
    milestoneId?: string;
    streak?: number;
    score?: number;
    rewards?: Record<string, any>;
  };
}

export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  completed: boolean;
  unlockedAt?: number;
  viewed: boolean;
  progress: number;
}

export interface LevelReward {
  level: number;
  rewards: {
    gachaTickets: number;
    experience?: number;
    philosopherId?: string;
    badgeId?: string;
  };
}

export interface UserProgressionStats {
  dailyExperience: number;
  weeklyExperience: number;
  monthlyExperience: number;
  bestStreak: number;
  totalPlayTime: number;
  averageSessionTime: number;
  favoritePhilosopher?: string;
  learningStyle?: 'visual' | 'reading' | 'interactive';
  strongestConcepts: string[];
  weakestConcepts: string[];
}

export interface LearningPathProgress {
  pathId: string;
  currentStage: number;
  totalStages: number;
  completedLessons: string[];
  completedQuizzes: string[];
  unlockedBonusContent: string[];
  pathCompletionPercentage: number;
}

export interface DailyChallenge {
  id: string;
  date: string;
  type: 'quiz' | 'lesson' | 'debate' | 'reflection';
  targetId: string;
  completed: boolean;
  reward: {
    experience: number;
    gachaTickets?: number;
  };
}

// Extended User type additions
export interface ExtendedUserProgression extends UserProgression {
  learningPaths: Record<string, LearningPathProgress>;
  dailyChallenges: Record<string, DailyChallenge>;
  achievementProgress: Record<string, AchievementProgress>;
  stats: UserProgressionStats;
}

// Offline progression queue
export interface QueuedProgressionUpdate {
  id: string;
  userId: string;
  update: ProgressionUpdate;
  timestamp: number;
  retryCount: number;
  lastRetry?: number;
}

// Analytics types
export interface ProgressionAnalytics {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  metrics: {
    experienceGained: number;
    lessonsCompleted: number;
    quizzesCompleted: number;
    perfectScores: number;
    averageQuizScore: number;
    timeSpent: number;
    philosophersUnlocked: number;
    achievementsEarned: number;
    streakMaintained: boolean;
  };
  insights: {
    learningVelocity: number; // XP per hour
    conceptMastery: Record<string, number>; // concept -> mastery percentage
    engagementScore: number; // 0-100
    recommendedDifficulty: 'easy' | 'medium' | 'hard';
  };
}

//Typy zadań

export type QuestionType = 'single' | 'multiple' | 'scenario' | 'debate';
export type QuizType = 'multiple-choice' | 'scenario' | 'debate';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswers: string[];
  explanation: string;
  philosophicalContext: string;
  points: number;

   debateConfig?: {
    title: string;
    context: string;
    question: string; // Główny punkt debaty
    schools_involved: string[];
    max_rounds: number;
    time_per_round?: number;
    required_philosophers?: string[];
    audience_segments?: {
      type: 'academics' | 'students' | 'general_public';
      size: number;
      biases: string[];
    }[];
  };
}

export type DebateQuestion = Question & {
  type: 'debate';
  debateConfig: NonNullable<Question['debateConfig']>;
};

export interface DebateArgument {
  id: string;
  text: string;
  philosophical_basis: string;
  strength_against: string[];
  weakness_against: string[];
  school_bonus: string[];
  conviction_power: number;
  requires_philosopher?: string; // Opcjonalnie
}

export interface Quiz {
  lessonId: string;
  title: string;
  type: QuizType;
  timeLimit?: number;
  questions: Question[];
  passingScore: number;
  philosopherBonus?: {
    philosopherId: string;
    bonusMultiplier: number;
  };
}

//Schemat bazy
export interface DatabaseSchema {
  users: Record<string, User>;
  philosophers: Record<string, Philosopher>;
  lessons: Record<string, Lesson>;
  quizzes: Record<string, Quiz>;
  achievements: Record<string, Achievement>;
  // Kolejne w przyszłości
}

export interface DebateResult {
  winner: 'user' | 'opponent';
  totalRounds: number;
  conviction_score: number;
  learning_insights: string[];
  philosophical_growth: { concept: string; understanding: number }[];
}


//Helper do firebase'a
export type DatabasePath = 
  | `users/${string}`
  | `users/${string}/profile`
  | `users/${string}/progression`
  | `users/${string}/stats`
  | `users/${string}/achievements/${string}`
  | `users/${string}/philosopherCollection/${string}`
  | `philosophers/${string}`
  | `lessons/${string}`
  | `quizzes/${string}`;