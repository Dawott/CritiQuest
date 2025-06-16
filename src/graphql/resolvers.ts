import EnhancedLessonService from '../services/lesson.service';
import { GraphQLContext } from './context';


export const resolvers = {
   Query: {


    lessons: async (parent: any, args: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      const result = await context.services.lessons.getLessons(
        context.userId!,
        args.filters || {},
        { limit: args.limit || 20 }
      );
      
      return result.lessons;
    },

    lesson: async (parent: any, args: any, context: GraphQLContext) => {
      const lesson = await context.services.lessons.getLesson(args.id, context.userId);
      return lesson;
    },

    recommendations: async (parent: any, args: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      return context.services.lessons.getRecommendations(context.userId!);
    },
  },

  Mutation: {
    completeLesson: async (parent: any, args: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      
      return context.services.lessons.completeLesson(
        context.userId!,
        args.lessonId,
        args.completion
      );
    },
  },

  Subscription: {
    lessonProgress: {
      subscribe: async (parent: any, args: any, context: GraphQLContext) => {
        if (!context.user) {
          throw new Error('Authentication required');
        }
// return context.pubsub.asyncIterator(`LESSON_PROGRESS_${args.lessonId}`);
      },
    },
  },

  DateTime: {
    serialize: (date: number) => new Date(date).toISOString(),
    parseValue: (value: string) => new Date(value).getTime(),
    parseLiteral: (ast: any) => new Date(ast.value).getTime(),
  },
};