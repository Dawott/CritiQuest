// Web stub for UserProgressionService
import { EventEmitter } from 'events';

export interface ProgressionUpdate {
  experience?: number;
  lessonsCompleted?: string[];
  quizzesCompleted?: number;
  timeSpent?: number;
  streakDays?: number;
  philosophersUnlocked?: string[];
  achievementsEarned?: string[];
  customData?: Record<string, any>;
}

export interface ProgressionReward {
  type: 'level_up' | 'achievement' | 'milestone' | 'daily_reward';
  rewards: {
    gachaTickets?: number;
    experience?: number;
    philosopherId?: string;
    badgeId?: string;
  };
  message: string;
}

export interface ProgressionMilestone {
  id: string;
  name: string;
  description: string;
  requiredValue: number;
  currentValue: number;
  completed: boolean;
  reward: ProgressionReward;
}

export class UserProgressionService extends EventEmitter {
  constructor() {
    super();
    console.warn('Using web stub for UserProgressionService');
  }

  async updateProgression(
    userId: string, 
    update: ProgressionUpdate,
    immediate: boolean = false
  ): Promise<{
    success: boolean;
    rewards?: ProgressionReward[];
    newLevel?: number;
    error?: string;
  }> {
    console.warn('updateProgression not implemented in web build');
    return { success: true };
  }

  async getProgression(userId: string) {
    console.warn('getProgression not implemented in web build');
    return null;
  }

  async getMilestones(userId: string): Promise<ProgressionMilestone[]> {
    console.warn('getMilestones not implemented in web build');
    return [];
  }
}

export default UserProgressionService;