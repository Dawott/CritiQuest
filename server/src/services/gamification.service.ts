import { string } from 'zod';
import DatabaseService from '../../../client/src/services/firebase/database.service';
import { Achievement, AchievementProgress } from '../../../shared/types/database.types';

interface DebateResult {
  winner: 'user' | 'opponent';
  totalRounds: number;
  conviction_score: number;
  learning_insights: string[];
  philosophical_growth: { concept: string; understanding: number }[];
}

export class GamificationService {

  
async addExperience(userId: string, amount: number): Promise<{
    newLevel: number;
    leveledUp: boolean;
    newExperience: number;
    rewards?: {
      gachaTickets: number;
      unlockedFeatures: string[];
    };
  }> {
    try {
      const user = await DatabaseService.getUser(userId);
      if (!user) throw new Error('User not found');

      const currentLevel = user.progression.level;
      const currentExp = user.progression.experience;
      const newTotalExp = currentExp + amount;

      const newLevel = Math.floor(Math.sqrt(newTotalExp / 100)) + 1;
      const leveledUp = newLevel > currentLevel;
      const updates: any = {
        [`users/${userId}/progression/experience`]: newTotalExp,
        [`users/${userId}/progression/level`]: newLevel,
        [`users/${userId}/profile/lastActive`]: Date.now(),
      };

      let rewards;
      if (leveledUp) {
        const levelsGained = newLevel - currentLevel;
        const gachaTickets = levelsGained * 2; 
        
        updates[`users/${userId}/stats/gachaTickets`] = user.stats.gachaTickets + gachaTickets;

        const unlockedFeatures = this.checkFeatureUnlocks(newLevel);
        
        rewards = {
          gachaTickets,
          unlockedFeatures
        };

        updates[`analytics/levelUps/${userId}/${Date.now()}`] = {
          fromLevel: currentLevel,
          toLevel: newLevel,
          experienceAdded: amount,
          timestamp: Date.now()
        };
      }

      await DatabaseService.batchUpdate(updates);

      return {
        newLevel,
        leveledUp,
        newExperience: newTotalExp,
        rewards
      };

    } catch (error) {
      console.error('Failed to add experience:', error);
      throw new Error('Failed to update user experience');
    }
  }

  async checkAchievement(
    userId: string, 
    achievementId: string, 
    context?: any
  ): Promise<{
    unlocked: boolean;
    achievement?: Achievement;
    wasAlreadyUnlocked: boolean;
  }> {
    try {
      const user = await DatabaseService.getUser(userId);
      if (!user) throw new Error('User not found');

      const existingAchievement = user.achievements[achievementId];
      if (existingAchievement) {
        return { 
          unlocked: false, 
          wasAlreadyUnlocked: true 
        };
      }

      const achievementDef = await this.getAchievementDefinition(achievementId);
      if (!achievementDef) {
        console.warn(`Achievement definition not found: ${achievementId}`);
        return { unlocked: false, wasAlreadyUnlocked: false };
      }

      const criteriaCheck = await this.checkAchievementCriteria(userId, achievementDef, context);
      
      if (criteriaCheck.met) {
        const achievement: AchievementProgress = {
          achievementId: achievementId,
          currentValue: 100,
          targetValue: 100,
          completed: true,
          viewed: false,
          unlockedAt: Date.now(),
          progress:100
        };

        const updates = {
          [`users/${userId}/achievements/${achievementId}`]: achievement,
          [`analytics/achievements/${achievementId}/${userId}`]: {
            unlockedAt: Date.now(),
            context: context || {}
          }
        };

        if (achievementDef.rewards) {
          if (achievementDef.rewards.experience > 0) {
            updates[`users/${userId}/progression/experience`] = user.progression.experience + achievementDef.rewards.experience;
          }
          if (achievementDef.rewards.gachaTickets > 0) {
            updates[`users/${userId}/stats/gachaTickets`] = user.stats.gachaTickets + achievementDef.rewards.gachaTickets;
          }
        }

        await DatabaseService.batchUpdate(updates);

        return {
          unlocked: true,
          achievement: achievementDef,
          wasAlreadyUnlocked: false
        };
      }

      return { unlocked: false, wasAlreadyUnlocked: false };

    } catch (error) {
      console.error('Failed to check achievement:', error);
      return { unlocked: false, wasAlreadyUnlocked: false };
    }
  }

  private async updateUserDifficulty(userId: string, difficultyMultiplier: number): Promise<void> {
    try {
      const updates = {
        [`users/${userId}/preferences/adaptiveDifficulty`]: {
          multiplier: difficultyMultiplier,
          lastAdjusted: Date.now(),
          adjustmentReason: difficultyMultiplier > 1 ? 'performance_high' : difficultyMultiplier < 1 ? 'performance_low' : 'performance_balanced'
        }
      };

      await DatabaseService.batchUpdate(updates);
    } catch (error) {
      console.error('Failed to update user difficulty:', error);
    }
  }

  //Dynamiczna trudność
  async adjustDifficulty(
    userId: string,
    recentPerformance: number[]
  ): Promise<{
    newDifficulty: number;
    reasoning: string;
  }> {
    const avgPerformance = recentPerformance.reduce((a, b) => a + b) / recentPerformance.length;
    
    let newDifficulty: number;
    let reasoning: string;

    if (avgPerformance > 85) {
      newDifficulty = 1.2; 
      reasoning = "Wysoka skuteczność! Zwiększam trudność.";
    } else if (avgPerformance < 60) {
      newDifficulty = 0.8; 
      reasoning = "Poćwicz jeszcze więcej.";
    } else {
      newDifficulty = 1.0;
      reasoning = "Dobra robota! Utrzymujemy tempo.";
    }
    
    // Update ustawień trudności
    await this.updateUserDifficulty(userId, newDifficulty);

    return { newDifficulty, reasoning };
  }

private checkFeatureUnlocks(level: number): string[] {
    const unlocks: string[] = [];
  const featureUnlocks = new Map<number, string>([
    [5, 'debate_mode'],
    [10, 'advanced_analytics'],
    [15, 'custom_quizzes'],
    [20, 'philosopher_teams'],
    [25, 'daily_challenges'],
    [30, 'leaderboards']
  ]);
  
  const feature = featureUnlocks.get(level);
  if (feature) {
    unlocks.push(feature);
  }
    return unlocks;
  }

  //Achieve
private achievementCache: Map<string, any> = new Map();

  private async getAchievementDefinition(achievementId: string): Promise<any> {
    if (this.achievementCache.has(achievementId)) {
    return this.achievementCache.get(achievementId);
  }

  try {
    const achievement = await DatabaseService.read(`achievements/${achievementId}`);
    
    // Cache the result
    if (achievement) {
      this.achievementCache.set(achievementId, achievement);
    }
    
    return achievement;
  } catch (error) {
    console.error(`Failed to fetch achievement definition for ${achievementId}:`, error);
    return null;
  }
  }

  private async checkAchievementCriteria(
    userId: string, 
    achievementDef: any, 
    context: any
  ): Promise<{ met: boolean; progress?: number }> {
    try {
      const { criteria } = achievementDef;

      switch (criteria.type) {
        case 'perfect_score':
          return { 
            met: context?.quizResult?.score === 100,
            progress: context?.quizResult?.score || 0
          };

        case 'time_limit':
          return { 
            met: context?.quizResult?.timeSpent <= criteria.maxTime,
            progress: Math.max(0, 100 - ((context?.quizResult?.timeSpent / criteria.maxTime) * 100))
          };

        case 'debate_wins':
          const debateWins = context?.quizResult?.debateResults ? 
            Object.values(context.quizResult.debateResults).filter((r: any) => r.winner === 'user').length : 0;
          return { 
            met: debateWins >= criteria.minWins,
            progress: (debateWins / criteria.minWins) * 100
          };

        case 'collection_count':
          const user = await DatabaseService.getUser(userId);
          const collectionCount = Object.keys(user?.philosopherCollection || {}).length;
          return { 
            met: collectionCount >= criteria.minCount,
            progress: (collectionCount / criteria.minCount) * 100
          };

        case 'daily_streak':
          const userStats = await DatabaseService.getUser(userId);
          const currentStreak = userStats?.stats?.streakDays || 0;
          return { 
            met: currentStreak >= criteria.minDays,
            progress: (currentStreak / criteria.minDays) * 100
          };

        default:
          console.warn(`Unknown achievement criteria type: ${criteria.type}`);
          return { met: false, progress: 0 };
      }
    } catch (error) {
      console.error('Failed to check achievement criteria:', error);
      return { met: false, progress: 0 };
    }
  }

  async processQuizCompletion(
    userId: string,
    quizData: {
      score: number;
      experience: number;
      perfectScore: boolean;
      timeBonus: boolean;
      streakBonus: boolean;
    }
  ): Promise<{
    experienceResult: any;
    achievementsUnlocked: string[];
    leveledUp: boolean;
  }> {
    try {
      const experienceResult = await this.addExperience(userId, quizData.experience);

      const achievementsUnlocked: string[] = [];

      if (quizData.perfectScore) {
        const result = await this.checkAchievement(userId, 'perfect_quiz', { quizResult: { score: 100 } });
        if (result.unlocked) achievementsUnlocked.push('perfect_quiz');
      }

      if (quizData.timeBonus) {
        const result = await this.checkAchievement(userId, 'speed_thinker', { quizResult: { timeSpent: 250 } });
        if (result.unlocked) achievementsUnlocked.push('speed_thinker');
      }

      const collectionResult = await this.checkAchievement(userId, 'philosopher_collector');
      if (collectionResult.unlocked) achievementsUnlocked.push('philosopher_collector');

      await this.updateDailyStreak(userId);
      const streakResult = await this.checkAchievement(userId, 'weekly_streak');
      if (streakResult.unlocked) achievementsUnlocked.push('weekly_streak');

      return {
        experienceResult,
        achievementsUnlocked,
        leveledUp: experienceResult.leveledUp
      };

    } catch (error) {
      console.error('Failed to process quiz completion:', error);
      return {
        experienceResult: { newLevel: 1, leveledUp: false, newExperience: 0 },
        achievementsUnlocked: [],
        leveledUp: false
      };
    }
  }

  // Daily streak
  private async updateDailyStreak(userId: string): Promise<void> {
    try {
      const user = await DatabaseService.getUser(userId);
      if (!user) return;

      const now = Date.now();
      const lastUpdate = user.stats.lastStreakUpdate || 0;
      const dayInMs = 24 * 60 * 60 * 1000;
      const daysSinceLastUpdate = Math.floor((now - lastUpdate) / dayInMs);

      let newStreak = user.stats.streakDays || 0;

      if (daysSinceLastUpdate === 1) {
        newStreak += 1;
      } else if (daysSinceLastUpdate > 1) {
        newStreak = 1;
      }

      const updates = {
        [`users/${userId}/stats/streakDays`]: newStreak,
        [`users/${userId}/stats/lastStreakUpdate`]: now
      };

      await DatabaseService.batchUpdate(updates);
    } catch (error) {
      console.error('Failed to update daily streak:', error);
    }
  }

  // Update learning path
  async updateLearningPath(userId: string, learningData: {
    strengths: string[];
    weaknesses: string[];
    lastQuizScore: number;
    recommendedTopics: string[];
    philosophicalAlignment: string;
  }): Promise<void> {
    try {
      const userHistory = await DatabaseService.getUserQuizHistory(userId, 10);
      const updates = {
        [`users/${userId}/learningAnalytics`]: {
          ...learningData,
          lastUpdated: Date.now(),
          learningVelocity: this.calculateLearningVelocityFromScore(
      learningData.lastQuizScore, 
      userHistory
    ),
          adaptiveDifficulty: await this.getRecommendedDifficulty(userId, learningData.lastQuizScore)
        }
      };

      await DatabaseService.batchUpdate(updates);
    } catch (error) {
      console.error('Failed to update learning path:', error);
    }
  }

  // Predkosc nauki
  public calculateEnhancedMetrics(quizHistory: any[]): {
  learningVelocity: number;
  conceptMastery: Record<string, number>;
  philosophicalConsistency: number;
  difficultyReadiness: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  engagementScore: number;
  timeEfficiency: number;
  streakAnalysis: {
    currentStreak: number;
    longestStreak: number;
    streakTrend: 'improving' | 'stable' | 'declining';
  };
} {
  if (quizHistory.length === 0) {
    return {
      learningVelocity: 0,
      conceptMastery: {},
      philosophicalConsistency: 0,
      difficultyReadiness: 'beginner',
      engagementScore: 0,
      timeEfficiency: 0,
      streakAnalysis: {
        currentStreak: 0,
        longestStreak: 0,
        streakTrend: 'stable'
      }
    };
  }

  // Learning Velocity - improvement rate over time
  const learningVelocity = this.calculateLearningVelocity(quizHistory);
  
  // Concept Mastery - performance by philosophical concept
  const conceptMastery = this.calculateConceptMastery(quizHistory);
  
  // Philosophical Consistency - how consistent user's philosophical alignment is
  const philosophicalConsistency = this.calculatePhilosophicalConsistency(quizHistory);
  
  // Difficulty Readiness - suggest next difficulty level
  const difficultyReadiness = this.calculateDifficultyReadiness(quizHistory);
  
  // Engagement Score - overall engagement level (0-100)
  const engagementScore = this.calculateEngagementScore(quizHistory);
  
  // Time Efficiency - how efficiently user answers questions
  const timeEfficiency = this.calculateTimeEfficiency(quizHistory);
  
  // Streak Analysis - performance consistency patterns
  const streakAnalysis = this.calculateStreakAnalysis(quizHistory);

  return {
    learningVelocity,
    conceptMastery,
    philosophicalConsistency,
    difficultyReadiness,
    engagementScore,
    timeEfficiency,
    streakAnalysis
  };
}

// Helper
private calculateLearningVelocity(history: any[]): number {
  if (history.length < 2) return 0;
  
  const recentQuizzes = history.slice(-5); // Ostatnie 5 quizów
  const earlierQuizzes = history.slice(0, Math.min(5, history.length - 5));
  
  const recentAvg = recentQuizzes.reduce((sum, q) => sum + q.score, 0) / recentQuizzes.length;
  const earlierAvg = earlierQuizzes.length > 0 
    ? earlierQuizzes.reduce((sum, q) => sum + q.score, 0) / earlierQuizzes.length 
    : recentAvg;
  
  return Math.max(0, recentAvg - earlierAvg); 
}

private calculateConceptMastery(history: any[]): Record<string, number> {
  const conceptScores: Record<string, number[]> = {};
  
  history.forEach(quiz => {
    // conceptScores ALBO ekstrakcja z quizów
    if (quiz.conceptAnalysis) {
      Object.entries(quiz.conceptAnalysis).forEach(([concept, score]) => {
        if (!conceptScores[concept]) conceptScores[concept] = [];
        conceptScores[concept].push(score as number);
      });
    }
  });
  
  const mastery: Record<string, number> = {};
  Object.entries(conceptScores).forEach(([concept, scores]) => {
    // Calculate mastery as weighted average (recent scores matter more)
    const weights = scores.map((_, i) => i + 1); // Zwiększenie wagi linearne
    const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    mastery[concept] = Math.round(weightedSum / totalWeight);
  });
  
  return mastery;
}

private calculatePhilosophicalConsistency(history: any[]): number {
  const alignments = history
    .map(quiz => quiz.philosophicalAlignment)
    .filter(alignment => alignment);
  
  if (alignments.length < 2) return 0;
  
  // Calculate how often the same alignment appears
  const alignmentCounts: Record<string, number> = {};
  alignments.forEach(alignment => {
    alignmentCounts[alignment] = (alignmentCounts[alignment] || 0) + 1;
  });
  
  const maxCount = Math.max(...Object.values(alignmentCounts));
  return Math.round((maxCount / alignments.length) * 100);
}

private calculateDifficultyReadiness(history: any[]): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  const recentScores = history.slice(-3).map(q => q.score);
  const avgRecent = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
  if (avgRecent >= 85) return 'expert';
  if (avgRecent >= 70) return 'advanced';
  if (avgRecent >= 50) return 'intermediate';
  return 'beginner';
}

private calculateEngagementScore(history: any[]): number {
  let score = 0;
  
  // Kompletność (40% of score)
  const completionRate = history.filter(q => q.completed).length / history.length;
  score += completionRate * 40;
  
  // Ostatnia aktywność (30% of score)
  const recentQuizzes = history.filter(q => 
    Date.now() - q.timestamp < 7 * 24 * 60 * 60 * 1000 // Ostatnie 7 dni
  );
  const activityScore = Math.min(recentQuizzes.length / 3, 1) * 30; // 3 quizy / tydzień
  score += activityScore;
  
  // Trendy
  const performanceScore = this.calculateLearningVelocity(history) * 3; // Skala prędkości
  score += Math.min(performanceScore, 30);
  
  return Math.round(Math.min(score, 100));
}

private calculateTimeEfficiency(history: any[]): number {
  if (history.length === 0) return 0;
  
  const efficiencyScores = history.map(quiz => {
    if (!quiz.timeLimit || !quiz.timeSpent) return 0;
    
    // Efektywność - punkty/minutę
    const timeRatio = quiz.timeSpent / (quiz.timeLimit * 60);
    return quiz.score / timeRatio;
  }).filter(score => score > 0);
  
  if (efficiencyScores.length === 0) return 0;
  
  return Math.round(
    efficiencyScores.reduce((sum, score) => sum + score, 0) / efficiencyScores.length
  );
}

private calculateLearningVelocityFromScore(
  currentScore: number, 
  userHistory?: any[]
): number {
  if (!userHistory || userHistory.length === 0) {
    return Math.max(0, currentScore - 70); // 70 = baseline
  }
  
  // Użyj ostatnich wyników do oceny trendów
  const recentScores = userHistory.slice(-3).map(q => q.score);
  const avgRecent = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
  
  return Math.max(0, currentScore - avgRecent);
}

private calculateStreakAnalysis(history: any[]): {
  currentStreak: number;
  longestStreak: number;
  streakTrend: 'improving' | 'stable' | 'declining';
} {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  // Streaki na podstawie zaliczonych testów (assumed 70+)
  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
  
  for (let i = sortedHistory.length - 1; i >= 0; i--) {
    if (sortedHistory[i].score >= 70) {
      if (i === sortedHistory.length - 1) currentStreak++;
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      if (i === sortedHistory.length - 1) currentStreak = 0;
      tempStreak = 0;
    }
  }
  
  
  // Performance a trendy
  const recentAvg = history.slice(-3).reduce((sum, q) => sum + q.score, 0) / Math.min(history.length, 3);
  const olderAvg = history.slice(-6, -3).reduce((sum, q) => sum + q.score, 0) / Math.min(history.length - 3, 3);
  
  let streakTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recentAvg > olderAvg + 5) streakTrend = 'improving';
  else if (recentAvg < olderAvg - 5) streakTrend = 'declining';
  
  return {
    currentStreak,
    longestStreak,
    streakTrend
  };
}

  // Rekomendacja trudności
  private async getRecommendedDifficulty(userId: string, lastScore: number): Promise<{
    current: 'beginner' | 'intermediate' | 'advanced';
    confidence: number;
  }> {
    try {
      const recentQuizzes = await DatabaseService.getUserQuizHistory(userId, 5);
      const averageScore = recentQuizzes.length > 0 
        ? recentQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / recentQuizzes.length
        : lastScore;

      let difficulty: 'beginner' | 'intermediate' | 'advanced';
      let confidence: number;

      if (averageScore >= 85) {
        difficulty = 'advanced';
        confidence = Math.min(100, (averageScore - 85) * 6.67); 
      } else if (averageScore >= 65) {
        difficulty = 'intermediate';
        confidence = Math.min(100, (averageScore - 65) * 5); 
      } else {
        difficulty = 'beginner';
        confidence = Math.max(0, 100 - ((65 - averageScore) * 2)); 
      }

      return { current: difficulty, confidence };
    } catch (error) {
      console.error('Failed to get recommended difficulty:', error);
      return { current: 'intermediate', confidence: 50 };
    }
  }

  //Dailies - na razie off - do wdrożenia w przyszłości
/*
  async generateDailyChallenge(): Promise<{
    type: 'dilemma' | 'paradox' | 'thought_experiment';
    title: string;
    description: string;
    philosopherPerspectives: Record<string, string>;
    rewards: {
      experience: number;
      tickets: number;
      specialPhilosopher?: string;
    };
  }> {
    const challengeTypes = ['dilemma', 'paradox', 'thought_experiment'];
    const type = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];

    // Generuj na bazie typu
    const challenge = await this.createChallenge(type);
    
    // Spojrzenie z innej szkoły
    const perspectives = await this.gatherPhilosopherPerspectives(challenge);

    return {
      type,
      ...challenge,
      philosopherPerspectives: perspectives,
      rewards: this.calculateChallengeRewards(type),
    };
  }

  private async createChallenge(type:string): Promise<any>
  {
    const challenges = {
      'dilemma': {
      title: 'Problem Wagonika',
      description: 'Problem Wagonika'
    },
    'paradox': {
      title: 'Statek Tezeusza',
      description: 'Statek Tezeusza'
    },
    'thought_experiment': {
      title: 'Chiński Pokój',
      description: 'Chiński Pokój'
    }
    };
    return challenges[type] || challenges['dilemma'];
  }

  private async gatherPhilosopherPerspectives(challenge: any): Promise<Record<string, string>> {
  return {
    'kant': 'From a deontological perspective...',
    'mill': 'A utilitarian would consider...',
    'aristotle': 'Virtue ethics suggests...'
  };
}

private calculateChallengeRewards(type: string): any {
  const baseRewards = {
    experience: 75,
    tickets: 1
  };

  if (type === 'thought_experiment') {
    baseRewards.experience += 25; 
  }

  return baseRewards;
}*/

  //Synergie

  calculatePhilosopherSynergy(
    team: string[]
  ): {
    synergies: Array<{
      philosophers: string[];
      bonus: string;
      multiplier: number;
    }>;
    totalBonus: number;
  } {
    const synergies = [];
    
    // PRzykłady
    if (team.includes('plato') && team.includes('aristotle')) {
      synergies.push({
        philosophers: ['plato', 'aristotle'],
        bonus: 'Mistrz i Student',
        multiplier: 1.5,
      });
    }

    if (team.filter(p => ['kant', 'hegel', 'nietzsche'].includes(p)).length >= 2) {
      synergies.push({
        philosophers: team.filter(p => ['kant', 'hegel', 'nietzsche'].includes(p)),
        bonus: 'Idealizm Niemiecki',
        multiplier: 1.3,
      });
    }

    const totalBonus = synergies.reduce((acc, s) => acc * s.multiplier, 1);
    
    return { synergies, totalBonus };
  }

  
}
