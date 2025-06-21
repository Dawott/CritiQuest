import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLInt, GraphQLBoolean } from 'graphql';
import { GraphQLDateTime } from 'graphql-iso-date';

const PhilosopherType = new GraphQLObjectType({
  name: 'Philosopher',
  fields: () => ({
    id: { type: GraphQLString },
    name: { type: GraphQLString },
    era: { type: GraphQLString },
    school: { type: GraphQLString },
    rarity: { type: GraphQLString },
    imageUrl: { type: GraphQLString },
    quotes: { type: new GraphQLList(GraphQLString) },

  }),
});

const LessonType = new GraphQLObjectType({
  name: 'Lesson',
  fields: () => ({
    id: { type: GraphQLString },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    stage: { type: GraphQLString },
    difficulty: { type: GraphQLString },
    estimatedTime: { type: GraphQLInt },
    philosophicalConcepts: { type: new GraphQLList(GraphQLString) },
    isCompleted: { type: GraphQLBoolean },
    progress: { type: GraphQLInt },

    requiredPhilosopher: {
      type: PhilosopherType,
      resolve: async (lesson, args, context) => {
        if (!lesson.requiredPhilosopherId) return null;
        return context.services.philosophers?.getById?.(lesson.requiredPhilosopherId) || null;
      },
    },
  }),
});

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {

    lessons: {
      type: new GraphQLList(LessonType),
      args: {
        stage: { type: GraphQLString },
        includeExternal: { type: GraphQLBoolean },
      },
      resolve: async (_, args, context) => {
        if (!context.user) {
          throw new Error('Authentication required');
        }
        
        const result = await context.services.lessons.getLessons(
          context.userId!,
          { 
            stage: args.stage,
            // includeExternal: args.includeExternal 
          }
        );
        
        return result.lessons;
      },
    },

    lesson: {
      type: LessonType,
      args: {
        id: { type: GraphQLString },
      },
      resolve: async (_, { id }, context) => {

        return context.services.lessons.getLesson(id, context.userId);
      },
    },

    philosophers: {
      type: new GraphQLList(PhilosopherType),
      args: {
        rarity: { type: GraphQLString },
        owned: { type: GraphQLBoolean },
      },
      resolve: async (_, args, context) => {

        return [];
      },
    },

    recommendedLessons: {
      type: new GraphQLList(LessonType),
      resolve: async (_, __, context) => {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        return context.services.lessons.getRecommendations(context.userId!);
      },
    },
  },
});

const MutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    completeLesson: {
      type: LessonType,
      args: {
        lessonId: { type: GraphQLString },
        score: { type: GraphQLInt },
        timeSpent: { type: GraphQLInt },
      },
      resolve: async (_, args, context) => {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        await context.services.lessons.completeLesson(
          context.userId!,
          args.lessonId,
          {
            score: args.score,
            timeSpent: args.timeSpent,
          }
        );
        
        return context.services.lessons.getLesson(args.lessonId, context.userId);
      },
    },

    pullGacha: {
      type: new GraphQLList(PhilosopherType),
      args: {
        poolId: { type: GraphQLString },
        count: { type: GraphQLInt },
      },
      resolve: async (_, args, context) => {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        return [];
      },
    },
  },
});

// Subscription Type (works the same way)
const SubscriptionType = new GraphQLObjectType({
  name: 'Subscription',
  fields: {
    lessonProgress: {
      type: LessonType,
      args: {
        lessonId: { type: GraphQLString },
      },
      subscribe: async (_, { lessonId }, context) => {

        throw new Error('Subscriptions not implemented yet');
      },
    },
  },
});

export const schema = new GraphQLSchema({
  query: QueryType,
  mutation: MutationType,
  subscription: SubscriptionType,
});
