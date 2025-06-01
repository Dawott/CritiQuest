import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

export async function createApolloServer(app: Express.Application) {
  const server = new ApolloServer({
    schema,
    plugins: [
      //Pluginy
    ],
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Get user from JWT token
        const user = await getUserFromToken(req.headers.authorization);
        
        return {
          userId: user?.uid,
          dataSources: {
            lessons: new LessonDataSource(),
            philosophers: new PhilosopherDataSource(),
            gacha: new GachaDataSource(),
          },
          pubsub: pubsubInstance,
        };
      },
    })
  );

  // WebSocket server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  useServer({ schema }, wsServer);
}