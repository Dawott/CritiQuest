import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLInt, GraphQLBoolean } from 'graphql';
import { GraphQLDateTime } from 'graphql-iso-date';

// Definicje
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
    specialAbility: { type: SpecialAbilityType },
    stats: { type: StatsType },
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
    rewards: { type: RewardsType },
    // Relacje - opcjonalnie
    requiredPhilosopher: {
      type: PhilosopherType,
      resolve: (lesson, args, context) => {
        return context.dataSources.philosophers.getById(lesson.requiredPhilosopherId);
      },
    },
  }),
});

// Query
const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    // Lekcje
    lessons: {
      type: new GraphQLList(LessonType),
      args: {
        stage: { type: GraphQLString },
        includeExternal: { type: GraphQLBoolean },
      },
      resolve: async (_, args, context) => {
        return context.dataSources.lessons.getAll(args);
      },
    },
    lesson: {
      type: LessonType,
      args: {
        id: { type: GraphQLString },
      },
      resolve: async (_, { id }, context) => {
        return context.dataSources.lessons.getById(id);
      },
    },
    // Filozofowie
    philosophers: {
      type: new GraphQLList(PhilosopherType),
      args: {
        rarity: { type: GraphQLString },
        owned: { type: GraphQLBoolean },
      },
      resolve: async (_, args, context) => {
        return context.dataSources.philosophers.getAll(args);
      },
    },
    // Rekomendacje
    recommendedLessons: {
      type: new GraphQLList(LessonType),
      resolve: async (_, __, context) => {
        return context.dataSources.lessons.getRecommendations(context.userId);
      },
    },
  },
});

// Mutatory
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
        await context.dataSources.lessons.complete(
          context.userId,
          args.lessonId,
          args
        );
        return context.dataSources.lessons.getById(args.lessonId);
      },
    },
    pullGacha: {
      type: new GraphQLList(PhilosopherType),
      args: {
        poolId: { type: GraphQLString },
        count: { type: GraphQLInt },
      },
      resolve: async (_, args, context) => {
        return context.dataSources.gacha.pull(
          context.userId,
          args.poolId,
          args.count
        );
      },
    },
  },
});

// Subskrypcje - też chyba na opcjach się skończy
const SubscriptionType = new GraphQLObjectType({
  name: 'Subscription',
  fields: {
    lessonProgress: {
      type: LessonType,
      args: {
        lessonId: { type: GraphQLString },
      },
      subscribe: async (_, { lessonId }, context) => {
        return context.pubsub.asyncIterator(`LESSON_PROGRESS_${lessonId}`);
      },
    },
    leaderboardUpdate: {
      type: LeaderboardType,
      subscribe: async (_, __, context) => {
        return context.pubsub.asyncIterator('LEADERBOARD_UPDATE');
      },
    },
  },
});

export const schema = new GraphQLSchema({
  query: QueryType,
  mutation: MutationType,
  subscription: SubscriptionType,
});
