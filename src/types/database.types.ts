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
  unlockedAt: number;
  progress: number;
}

export interface PhilosopherStats {
  logic: number;
  ethics: number;
  metaphysics: number;
  epistemology: number;
  aesthetics: number;
  mind: number;
  language: number;
  science: number;
  social: number;
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
  achievements: Record<string, Achievement>;
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
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

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

//Typy zadań

export type QuestionType = 'single' | 'multiple' | 'scenario';
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