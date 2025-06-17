import { batchWrite, DB_PATHS, runTransaction } from "@/config/firebase.config";
import { DebateResult } from "@/types/database.types";
import { EnhancedDatabaseService } from "./database.service";
import admin from 'firebase-admin';

export interface QuizSubmission {
  quizId: string;
  lessonId?: string;
  userId: string;
  score: number;
  timeSpent: number;
  answers: Record<string, string[]>;
  debateResults?: Record<string, DebateResult>;
  hintsUsed: number;
  philosopherBonus?: {
    philosopherId: string;
    multiplier: number;
  };
  scenarioPath?: string[];
  metadata: {
    deviceType: 'android' | 'ios' | 'web';
    appVersion: string;
    submittedAt: number;
    ip?: string;
  };
}

export interface StoredQuizResult extends QuizSubmission {
  id: string;
  passed: boolean;
  experience: number;
  tickets: number;
  newPhilosopher?: string;
  philosophicalInsights: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  philosophicalAlignment: string;
}

export interface QuizAnalytics {
  totalAttempts: number;
  averageScore: number;
  averageTime: number;
  passRate: number;
  popularAnswers: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  lastUpdated: number;
}

export class QuizDatabaseService extends EnhancedDatabaseService {
  private db = admin.database();

  async submitQuizResult(submission: QuizSubmission): Promise<StoredQuizResult> {
    try {
      await this.validateQuizSubmission(submission);

      const quiz = await this.getQuiz(submission.quizId);
      if (!quiz) throw new Error('Quiz not found');

      const result = await this.calculateQuizResult(submission, quiz);
      
      const storedResult = await this.storeQuizResultWithTransaction(result);
      
      this.updateUserStatsAsync(submission.userId, result);
      this.updateQuizAnalyticsAsync(submission.quizId, result);
      
      return storedResult;
    } catch (error) {
      throw this.handleSubmissionError(error, submission);
    }
  }

  /**
   * Get user quiz history with pagination and filtering
   */
  async getUserQuizHistory(
    userId: string, 
    limit: number = 10,
    options: {
      lessonId?: string;
      quizType?: string;
      passed?: boolean;
      startDate?: number;
      endDate?: number;
    } = {}
  ): Promise<StoredQuizResult[]> {
    try {
      const historyRef = this.db.ref(`${DB_PATHS.USERS}/${userId}/quizHistory`);
      let query = historyRef.orderByChild('submittedAt').limitToLast(limit);

      const snapshot = await query.once('value');
      const results = snapshot.val() || {};

      // Convert to array and apply filters
      let historyArray = Object.entries(results).map(([id, data]: [string, any]) => ({
        id,
        ...data
      })) as StoredQuizResult[];

      // Apply filters
      if (options.lessonId) {
        historyArray = historyArray.filter(r => r.lessonId === options.lessonId);
      }
      if (options.passed !== undefined) {
        historyArray = historyArray.filter(r => r.passed === options.passed);
      }
      if (options.startDate) {
        historyArray = historyArray.filter(r => r.metadata.submittedAt >= options.startDate!);
      }
      if (options.endDate) {
        historyArray = historyArray.filter(r => r.metadata.submittedAt <= options.endDate!);
      }

      return historyArray.sort((a, b) => b.metadata.submittedAt - a.metadata.submittedAt);
    } catch (error) {
      throw this.handleDatabaseError(error, 'GET_QUIZ_HISTORY');
    }
  }

  /**
   * Get quiz analytics and insights
   */
  async getQuizAnalytics(quizId: string): Promise<QuizAnalytics> {
    try {
      const analyticsPath = `${DB_PATHS.ANALYTICS}/quizzes/${quizId}`;
      const analytics = await this.read<QuizAnalytics>(analyticsPath);
      
      if (!analytics) {
        // Initialize analytics if not exists
        const initialAnalytics: QuizAnalytics = {
          totalAttempts: 0,
          averageScore: 0,
          averageTime: 0,
          passRate: 0,
          popularAnswers: {},
          difficultyDistribution: {},
          lastUpdated: Date.now()
        };
        await this.create(analyticsPath, initialAnalytics);
        return initialAnalytics;
      }

      return analytics;
    } catch (error) {
      throw this.handleDatabaseError(error, 'GET_QUIZ_ANALYTICS');
    }
  }

  /**
   * Retry failed submissions with exponential backoff
   */
  async retryFailedSubmission(
    submission: QuizSubmission,
    maxRetries: number = 3
  ): Promise<StoredQuizResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        return await this.submitQuizResult(submission);
      } catch (error) {
        if (attempt === maxRetries) {
          // Store in offline queue for later retry
          await this.storeOfflineSubmission(submission);
          throw error;
        }
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Process offline submissions when connection is restored
   */
  async processOfflineSubmissions(userId: string): Promise<number> {
    try {
      const offlineRef = this.db.ref(`${DB_PATHS.USERS}/${userId}/offlineSubmissions`);
      const snapshot = await offlineRef.once('value');
      const offlineSubmissions = snapshot.val() || {};

      let processedCount = 0;
      const submissions = Object.entries(offlineSubmissions);

      for (const [id, submission] of submissions) {
        try {
          await this.submitQuizResult(submission as QuizSubmission);
          await offlineRef.child(id).remove();
          processedCount++;
        } catch (error) {
          console.error('Failed to process offline submission:', id, error);
        }
      }

      return processedCount;
    } catch (error) {
      throw this.handleDatabaseError(error, 'PROCESS_OFFLINE_SUBMISSIONS');
    }
  }

  // Private helper methods

  private async validateQuizSubmission(submission: QuizSubmission): Promise<void> {
    // Validate required fields
    if (!submission.userId || !submission.quizId) {
      throw new Error('Missing required fields: userId, quizId');
    }

    // Validate score range
    if (submission.score < 0 || submission.score > 100) {
      throw new Error('Invalid score range');
    }

    // Validate time spent (reasonable limits)
    if (submission.timeSpent < 10 || submission.timeSpent > 7200) { // 10 seconds to 2 hours
      throw new Error('Invalid time spent');
    }

    // Check for duplicate submission (within last hour)
    const recentSubmissions = await this.getUserQuizHistory(submission.userId, 5);
    const duplicateSubmission = recentSubmissions.find(result => 
      result.quizId === submission.quizId && 
      (Date.now() - result.metadata.submittedAt) < 3600000 // 1 hour
    );

    if (duplicateSubmission) {
      throw new Error('Duplicate submission detected');
    }
  }

  private async calculateQuizResult(
    submission: QuizSubmission, 
    quiz: any
  ): Promise<StoredQuizResult> {
    // Import QuizService for calculations
    const { QuizService } = await import('../quiz.service');
    const quizService = new QuizService();

    // Calculate base results
    const passed = submission.score >= quiz.passingScore;
    const experience = Math.round(submission.score * 10);
    const tickets = passed ? Math.ceil(submission.score / 20) : 0;

    // Apply philosopher bonus
    let finalExperience = experience;
    if (submission.philosopherBonus) {
      finalExperience = Math.round(experience * submission.philosopherBonus.multiplier);
    }

    // Analyze performance
    const analysis = await quizService.analyzePerformance(
      submission.userId,
      submission.quizId,
      submission.answers
    );

    // Generate insights
    const insights = this.generatePhilosophicalInsights(submission, quiz, analysis);

    // Special rewards for perfect scores
    let newPhilosopher: string | undefined;
    if (submission.score === 100 && Object.values(submission.answers).length === quiz.questions.length) {
      newPhilosopher = await this.selectRewardPhilosopher(submission.userId, quiz.lessonId);
    }

    return {
      ...submission,
      id: this.generateResultId(),
      passed,
      experience: finalExperience,
      tickets,
      newPhilosopher,
      philosophicalInsights: insights,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendations: analysis.recommendations,
      philosophicalAlignment: analysis.philosophicalAlignment
    };
  }

  private async storeQuizResultWithTransaction(result: StoredQuizResult): Promise<StoredQuizResult> {
    const updates: Record<string, any> = {};
    
    // Store in user's quiz history
    updates[`${DB_PATHS.USERS}/${result.userId}/quizHistory/${result.id}`] = result;
    
    // Update user stats
    updates[`${DB_PATHS.USERS}/${result.userId}/stats/quizzesCompleted`] = admin.database.ServerValue.increment(1);
    updates[`${DB_PATHS.USERS}/${result.userId}/stats/totalTimeSpent`] = admin.database.ServerValue.increment(result.timeSpent);
    
    if (result.passed) {
      updates[`${DB_PATHS.USERS}/${result.userId}/stats/passedQuizzes`] = admin.database.ServerValue.increment(1);
    }
    
    if (result.score === 100) {
      updates[`${DB_PATHS.USERS}/${result.userId}/stats/perfectScores`] = admin.database.ServerValue.increment(1);
    }

    // Add experience and tickets
    updates[`${DB_PATHS.USERS}/${result.userId}/progression/experience`] = admin.database.ServerValue.increment(result.experience);
    updates[`${DB_PATHS.USERS}/${result.userId}/stats/gachaTickets`] = admin.database.ServerValue.increment(result.tickets);

    // Store global quiz attempt
    updates[`${DB_PATHS.ANALYTICS}/quizzes/${result.quizId}/attempts/${result.id}`] = {
      userId: result.userId,
      score: result.score,
      timeSpent: result.timeSpent,
      passed: result.passed,
      submittedAt: result.metadata.submittedAt
    };

    await batchWrite(updates);
    return result;
  }

  private async updateUserStatsAsync(userId: string, result: StoredQuizResult): Promise<void> {
    // Run in background without blocking main submission
    setTimeout(async () => {
      try {
        // Update user level if necessary
        await this.checkAndUpdateUserLevel(userId);
        
        // Update learning analytics
        await this.updateLearningAnalytics(userId, result);
      } catch (error) {
        console.error('Failed to update user stats:', error);
      }
    }, 0);
  }

  private async updateQuizAnalyticsAsync(quizId: string, result: StoredQuizResult): Promise<void> {
    setTimeout(async () => {
      try {
        const analyticsRef = this.db.ref(`${DB_PATHS.ANALYTICS}/quizzes/${quizId}`);
        
        await runTransaction(analyticsRef, (currentData) => {
          if (!currentData) {
            currentData = {
              totalAttempts: 0,
              averageScore: 0,
              averageTime: 0,
              passRate: 0,
              popularAnswers: {},
              difficultyDistribution: {},
              lastUpdated: Date.now()
            };
          }

          currentData.totalAttempts += 1;
          currentData.averageScore = (currentData.averageScore * (currentData.totalAttempts - 1) + result.score) / currentData.totalAttempts;
          currentData.averageTime = (currentData.averageTime * (currentData.totalAttempts - 1) + result.timeSpent) / currentData.totalAttempts;
          currentData.passRate = ((currentData.passRate * (currentData.totalAttempts - 1)) + (result.passed ? 1 : 0)) / currentData.totalAttempts;
          currentData.lastUpdated = Date.now();

          return currentData;
        });
      } catch (error) {
        console.error('Failed to update quiz analytics:', error);
      }
    }, 0);
  }

  private async storeOfflineSubmission(submission: QuizSubmission): Promise<void> {
    const offlinePath = `${DB_PATHS.USERS}/${submission.userId}/offlineSubmissions`;
    const submissionId = this.generateResultId();
    await this.create(`${offlinePath}/${submissionId}`, {
      ...submission,
      offlineStoredAt: Date.now()
    });
  }

  private generatePhilosophicalInsights(
    submission: QuizSubmission, 
    quiz: any, 
    analysis: any
  ): string[] {
    const insights: string[] = [];

    // Add insights based on performance
    if (submission.score >= 90) {
      insights.push("Your understanding demonstrates deep philosophical reasoning.");
    } else if (submission.score >= 70) {
      insights.push("You're developing solid philosophical intuitions.");
    } else {
      insights.push("Philosophy is about the journey of questioning - keep exploring!");
    }

    // Add insights based on philosophical alignment
    if (analysis.philosophicalAlignment) {
      insights.push(`Your reasoning aligns with ${analysis.philosophicalAlignment} philosophical traditions.`);
    }

    // Add insights for debate results
    if (submission.debateResults) {
      const wins = Object.values(submission.debateResults).filter(r => r.winner === 'user').length;
      if (wins > 0) {
        insights.push(`You demonstrated persuasive argumentation in ${wins} philosophical debate(s).`);
      }
    }

    return insights;
  }

  private async selectRewardPhilosopher(userId: string, lessonId?: string): Promise<string | undefined> {
    // Implementation for selecting reward philosopher based on lesson content
    // This would integrate with your existing gacha/philosopher system
    return undefined; // Placeholder
  }

  private generateResultId(): string {
    return `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async checkAndUpdateUserLevel(userId: string): Promise<void> {
    // Check if user should level up based on total experience
    const userRef = this.db.ref(`${DB_PATHS.USERS}/${userId}`);
    
    await runTransaction(userRef, (currentData) => {
      if (!currentData) return currentData;
      
      const experience = currentData.progression.experience;
      const newLevel = Math.floor(Math.sqrt(experience / 100)) + 1;
      
      if (newLevel > currentData.progression.level) {
        currentData.progression.level = newLevel;
        currentData.stats.gachaTickets += (newLevel - currentData.progression.level) * 2;
      }
      
      return currentData;
    });
  }

  private async updateLearningAnalytics(userId: string, result: StoredQuizResult): Promise<void> {
    // Update learning path analytics for adaptive difficulty
    const analyticsPath = `${DB_PATHS.ANALYTICS}/userLearning/${userId}`;
    const analytics = await this.read(analyticsPath) || {};
    
    analytics.recentScores = (analytics.recentScores || []).slice(-9);
    analytics.recentScores.push(result.score);
    analytics.lastQuizDate = result.metadata.submittedAt;
    analytics.conceptStrengths = result.strengths;
    analytics.conceptWeaknesses = result.weaknesses;
    
    await this.update(analyticsPath, analytics);
  }

  private handleSubmissionError(error: any, submission: QuizSubmission): Error {
    const errorMessage = `Quiz submission failed for user ${submission.userId}, quiz ${submission.quizId}: ${error.message}`;
    console.error(errorMessage, { submission, error });
    
    // Return user-friendly error
    if (error.message.includes('network')) {
      return new Error('Network error. Your quiz will be submitted when connection is restored.');
    } else if (error.message.includes('validation')) {
      return new Error('Invalid quiz data. Please try taking the quiz again.');
    } else {
      return new Error('Failed to submit quiz. Please try again.');
    }
  }
}