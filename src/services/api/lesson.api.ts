import apiClient from './client';
import { Lesson, LessonProgress } from '@/types/database.types';

export class LessonAPI {
  static async getLessons(options?: {
    stage?: string;
    includeExternal?: boolean;
  }): Promise<Lesson[]> {
    const params = new URLSearchParams();
    if (options?.stage) params.append('stage', options.stage);
    if (options?.includeExternal) params.append('includeExternal', 'true');

    return apiClient.get<Lesson[]>(`/lessons?${params}`);
  }

  static async getLesson(lessonId: string): Promise<Lesson> {
    return apiClient.get<Lesson>(`/lessons/${lessonId}`);
  }

  static async completeLesson(
    lessonId: string,
    data: {
      score: number;
      timeSpent: number;
      notes?: string;
    }
  ): Promise<void> {
    return apiClient.post(`/lessons/${lessonId}/complete`, data);
  }

  static async getRecommendations(): Promise<Lesson[]> {
    return apiClient.get<Lesson[]>('/lessons/recommendations');
  }
}
