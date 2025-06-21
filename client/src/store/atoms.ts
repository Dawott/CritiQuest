import {atom} from 'jotai';
import { User, Philosopher} from 'shared/types/database.types';

// User state
export const currentUserAtom = atom<User | null>(null);
export const isAuthenticatedAtom = atom(
  (get) => get(currentUserAtom) !== null
);

// Game state
export const gachaTicketsAtom = atom(
  (get) => get(currentUserAtom)?.stats.gachaTickets || 0
);

// Collection state
export const ownedPhilosophersAtom = atom<Record<string, Philosopher>>({});
export const selectedPhilosopherAtom = atom<string | null>(null);

// UI state
export const isLoadingAtom = atom(false);
export const activeTabAtom = atom<string>('Home');

// Quiz state
export const currentQuizAtom = atom<{
  quizId: string;
  currentQuestion: number;
  answers: string[];
  timeSpent: number;
} | null>(null);