import admin, { database } from 'firebase-admin';
import { 
  User, 
  UserProfile, 
  Philosopher, 
  Lesson, 
  Quiz,
  OwnedPhilosopher 
} from '@/types/database.types';
import { DB_PATHS, batchWrite, runTransaction } from '@/config/firebase.config';

export interface DatabaseOptions {
  useTransaction?: boolean;
  retryAttempts?: number;
  timeout?: number;
}

export class EnhancedDatabaseService {
  private db = admin.database();
  private defaultOptions: DatabaseOptions = {
    useTransaction: false,
    retryAttempts: 3,
    timeout: 10000,
  };

   async getUser(userId: string): Promise<User | null> {
    const snapshot = await this.db.ref(`users/${userId}`).once('value');
    return snapshot.val();
  }

  // CRUD
  async create<T>(path: string, data: T, options?: DatabaseOptions): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      const ref = this.db.ref(path);
      const newRef = await ref.push(data);
      return newRef.key!;
    } catch (error) {
      throw this.handleDatabaseError(error, 'CREATE');
    }
  }

  async read<T>(path: string, options?: DatabaseOptions): Promise<T | null> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      const snapshot = await this.db.ref(path).once('value');
      return snapshot.val() as T;
    } catch (error) {
      throw this.handleDatabaseError(error, 'READ');
    }
  }

  async update(path: string, updates: Record<string, any>, options?: DatabaseOptions): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      if (opts.useTransaction) {
        await runTransaction(this.db.ref(path), (currentData) => {
          return { ...currentData, ...updates };
        });
      } else {
        await this.db.ref(path).update(updates);
      }
    } catch (error) {
      throw this.handleDatabaseError(error, 'UPDATE');
    }
  }

  async delete(path: string, options?: DatabaseOptions): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      await this.db.ref(path).remove();
    } catch (error) {
      throw this.handleDatabaseError(error, 'DELETE');
    }
  }

  // Batchowanie operacji
  async batchUpdate(updates: Record<string, any>): Promise<void> {
    try {
      await batchWrite(updates);
    } catch (error) {
      throw this.handleDatabaseError(error, 'BATCH_UPDATE');
    }
  }

  async query<T>(
    path: string, 
    orderBy: string, 
    filterValue?: any,
    limitToFirst?: number
  ): Promise<Record<string, T>> {
    try {
      let query = this.db.ref(path).orderByChild(orderBy);
      
      if (filterValue !== undefined) {
        query = query.equalTo(filterValue);
      }
      
      if (limitToFirst) {
        query = query.limitToFirst(limitToFirst);
      }
      
      const snapshot = await query.once('value');
      return snapshot.val() || {};
    } catch (error) {
      throw this.handleDatabaseError(error, 'QUERY');
    }
  }

  // atomy
  async createUserWithTransaction(userId: string, email: string, username: string): Promise<void> {
    const newUser: User = {
      profile: {
        username,
        email,
        avatarUrl: '',
        joinedAt: Date.now(),
        lastActive: Date.now(),
      },
      progression: {
        level: 1,
        experience: 0,
        currentStage: 'introduction',
        completedLessons: [],
        unlockedPhilosophers: [],
      },
      stats: {
        totalTimeSpent: 0,
        streakDays: 0,
        lastStreakUpdate: Date.now(),
        quizzesCompleted: 0,
        perfectScores: 0,
        gachaTickets: 0,
      },
      achievements: {},
      philosopherCollection: {},
    };

    const updates: Record<string, any> = {
      [`${DB_PATHS.USERS}/${userId}`]: newUser,
      [`${DB_PATHS.USER_PROGRESS}/${userId}`]: {
        createdAt: Date.now(),
        lastUpdated: Date.now(),
      },
    };

    await this.batchUpdate(updates);
  }
  

  async addExperienceWithLevelUp(userId: string, amount: number): Promise<{
    newLevel: number;
    leveledUp: boolean;
    newExperience: number;
  }> {
    const userRef = this.db.ref(`${DB_PATHS.USERS}/${userId}`);
    
    const result = await runTransaction(userRef, (currentData) => {
      if (!currentData) return currentData;
      
      const oldLevel = currentData.progression.level;
      const oldExperience = currentData.progression.experience;
      const newExperience = oldExperience + amount;

      const newLevel = Math.floor(Math.sqrt(newExperience / 100)) + 1;
      const leveledUp = newLevel > oldLevel;
      
      currentData.progression.level = newLevel;
      currentData.progression.experience = newExperience;
      currentData.profile.lastActive = Date.now();
      
      if (leveledUp) {
        currentData.stats.gachaTickets += (newLevel - oldLevel) * 2;
      }
      
      return currentData;
    });

    const userData = await this.read<User>(`${DB_PATHS.USERS}/${userId}`);
    
    return {
      newLevel: userData!.progression.level,
      leveledUp: userData!.progression.level > (userData!.progression.level - Math.floor(amount / 100)),
      newExperience: userData!.progression.experience,
    };
  }

  async completeLessonWithProgress(
    userId: string, 
    lessonId: string, 
    completionData: {
      score: number;
      timeSpent: number;
      notes?: string;
    }
  ): Promise<void> {
    const updates: Record<string, any> = {};
    
    const completedLessonsPath = `${DB_PATHS.USERS}/${userId}/progression/completedLessons`;
    const currentCompleted = await this.read<string[]>(completedLessonsPath) || [];
    
    if (!currentCompleted.includes(lessonId)) {
      currentCompleted.push(lessonId);
      updates[completedLessonsPath] = currentCompleted;
    }
    
    const analyticsPath = `${DB_PATHS.ANALYTICS}/lessons/${lessonId}`;
    const currentAnalytics = await this.read<any>(analyticsPath) || {
      completions: 0,
      averageScore: 0,
      averageTime: 0,
    };
    
    const newCompletions = currentAnalytics.completions + 1;
    updates[`${analyticsPath}/completions`] = newCompletions;
    updates[`${analyticsPath}/averageScore`] = 
      (currentAnalytics.averageScore * currentAnalytics.completions + completionData.score) / newCompletions;
    updates[`${analyticsPath}/averageTime`] = 
      (currentAnalytics.averageTime * currentAnalytics.completions + completionData.timeSpent) / newCompletions;
    
    updates[`${DB_PATHS.USER_PROGRESS}/${userId}/${lessonId}`] = {
      completedAt: Date.now(),
      score: completionData.score,
      timeSpent: completionData.timeSpent,
      notes: completionData.notes || '',
    };
    
    updates[`${DB_PATHS.USERS}/${userId}/profile/lastActive`] = Date.now();
    
    await this.batchUpdate(updates);
  }

  setupUserProgressListener(userId: string, callback: (data: any) => void): () => void {
    const ref = this.db.ref(`${DB_PATHS.USER_PROGRESS}/${userId}`);
    ref.on('value', (snapshot) => {
      callback(snapshot.val());
    });
    
    return () => ref.off('value');
  }

  private handleDatabaseError(error: any, operation: string): Error {
    console.error(`Database ${operation} error:`, error);
    
    const errorMessages: Record<string, string> = {
      'PERMISSION_DENIED': 'Permission denied',
      'NETWORK_ERROR': 'Network connection failed',
      'DISCONNECTED': 'Database connection lost',
    };
    
    const message = errorMessages[error.code] || `Database ${operation} failed: ${error.message}`;
    return new Error(message);
  }

async getQuiz(quizId: string): Promise<Quiz | null> {
    const snapshot = await this.db.ref(`quizzes/${quizId}`).once('value');
    return snapshot.val();
  }

  async getUserPhilosophers(userId: string): Promise<Record<string, OwnedPhilosopher>> {
    const snapshot = await this.db.ref(`users/${userId}/philosopherCollection`).once('value');
    return snapshot.val() || {};
  }

async getLesson(lessonId: string): Promise<Lesson | null> {
    const snapshot = await this.db.ref(`lessons/${lessonId}`).once('value');
    return snapshot.val();
  }

  async getLessonsByStage(stage: string): Promise<Lesson[]> {
    const snapshot = await this.db
      .ref('lessons')
      .orderByChild('stage')
      .equalTo(stage)
      .once('value');
    const lessons = snapshot.val() || {};

    return Object.entries(lessons)
      .map(([id, lesson]) => ({ id, ...lesson as Lesson }))
      .sort((a, b) => a.order - b.order);
  }

  async completeLesson(userId: string, lessonId: string): Promise<void> {
    const updates: Record<string, any> = {};
    // Dodaj do zakończonych
    const completedRef = `users/${userId}/progression/completedLessons`;
    const snapshot = await this.db.ref(completedRef).once('value');
    const completedLessons = snapshot.val() || [];
    if (!completedLessons.includes(lessonId)) {
      completedLessons.push(lessonId);
      updates[completedRef] = completedLessons;
    }
    // Aktualizuj ostatnią aktywność
    updates[`users/${userId}/profile/lastActive`] = Date.now();
    await this.db.ref().update(updates);
  }

  //Gacha
  async updateUserStats(userId: string, updates: Partial<any>): Promise<void> {
    const statsRef = this.db.ref(`users/${userId}/stats`);
    const incrementalUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'number' && value < 0) {
        incrementalUpdates[key] = database.ServerValue.increment(value);
      } else {
        incrementalUpdates[key] = value;
      }
    }
    await statsRef.update(incrementalUpdates);
  }
  async incrementPhilosopherDuplicates(userId: string, philosopherId: string): Promise<void> {
    const philosopherRef = this.db.ref(`users/${userId}/philosopherCollection/${philosopherId}`);
    await philosopherRef.update({
      duplicates: database.ServerValue.increment(1),
      // Tymczasowo zwiększamy staty za duplikaty
      experience: database.ServerValue.increment(50) // Bonus XP za duplikat
    });
  }

  async addGachaHistory(userId: string, history: any): Promise<void> {
    await this.db.ref(`gachaSystem/history/${userId}/pulls`).push(history);
  }
  async getUserGachaHistory(userId: string, limit: number = 50): Promise<any[]> {
    const snapshot = await this.db
      .ref(`gachaSystem/history/${userId}/pulls`)
      .orderByChild('timestamp')
      .limitToLast(limit)
      .once('value');
    const history = snapshot.val() || {};

    return Object.values(history).reverse();
  }

  // Listenery
  subscribeToUser(userId: string, callback: (user: User | null) => void): () => void {
    const ref = this.db.ref(`users/${userId}`);
    const listener = ref.on('value', (snapshot) => {
      callback(snapshot.val());
    });
    // Unsubscribe
    return () => ref.off('value', listener);
  }
  subscribeToLeaderboard(
    type: 'weekly' | 'allTime',
    limit: number,
    callback: (leaderboard: any[]) => void
  ): () => void {
    const ref = this.db
      .ref(`leaderboards/${type}`)
      .orderByChild('score')
      .limitToLast(limit);

    const listener = ref.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      const leaderboard = Object.entries(data)
        .map(([userId, userData]) => ({ userId, ...userData as any }))
        .reverse(); 
      callback(leaderboard);
    });
    return () => ref.off('value', listener);
  }

  async getUserTickets(userId: string): Promise<number> {
    const snapshot = await this.db.ref(`users/${userId}/stats/gachaTickets`).once('value');
    return snapshot.val() || 0;
  }

  //Filozofowie
  async getPhilosopher(philosopherId: string): Promise<Philosopher | null> {
    const snapshot = await this.db.ref(`philosophers/${philosopherId}`).once('value');
    return snapshot.val();
  }
  async getAllPhilosophers(): Promise<Record<string, Philosopher>> {
    const snapshot = await this.db.ref('philosophers').once('value');
    return snapshot.val() || {};
  }

  async addPhilosopherToCollection(
    userId: string, 
    philosopherId: string
  ): Promise<void> {
    const philosopher = await this.getPhilosopher(philosopherId);
    if (!philosopher) throw new Error('Philosopher not found');
    const ownedPhilosopher: OwnedPhilosopher = {
      level: 1,
      experience: 0,
      duplicates: 0,
      school: "",
      stats: { ...philosopher.baseStats },
    };
    await this.db
      .ref(`users/${userId}/philosopherCollection/${philosopherId}`)
      .set(ownedPhilosopher)
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.ref('.info/connected').once('value');
      return true;
    } catch (error) {
      return false;
    }
  }

  async submitQuizResult(
    userId: string, 
    quizId: string, 
    score: number, 
    timeSpent: number,
    additionalData?: {
      answers?: Record<string, string[]>;
      debateResults?: Record<string, any>;
      philosophicalInsights?: string[];
      hintsUsed?: number;
    }
  ): Promise<void> {
    const resultId = `result_${Date.now()}`;
    const timestamp = Date.now();
    
    const quizResult = {
      id: resultId,
      userId,
      quizId,
      score,
      timeSpent,
      timestamp,
      passed: score >= 70,
      ...additionalData
    };

    const updates = {
      [`users/${userId}/quizHistory/${resultId}`]: quizResult,
      [`users/${userId}/stats/quizzesCompleted`]: admin.database.ServerValue.increment(1),
      [`users/${userId}/stats/totalTimeSpent`]: admin.database.ServerValue.increment(timeSpent),
      [`analytics/quizzes/${quizId}/attempts/${resultId}`]: {
        userId,
        score,
        timeSpent,
        timestamp
      }
    };

    await this.db.ref().update(updates);
  }

  async getUserQuizHistory(userId: string, limit: number = 10): Promise<any[]> {
    const snapshot = await this.db.ref(`users/${userId}/quizHistory`)
      .orderByChild('timestamp')
      .limitToLast(limit)
      .once('value');
    
    const history = snapshot.val() || {};
    return Object.values(history).reverse(); 
  }
}

export default new EnhancedDatabaseService();
