import database from '@react-native-firebase/database';
import { 
  User, 
  UserProfile, 
  Philosopher, 
  Lesson, 
  Quiz,
  OwnedPhilosopher 
} from '@/types/database.types';

class DatabaseService {
  private db = database();

  // User Operations
  async createUser(userId: string, email: string, username: string): Promise<void> {
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
      },
      achievements: {},
      philosopherCollection: {},
    };

    await this.db.ref(`users/${userId}`).set(newUser);
  }

  async getUser(userId: string): Promise<User | null> {
    const snapshot = await this.db.ref(`users/${userId}`).once('value');
    return snapshot.val();
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    await this.db.ref(`users/${userId}/profile`).update(updates);
  }

  async addExperience(userId: string, amount: number): Promise<void> {
    const userRef = this.db.ref(`users/${userId}`);
    
    await this.db.ref().transaction((currentData) => {
      if (currentData?.users?.[userId]) {
        const user = currentData.users[userId];
        user.progression.experience += amount;
        
        // Level up logic
        const experienceForNextLevel = user.progression.level * 100;
        if (user.progression.experience >= experienceForNextLevel) {
          user.progression.level += 1;
          user.progression.experience -= experienceForNextLevel;
        }
        
        return currentData;
      }
      return currentData;
    });
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
      .set(ownedPhilosopher);
  }

  //Operacje na lekcjach

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

  // Quiz

  async getQuiz(quizId: string): Promise<Quiz | null> {
    const snapshot = await this.db.ref(`quizzes/${quizId}`).once('value');
    return snapshot.val();
  }

  async submitQuizResult(
    userId: string, 
    quizId: string, 
    score: number, 
    timeSpent: number
  ): Promise<void> {
    const updates: Record<string, any> = {};

    // User progress
    const progressRef = `userProgress/${userId}/${quizId}`;
    const progressSnapshot = await this.db.ref(progressRef).once('value');
    const currentProgress = progressSnapshot.val() || {
      attempts: 0,
      bestScore: 0,
      timeSpent: 0,
    };

    updates[progressRef] = {
      ...currentProgress,
      attempts: currentProgress.attempts + 1,
      bestScore: Math.max(currentProgress.bestScore, score),
      timeSpent: currentProgress.timeSpent + timeSpent,
      lastAttempt: Date.now(),
    };

    // Update user stats
    updates[`users/${userId}/stats/quizzesCompleted`] = database.ServerValue.increment(1);
    
    const quiz = await this.getQuiz(quizId);
    if (quiz && score >= quiz.passingScore) {
      updates[`users/${userId}/stats/perfectScores`] = database.ServerValue.increment(1);
    }

    await this.db.ref().update(updates);
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
}

export default new DatabaseService();