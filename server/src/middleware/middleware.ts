import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import admin from 'firebase-admin';

// Rate limit
class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  
  constructor(
    private windowMs: number = 15 * 60 * 1000, // 15 minut
    private maxRequests: number = 100
  ) {}

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    const userRequests = this.requests.get(key);
    
    if (!userRequests || now > userRequests.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      next();
      return;
    }
    
    if (userRequests.count >= this.maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000),
      });
      return;
    }
    
    userRequests.count++;
    next();
  };
}

// Middleware - walidacje
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: result.error.errors,
        });
        return;
      }
      
      // Replace req z walidacją
      req.body = result.data.body || req.body;
      req.query = result.data.query || req.query;
      req.params = result.data.params || req.params;
      
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Invalid request format',
      });
    }
  };
};

// Firebase łączenie z middleware
export const checkFirebaseConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await admin.database().ref('.info/connected').once('value');
    next();
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Database service unavailable',
    });
  }
};

// Logger middleware
export const detailedLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
  });
  
  next();
};

// CORS
export const configureCORS = () => {
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS || '').split(',')
    : ['http://localhost:3000', 'http://localhost:8081'];
  
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
};

// Export rate limiter instances
export const generalRateLimit = new RateLimiter(15 * 60 * 1000, 100); // 100 request/15 minut
export const authRateLimit = new RateLimiter(15 * 60 * 1000, 20); // 20 auth request/15 minut
export const strictRateLimit = new RateLimiter(60 * 1000, 10); // 10 requestów/minuta