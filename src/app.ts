import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { errorHandler, notFoundHandler, setupGlobalErrorHandlers } from './middleware/error.middleware.ts';
import { detailedLogger, configureCORS } from './middleware/middleware';
import { initializeFirebase } from '../server/src/config/firebase.config.ts';
import enhancedLessonRoutes from './routes/lesson.routes';
import { createGraphQLYoga, createGraphQLWebSocketServer } from './graphql/yogaServer.ts';
import { useAppInitialization } from '@/hooks/useAppInitialization';

dotenv.config();

export class CritiQuestAPI {
  private app: Application;
  private port: number;
  private httpServer: any;
  private wsCleanup?: {dispose(): void | Promise<void> };
  
  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.port = parseInt(process.env.PORT || '3000'); //PORT !!!
    this.initializeMiddlewares();
    this.initializeServices();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }
  
//middleware
  private initializeMiddlewares(): void {
    // Security
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    const { isInitializing } = useAppInitialization();

    this.app.use(compression());
    // CORS configuration
    this.app.use(cors(configureCORS()));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Logging
    //this.app.use(morgan('combined'));
    this.app.use(detailedLogger);

    this.app.set('trust proxy', 1);
  }

  //Serwisy
  private async initializeServices(): Promise<void> {
    try {
      await initializeFirebase();
      console.log('All services initialized successfully');
    } catch (error) {
      console.error('Service initialization failed:', error);
      process.exit(1);
    }
  }
  
  //Routes
  private initializeRoutes(): void {
    // Health check
     this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      });
    });
    
    const yoga = createGraphQLYoga();
    this.app.use('/graphql', yoga);
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
      });
    })
    const { wsServer, serverCleanup } = createGraphQLWebSocketServer(this.httpServer, yoga);
    this.wsCleanup = serverCleanup;
    this.app.use('/api/v1/lessons', enhancedLessonRoutes);
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
    process.on('SIGTERM', this.gracefulShutdown);
    process.on('SIGINT', this.gracefulShutdown);
  }

  /*
  private gracefulShutdown = (): void => {
    console.log('Received shutdown signal, closing server gracefully...');
    process.exit(0);
  };
*/
  public listen(): void {
    try {
    setupGlobalErrorHandlers();
    this.initializeMiddlewares();
      this.initializeRoutes();
      this.initializeServices();
    this.app.listen(this.port, () => {
      console.log(`CritiQuest API running on port ${this.port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Firebase connected and ready`);
    });
  }
  catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
  private gracefulShutdown = async ():Promise<void> => {
    console.log('Received shutdown signal, closing server gracefully...');
    
    // Clean up WebSocket server
    if (this.wsCleanup) {
      try {
        await this.wsCleanup.dispose();
        console.log('WebSocket server disposed');
      } catch (error) {
        console.error('Error disposing WebSocket server:', error);
      }
    }
    
    // Close HTTP server
    this.httpServer.close(() => {
      console.log('Server closed gracefully');
      process.exit(0);
    });
  };
}

// Start server
const api = new CritiQuestAPI();
api.listen();