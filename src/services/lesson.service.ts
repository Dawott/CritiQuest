import admin from 'firebase-admin';
import axios from 'axios';
import { Lesson, LessonWithId } from '@/types/database.types';
import { ValidationService } from '../utils/schemas';

export class LessonService {
  private db = admin.database();
  private externalApiClient = axios.create({
    baseURL: process.env.EXTERNAL_API_URL,
    timeout: 10000,
  });

  async getLessons(userId: string, options?: {
    stage?: string;
    includeExternal?: boolean;
  }): Promise<LessonWithId[]> {
    const lessons: LessonWithId[] = [];
    
    const internalLessons = await this.getInternalLessons(options?.stage);
    lessons.push(...internalLessons);
    
    if (options?.includeExternal) {
      try {
        const externalLessons = await this.getExternalLessons();
        lessons.push(...externalLessons);
      } catch (error) {
        console.error('Błąd pobierania zewnętrznych:', error);
        // Internal only
      }
    }
    
    const enrichedLessons = await this.enrichWithProgress(lessons, userId);
    
    return enrichedLessons;
  }
  

//Firebase
  private async getInternalLessons(stage?: string): Promise<LessonWithId[]> {
    try {
      let snapshot;
      
      if (stage) {
        snapshot = await this.db.ref('lessons')
          .orderByChild('stage')
          .equalTo(stage)
          .once('value');
      } else {
        snapshot = await this.db.ref('lessons')
          .orderByChild('order')
          .once('value');
      }
      
      const lessonsData = snapshot.val() || {};
      
      const lessons: LessonWithId[] = Object.entries(lessonsData).map(([id, lesson]) => ({
        ...lesson as Lesson,
        id,
        source: 'internal' as const,
      }));

      return lessons.sort((a, b) => a.order - b.order);
      
    } catch (error) {
      console.error('Błąd fetchowania wewnętrznych lekcji:', error);
      return [];
    }
  }
  //OPCJONALNIE - Zewnętrzny dostawca
  private async getExternalLessons(): Promise<LessonWithId[]> {
    try {
      const response = await this.externalApiClient.get('/lessons', {
        params: {
          category: 'philosophy',
          language: 'pl',
        },
      });
      
      // Transformata
      return this.transformExternalLessons(response.data);
    } catch (error) {
      throw new Error('Zewnętrzny dostawca zawiódł');
    }
  }

  /**
   * Transformata
   */
  private transformExternalLessons(externalData: any[]): LessonWithId[] {
    return externalData.map(item => ({
      id: `external_${item.id}`,
      title: item.title,
      description: item.description,
      stage: this.mapExternalStage(item.level),
      order: 999, // Lekcje zewnętrzne
      difficulty: this.mapExternalDifficulty(item.difficulty),
      estimatedTime: item.duration || 20,
      philosophicalConcepts: item.tags || [],
      content: {
        sections: this.transformContent(item.content),
      },
      quiz: item.quizId,
      rewards: {
        experience: 50,
        gachaTickets: 1,
      },
      source: 'external',
      externalUrl: item.url,
    }));
  }

  /**
   * Utwórz nową lekcję - do wdrożenia
   */
  async createLesson(lessonData: Partial<Lesson>): Promise<string> {
    // Walidacja
    if (!ValidationService.validateLesson(lessonData)) {
      throw new Error('Błędne dane');
    }
    
    const newLessonRef = this.db.ref('lessons').push();
    await newLessonRef.set({
      ...lessonData,
      createdAt: admin.database.ServerValue.TIMESTAMP,
    });
    
    return newLessonRef.key!;
  }

  /*Do wdrożenia - AI do rekomendacji
   */
  async getRecommendations(userId: string): Promise<Lesson[]> {
    // Historia lekcji
    const userProgress = await this.getUserProgress(userId);
    
    // Pobierz kolekcję
    const userSnapshot = await this.db.ref(`users/${userId}`).once('value');
    const userData = userSnapshot.val();
    
    // Prosty algo do rekomendacji
    const recommendations = await this.calculateRecommendations({
      completedLessons: userProgress,
      userLevel: userData?.progression?.level || 1,
      philosopherCollection: userData?.philosopherCollection || {},
    });
    
    return recommendations;
  }

  /*Analityka
   */
  async completeLesson(userId: string, lessonId: string, data: {
    score: number;
    timeSpent: number;
    notes?: string;
  }): Promise<void> {
    const updates: Record<string, any> = {};
    
    // Update postępu
    updates[`users/${userId}/progression/completedLessons/${lessonId}`] = true;
    
    // Detale
    updates[`userProgress/${userId}/${lessonId}`] = {
      completedAt: admin.database.ServerValue.TIMESTAMP,
      score: data.score,
      timeSpent: data.timeSpent,
      notes: data.notes || null,
    };
    
    // Nagrody
    const lesson = await this.getLesson(lessonId);
    if (lesson) {
      updates[`users/${userId}/progression/experience`] = 
        admin.database.ServerValue.increment(lesson.rewards.experience);
      updates[`users/${userId}/stats/gachaTickets`] = 
        admin.database.ServerValue.increment(lesson.rewards.gachaTickets);
    }
    
    // Iwenty
    await this.trackAnalytics({
      event: 'lesson_completed',
      userId,
      lessonId,
      score: data.score,
      timeSpent: data.timeSpent,
    });
    
    await this.db.ref().update(updates);
  }

//Analityka lekcji
  async getLessonAnalytics(lessonId: string): Promise<{
    completionRate: number;
    averageScore: number;
    averageTime: number;
    difficultyRating: number;
  }> {
    const progressSnapshot = await this.db.ref('userProgress')
      .orderByChild(lessonId)
      .once('value');
    
    const allProgress = progressSnapshot.val() || {};
    let totalCompleted = 0;
    let totalScore = 0;
    let totalTime = 0;
    
    Object.values(allProgress).forEach((userProgress: any) => {
      if (userProgress[lessonId]) {
        totalCompleted++;
        totalScore += userProgress[lessonId].score || 0;
        totalTime += userProgress[lessonId].timeSpent || 0;
      }
    });
    
    return {
      completionRate: totalCompleted,
      averageScore: totalCompleted > 0 ? totalScore / totalCompleted : 0,
      averageTime: totalCompleted > 0 ? totalTime / totalCompleted : 0,
      difficultyRating: this.calculateDifficultyRating(totalScore, totalCompleted),
    };
  }

  // Helpery
 async getLesson(lessonId: string): Promise<Lesson | null> {
    const snapshot = await this.db.ref(`lessons/${lessonId}`).once('value');
    return snapshot.val();
  }

  private async getUserProgress(userId: string): Promise<any> {
    const snapshot = await this.db.ref(`userProgress/${userId}`).once('value');
    return snapshot.val() || {};
  }

  private async enrichWithProgress(lessons: LessonWithId[], userId: string): Promise<LessonWithId[]> {
    const userProgress = await this.getUserProgress(userId);
    
    return lessons.map(lesson => ({
      ...lesson,
      progress: userProgress[lesson.id] || null,
      isCompleted: !!userProgress[lesson.id]?.completedAt,
      isLocked: this.checkIfLocked(lesson, userProgress),
    }));
  }

  private checkIfLocked(lesson: Lesson, userProgress: any): boolean {
    // Unlock lekcji
    if (lesson.order === 1) return false;
// TBD - do skomplikowania 
    return false;
  }

  private mapExternalStage(level: string): string {
    const mapping: Record<string, string> = {
      'beginner': 'introduction',
      'intermediate': 'classical',
      'advanced': 'modern',
    };
    return mapping[level] || 'introduction';
  }

  private mapExternalDifficulty(diff: string): 'beginner' | 'intermediate' | 'advanced' {
    const mapping: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
      'easy': 'beginner',
      'medium': 'intermediate',
      'hard': 'advanced',
    };
    return mapping[diff] || 'beginner';
  }

  private transformContent(content: any): any[] {
    // Transformata z zewnątrz
    if (Array.isArray(content)) {
      return content.map((item, index) => ({
        type: item.type || 'text',
        content: item.text || item.content,
        order: index,
      }));
    }
    return [{
      type: 'text',
      content: content,
      order: 0,
    }];
  }

  private async calculateRecommendations(userData: any): Promise<Lesson[]> {
    // Logika rekomendacji
    const allLessons = await this.getInternalLessons();
    const completedIds = Object.keys(userData.completedLessons || {});
    
    return allLessons
      .filter(lesson => !completedIds.includes(lesson.id))
      .sort((a, b) => {
        // Priorytetyzacja aktualnego poziomu użytkownika
        const levelDiff = Math.abs(a.order - userData.userLevel);
        const levelDiffB = Math.abs(b.order - userData.userLevel);
        return levelDiff - levelDiffB;
      })
      .slice(0, 5);
  }

  private calculateDifficultyRating(avgScore: number, completions: number): number {
    if (completions === 0) return 3;
    
    // Scoring
    if (avgScore < 50) return 5;
    if (avgScore < 70) return 4;
    if (avgScore < 85) return 3;
    if (avgScore < 95) return 2;
    return 1;
  }

  private async trackAnalytics(data: any): Promise<void> {
    // Tracking analityki
    console.log('Analiza:', data);
  }

  async getFeaturedLessons(): Promise<LessonWithId[]> {
    try {
      const snapshot = await this.db.ref('lessons')
        .orderByChild('order')
        .limitToFirst(6)
        .once('value');
      
      const lessonsData = snapshot.val() || {};
      
      const lessons: LessonWithId[] = Object.entries(lessonsData).map(([id, lesson]) => ({
        ...lesson as Lesson,
        id,
        source: 'internal',
      }));

      const featuredLessons = lessons.filter(lesson => 
        lesson.difficulty === 'beginner' || 
        lesson.stage === 'introduction' ||
        lesson.order <= 3
      );

      return featuredLessons
        .sort((a, b) => a.order - b.order)
        .slice(0, 4);
        
    } catch (error) {
      console.error('Błąd przy pobieraniu lekcji featured:', error);
      return [];
    }
  }
}