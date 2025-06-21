import admin from 'firebase-admin';
import EnhancedLessonService from '../services/lesson.service';

export interface GraphQLContext {
  user?: admin.auth.DecodedIdToken;
  userId?: string;
  services: {
    lessons: typeof EnhancedLessonService;
    // TBD
  };
  isAuthenticated: boolean;
}

export function createContext(request: Request): Promise<GraphQLContext> {
  // yogaServer.ts
  throw new Error('Use createGraphQLYoga() instead');
}