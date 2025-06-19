//import { Database } from 'firebase/database';
import { 
  getFirebaseDatabase, 
  DB_PATHS, 
  runTransaction,
  batchWrite 
} from '@/config/firebase.config';
import { 
  User, 
  UserProgression, 
  UserStats,
  ProgressionEvent,
  AchievementProgress,
  LevelReward 
} from '@/types/database.types';
import DatabaseService from './firebase/database.service';
import { EventEmitter } from 'events';
import { database } from 'firebase-admin';

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
  private db = getFirebaseDatabase();
  private progressionQueue: Map<string, ProgressionUpdate> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly LEVEL_FORMULA = (exp: number) => Math.floor(Math.sqrt(exp / 100)) + 1;
  private readonly EXP_FOR_LEVEL = (level: number) => Math.pow(level - 1, 2) * 100;

  constructor() {
    super();
    this.startProgressionSync();
  }

  // Podstawowy update progresji
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
    try {
      if (!immediate) {
        this.queueProgressionUpdate(userId, update);
        return { success: true };
      }

      // Krytyczny progres
      const result = await this.processProgressionUpdate(userId, update);
      return result;
    } catch (error) {
      console.error('Błąd update postępu:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Nieznany błąd' 
      };
    }
  }

  // Pojedynczy update
  private async processProgressionUpdate(
    userId: string,
    update: ProgressionUpdate
  ): Promise<{
    success: boolean;
    rewards?: ProgressionReward[];
    newLevel?: number;
  }> {
    const userRef = this.db.ref(`${DB_PATHS.USERS}/${userId}`);
    const rewards: ProgressionReward[] = [];
    let newLevel: number | undefined;

    const transactionResult = await runTransaction(userRef, (currentData) => {
      if (!currentData) return currentData;

      const user = currentData as User;
      const oldLevel = user.progression.level;
      const oldExp = user.progression.experience;

      if (update.experience) {
        user.progression.experience += update.experience;
        const calculatedLevel = this.LEVEL_FORMULA(user.progression.experience);
        
        if (calculatedLevel > oldLevel) {
          user.progression.level = calculatedLevel;
          newLevel = calculatedLevel;
          
          // Nagrody za level up
          const levelsGained = calculatedLevel - oldLevel;
          user.stats.gachaTickets += levelsGained * 2;
          
          rewards.push({
            type: 'level_up',
            rewards: {
              gachaTickets: levelsGained * 2,
              experience: 0
            },
            message: `Osiągnięto poziom ${calculatedLevel}! Zyskano bilety: ${levelsGained * 2}!`
          });
        }
      }

      // Update zakończonych lekcji
      if (update.lessonsCompleted?.length) {
        const newLessons = update.lessonsCompleted.filter(
          id => !user.progression.completedLessons.includes(id)
        );
        user.progression.completedLessons.push(...newLessons);
      }

      // Update statystyk
      if (update.quizzesCompleted) {
        user.stats.quizzesCompleted += update.quizzesCompleted;
      }
      if (update.timeSpent) {
        user.stats.totalTimeSpent += update.timeSpent;
      }

      // Update filozofów
      if (update.philosophersUnlocked?.length) {
        const newPhilosophers = update.philosophersUnlocked.filter(
          id => !user.progression.unlockedPhilosophers.includes(id)
        );
        user.progression.unlockedPhilosophers.push(...newPhilosophers);
      }

      // Update ostatnio aktywne
      user.profile.lastActive = Date.now();

      return user;
    });

    // osiągnięcia po achievie
    if (update.achievementsEarned?.length) {
      await this.processAchievements(userId, update.achievementsEarned, rewards);
    }

    // Milestone
    const milestones = await this.checkMilestones(userId);
    for (const milestone of milestones) {
      if (milestone.completed && !milestone.reward.rewards.experience) {
        rewards.push(milestone.reward);
      }
    }

    // Zdarzenia np. progresu
    this.emit('progressionUpdated', { userId, update, rewards, newLevel });

    await this.updateProgressionAnalytics(userId, update, rewards);

    return { success: true, rewards, newLevel };
  }

  private queueProgressionUpdate(userId: string, update: ProgressionUpdate): void {
    const existing = this.progressionQueue.get(userId) || {};
    
    this.progressionQueue.set(userId, {
      experience: (existing.experience || 0) + (update.experience || 0),
      lessonsCompleted: [...(existing.lessonsCompleted || []), ...(update.lessonsCompleted || [])],
      quizzesCompleted: (existing.quizzesCompleted || 0) + (update.quizzesCompleted || 0),
      timeSpent: (existing.timeSpent || 0) + (update.timeSpent || 0),
      philosophersUnlocked: [...(existing.philosophersUnlocked || []), ...(update.philosophersUnlocked || [])],
      achievementsEarned: [...(existing.achievementsEarned || []), ...(update.achievementsEarned || [])],
      customData: { ...existing.customData, ...update.customData }
    });
  }

  private startProgressionSync(): void {
    this.syncInterval = setInterval(async () => {
      await this.syncQueuedProgressions();
    }, this.SYNC_INTERVAL);
  }

  private async syncQueuedProgressions(): Promise<void> {
    if (this.progressionQueue.size === 0) return;

    const updates = new Map(this.progressionQueue);
    this.progressionQueue.clear();

    for (const [userId, update] of updates) {
      try {
        await this.processProgressionUpdate(userId, update);
      } catch (error) {
        console.error(`Nie udało się zsynchronizować update progresu ${userId}:`, error);
        this.queueProgressionUpdate(userId, update);
      }
    }
  }

  async trackLessonProgress(
    userId: string,
    lessonId: string,
    data: {
      sectionCompleted?: number;
      timeSpent: number;
      notesAdded?: string;
      philosophicalInsights?: string[];
    }
  ): Promise<void> {
    const progressPath = `${DB_PATHS.USER_PROGRESS}/${userId}/lessons/${lessonId}`;
    const now = Date.now();

    const updates = {
      [`${progressPath}/lastAccessed`]: now,
      [`${progressPath}/totalTimeSpent`]: database.ServerValue.increment(data.timeSpent),
      [`${progressPath}/sectionsProgress/${data.sectionCompleted}`]: now,
    };

    if (data.notesAdded) {
      updates[`${progressPath}/notes/${now}`] = data.notesAdded;
    }

    if (data.philosophicalInsights?.length) {
      updates[`${progressPath}/insights`] = data.philosophicalInsights;
    }

    await batchWrite(updates);
  }

  // Track quiz progression
  async trackQuizProgress(
    userId: string,
    quizId: string,
    data: {
      questionAnswered: number;
      isCorrect: boolean;
      timeSpent: number;
      hintsUsed?: number;
    }
  ): Promise<void> {
    const progressPath = `${DB_PATHS.USER_PROGRESS}/${userId}/quizzes/${quizId}`;
    
    const updates = {
      [`${progressPath}/questionsAnswered`]: database.ServerValue.increment(1),
      [`${progressPath}/correctAnswers`]: database.ServerValue.increment(data.isCorrect ? 1 : 0),
      [`${progressPath}/totalTimeSpent`]: database.ServerValue.increment(data.timeSpent),
      [`${progressPath}/lastUpdated`]: Date.now(),
    };

    if (data.hintsUsed) {
      updates[`${progressPath}/hintsUsed`] = database.ServerValue.increment(data.hintsUsed);
    }

    await batchWrite(updates);
  }

  // Milestones
  async checkMilestones(userId: string): Promise<ProgressionMilestone[]> {
    const user = await DatabaseService.read<User>(`${DB_PATHS.USERS}/${userId}`);
    if (!user) return [];

    const milestones: ProgressionMilestone[] = [
      {
        id: 'first_lesson',
        name: 'First Steps',
        description: 'Wyjście z jaskini',
        requiredValue: 1,
        currentValue: user.progression.completedLessons.length,
        completed: user.progression.completedLessons.length >= 1,
        reward: {
          type: 'milestone',
          rewards: { gachaTickets: 3, experience: 100 },
          message: 'Witamy na ścieżce oświecenia. Oto bilety by pomóc Ci w nauce'
        }
      },
      {
        id: 'philosophy_novice',
        name: 'W Gimnazjonie',
        description: 'Ukończ 10 lekcji',
        requiredValue: 10,
        currentValue: user.progression.completedLessons.length,
        completed: user.progression.completedLessons.length >= 10,
        reward: {
          type: 'milestone',
          rewards: { gachaTickets: 5, experience: 500 },
          message: 'Idziesz jak burza!'
        }
      },
      {
        id: 'quiz_master',
        name: 'Metoda Sokratesa',
        description: 'Ukończ 20 quizów',
        requiredValue: 20,
        currentValue: user.stats.quizzesCompleted,
        completed: user.stats.quizzesCompleted >= 20,
        reward: {
          type: 'milestone',
          rewards: { gachaTickets: 10, experience: 1000 },
          message: 'Twoja wiedza zapiera dech w piersi!'
        }
      },
      {
        id: 'perfect_thinker',
        name: 'Myśliciel',
        description: 'Uzyskaj 5 perfekcyjnych wyników',
        requiredValue: 5,
        currentValue: user.stats.perfectScores,
        completed: user.stats.perfectScores >= 5,
        reward: {
          type: 'milestone',
          rewards: { philosopherId: 'socrates_special', experience: 2000 },
          message: 'Niezwykły towarzysz dołącza do twojej podróży!'
        }
      }
    ];

    const milestonePath = `${DB_PATHS.USER_PROGRESS}/${userId}/milestones`;
    const completedMilestones = await DatabaseService.read<Record<string, boolean>>(milestonePath) || {};
    
    for (const milestone of milestones) {
      if (milestone.completed && !completedMilestones[milestone.id]) {
        await DatabaseService.update(`${milestonePath}/${milestone.id}`, {
          completedAt: Date.now(),
          rewarded: true
        });
      }
    }

    return milestones;
  }


  private async processAchievements(
    userId: string,
    achievementIds: string[],
    rewards: ProgressionReward[]
  ): Promise<void> {
    const achievementsPath = `${DB_PATHS.USERS}/${userId}/achievements`;
    const updates: Record<string, any> = {};

    for (const achievementId of achievementIds) {
      updates[`${achievementsPath}/${achievementId}`] = {
        unlockedAt: Date.now(),
        viewed: false
      };

      rewards.push({
        type: 'achievement',
        rewards: { experience: 250, gachaTickets: 2 },
        message: `Uzyskano osiągnięcie: ${achievementId}`
      });
    }

    await batchWrite(updates);
  }

  // Daily streak
  async updateDailyStreak(userId: string): Promise<{
    newStreak: number;
    reward?: ProgressionReward;
  }> {
    const userRef = this.db.ref(`${DB_PATHS.USERS}/${userId}/stats`);
    
    const result = await runTransaction(userRef, (currentStats) => {
      if (!currentStats) return currentStats;

      const lastUpdate = currentStats.lastStreakUpdate || 0;
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      const lastDate = new Date(lastUpdate).toDateString();
      const currentDate = new Date(now).toDateString();
      
      if (lastDate !== currentDate) {
        const daysSinceLastUpdate = Math.floor((now - lastUpdate) / oneDayMs);
        
        if (daysSinceLastUpdate === 1) {
          // Continue streak
          currentStats.streakDays += 1;
        } else if (daysSinceLastUpdate > 1) {
          // Streak broken
          currentStats.streakDays = 1;
        }
        
        currentStats.lastStreakUpdate = now;
      }
      
      return currentStats;
    });

    const newStreak = result.snapshot.val()?.streakDays || 0;
    let reward: ProgressionReward | undefined;

    // Streak rewards
    if (newStreak % 7 === 0 && newStreak > 0) {
      reward = {
        type: 'daily_reward',
        rewards: { 
          gachaTickets: Math.floor(newStreak / 7) * 3,
          experience: 500 
        },
        message: `${newStreak} day streak! Tak trzymać!`
      };
    }

    return { newStreak, reward };
  }

  async getProgressionSummary(userId: string): Promise<{
    level: number;
    experience: number;
    expToNextLevel: number;
    totalLessons: number;
    totalQuizzes: number;
    streak: number;
    recentActivity: any[];
    upcomingMilestones: ProgressionMilestone[];
  }> {
    const user = await DatabaseService.read<User>(`${DB_PATHS.USERS}/${userId}`);
    if (!user) throw new Error('User not found');

    const currentLevel = user.progression.level;
    const nextLevelExp = this.EXP_FOR_LEVEL(currentLevel + 1);
    const expToNextLevel = nextLevelExp - user.progression.experience;

    const milestones = await this.checkMilestones(userId);
    const upcomingMilestones = milestones
      .filter(m => !m.completed)
      .sort((a, b) => (a.currentValue / a.requiredValue) - (b.currentValue / b.requiredValue))
      .slice(0, 3);

    const activityPath = `${DB_PATHS.USER_PROGRESS}/${userId}/recentActivity`;
    const recentActivity = await DatabaseService.read<any[]>(activityPath) || [];

    return {
      level: currentLevel,
      experience: user.progression.experience,
      expToNextLevel,
      totalLessons: user.progression.completedLessons.length,
      totalQuizzes: user.stats.quizzesCompleted,
      streak: user.stats.streakDays,
      recentActivity: recentActivity.slice(-10),
      upcomingMilestones
    };
  }

  private async updateProgressionAnalytics(
    userId: string,
    update: ProgressionUpdate,
    rewards: ProgressionReward[]
  ): Promise<void> {
    const analyticsPath = `${DB_PATHS.LESSON_ANALYTICS}/userProgression/${userId}`;
    const timestamp = Date.now();

    const analyticsUpdate = {
      lastUpdate: timestamp,
      totalExperienceGained: database.ServerValue.increment(update.experience || 0),
      lessonsCompleted: database.ServerValue.increment(update.lessonsCompleted?.length || 0),
      quizzesCompleted: database.ServerValue.increment(update.quizzesCompleted || 0),
      totalRewards: database.ServerValue.increment(rewards.length),
      [`dailyActivity/${new Date().toISOString().split('T')[0]}`]: {
        experience: update.experience || 0,
        lessons: update.lessonsCompleted?.length || 0,
        quizzes: update.quizzesCompleted || 0,
        rewards: rewards.length
      }
    };

    await DatabaseService.update(analyticsPath, analyticsUpdate);
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.removeAllListeners();
  }
}

export default new UserProgressionService();