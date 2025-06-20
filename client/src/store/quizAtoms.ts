import { atom } from 'jotai';
import { Quiz, Question, DebateQuestion, DebateResult } from '../../../shared/types/database.types';
import { StoredQuizResult } from '../services/firebase/quiz-database.service';

export interface QuizSession {
  quizId: string;
  quiz: Quiz;
  currentQuestionIndex: number;
  answers: Record<string, string[]>; // questionId -> selected answers
  debateResults?: Record<string, DebateResult>;
  timeElapsed: number;
  hintsUsed: number;
  philosopherBonus?: {
    philosopherId: string;
    multiplier: number;
  };
  scenarioPath?: string[]; // Dla rozgałęzień scenariuszy
}

export interface QuizResult {
  score: number;
  totalPoints: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  philosophicalInsights: string[];
  rewards: {
    experience: number;
    tickets: number;
    newPhilosopher?: string;
  };
}

// Aktywne sesje
export const quizSessionAtom = atom<QuizSession | null>(null);

// Quiz progress
export const quizProgressAtom = atom<{
  questionsAnswered: number;
  correctStreak: number;
  criticalThinkingScore: number;
}>({
  questionsAnswered: 0,
  correctStreak: 0,
  criticalThinkingScore: 0,
});

// Timer
export const quizTimerAtom = atom<{
  isRunning: boolean;
  elapsed: number;
  limit?: number;
}>({
  isRunning: false,
  elapsed: 0,
});

// Stan scenariusza dla interaktywnych scenariuszy
export const scenarioStateAtom = atom<{
  currentNode: string;
  choices: string[];
  consequences: Record<string, any>;
  philosopherReactions: Record<string, string>;
}>({
  currentNode: 'start',
  choices: [],
  consequences: {},
  philosopherReactions: {},
});

// Historia quizu do analityki
export const quizHistoryAtom = atom<StoredQuizResult[]>([]);

export const convertToQuizResult = (storedResult: StoredQuizResult): QuizResult => {
  const totalQuestions = Object.keys(storedResult.answers).length;
  const correctAnswers = Math.round((storedResult.score / 100) * totalQuestions);
  const totalPoints = totalQuestions * 10;
  
  return {
    score: storedResult.score,
    totalPoints,
    correctAnswers,
    totalQuestions,
    timeSpent: storedResult.timeSpent,
    philosophicalInsights: storedResult.philosophicalInsights,
    rewards: {
      experience: storedResult.experience,
      tickets: storedResult.tickets,
      newPhilosopher: storedResult.newPhilosopher,
    }
  };
};