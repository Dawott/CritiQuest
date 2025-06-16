import { createYoga } from 'graphql-yoga';
import { useResponseCache } from '@graphql-yoga/plugin-response-cache';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { createServer } from 'http';
import { Express } from 'express';
import admin from 'firebase-admin';
import { schema } from './schema.ts';
import EnhancedLessonService from '../services/lesson.service';

interface YogaContext {
  user?: admin.auth.DecodedIdToken | null;
  userId?: string;
  services: {
    lessons: typeof EnhancedLessonService;
    // serwisy
  };
  pubsub?: any;
}

async function getUserFromToken(authorization?: string | null): Promise<admin.auth.DecodedIdToken | null> {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authorization.split('Bearer ')[1];
    return await admin.auth().verifyIdToken(token);
  } catch (error) {
    console.error('JWT weryfikacja nieudana:', error);
    return null;
  }
}

export const createGraphQLYoga = () => {
  const yoga = createYoga<{}, YogaContext>({
    schema, 
    
    
    plugins: [
      useResponseCache({
        session: (request) => {
          const authorization = request.headers.get('authorization');
          return authorization ? authorization.split(' ')[1] : null;
        },
        ttl: 300_000, // 5 minut
        includeExtensionMetadata: true,
      }),
    ],

    context: async ({ request }): Promise<YogaContext> => {
      const authorization = request.headers.get('authorization');
      const user = await getUserFromToken(authorization);
      return {
        user,
        userId: user?.uid,
        services: {
          lessons: EnhancedLessonService,
          //philosophers: PhilosopherService,
        },
      };
    },

    graphiql: {
      title: 'CritiQuest GraphQL API',
      defaultQuery: `
        # Welcome to CritiQuest GraphQL API
        # Try these example queries:
        
        query GetLessons {
          lessons(filters: { difficulty: BEGINNER }) {
            id
            title
            difficulty
            philosophicalConcepts
            estimatedTime
          }
        }
        
        query GetRecommendations {
          recommendations {
            id
            title
            stage
          }
        }
      `,
    },

    maskedErrors: process.env.NODE_ENV === 'production',
    
    cors: {
      origin: process.env.CLIENT_URL || ['http://localhost:8081', 'http://localhost:3000'],
      credentials: true,
    },
  });

  return yoga;
};

export function createGraphQLWebSocketServer(
  httpServer: any,
  yoga: ReturnType<typeof createYoga>
) {
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        const authorization = ctx.connectionParams?.authorization as string;
        const user = await getUserFromToken(authorization);
        
        return {
          user,
          userId: user?.uid,
          services: {
            lessons: EnhancedLessonService,
          },
        };
      },
    },
    wsServer
  );

  return { wsServer, serverCleanup };
}