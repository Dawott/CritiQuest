import { createYoga } from 'graphql-yoga';
import { useResponseCache } from '@graphql-yoga/plugin-response-cache';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { createServer } from 'http';
import { Express } from 'express';
import admin from 'firebase-admin';
import { schema } from './schema.ts';
import EnhancedLessonService from '../services/lesson.service';
import { AppError, ErrorType } from '@/middleware/error.middleware.ts';
import { GraphQLError } from 'graphql';

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

const customMaskedErrors = (error: GraphQLError, message: string, isDev: boolean) => {
  console.error('GraphQL Error:', {
    message: error.message,
    locations: error.locations,
    path: error.path,
    originalError: error.originalError,
    timestamp: new Date().toISOString(),
  });

  // If it's our custom AppError, preserve the structure
  if (error.originalError instanceof AppError) {
    return new GraphQLError(error.originalError.message, {
      nodes: error.nodes,
      source: error.source,
      positions: error.positions,
      path: error.path,
      originalError: error.originalError,
      extensions: {
        type: error.originalError.type,
        statusCode: error.originalError.statusCode,
        ...(error.originalError.details && { details: error.originalError.details }),
        ...(isDev && { stack: error.originalError.stack }),
      },
    });
  }

  // Handle authentication errors
  if (error.message.includes('Authentication') || error.message.includes('wymagane uwierzytelnienie')) {
    return new GraphQLError('Wymagane uwierzytelnienie', {
      nodes: error.nodes,
      source: error.source,
      positions: error.positions,
      path: error.path,
      extensions: {
        type: ErrorType.AUTHENTICATION,
        statusCode: 401,
        ...(isDev && { originalMessage: error.message }),
      },
    });
  }

  // Handle validation errors
  if (error.message.includes('Validation') || error.message.includes('Invalid')) {
    return new GraphQLError('Błędy walidacji', {
      nodes: error.nodes,
      source: error.source,
      positions: error.positions,
      path: error.path,
      extensions: {
        type: ErrorType.VALIDATION,
        statusCode: 400,
        ...(isDev && { originalMessage: error.message }),
      },
    });
  }

  return new GraphQLError(
    isDev ? error.message : 'Wystąpił nieoczekiwany błąd',
    {
      nodes: error.nodes,
      source: error.source,
      positions: error.positions,
      path: error.path,
      extensions: {
        type: ErrorType.INTERNAL,
        statusCode: 500,
        ...(isDev && { originalMessage: error.message, stack: error.stack }),
      },
    }
  );
};

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
    cors: false,
    /*cors: {
      origin: process.env.CLIENT_URL || ['http://localhost:8081', 'http://localhost:3000'],
      credentials: true,
    },*/
  });

  return yoga;
};

export function createGraphQLWebSocketServer(
  httpServer: any,
  yoga: any,
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

export const graphqlAsyncHandler = (resolver: any) => {
  return async (parent: any, args: any, context: any, info: any) => {
    try {
      return await resolver(parent, args, context, info);
    } catch (error) {
      if (error instanceof AppError) {
        throw new GraphQLError(error.message, {
          originalError: error,
          extensions: {
            code: error.type,
            statusCode: error.statusCode,
            details: error.details,
          },
        });
      }
      
      throw error;
    }
  };
};