import { Router, Request, Response } from 'express';
import { z } from 'zod';
import admin from 'firebase-admin';
import { validateRequest, generalRateLimit, strictRateLimit, checkFirebaseConnection } from '../middleware/middleware';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler, AppError, ErrorType } from '../middleware/error.middleware';
import { EnhancedDatabaseService } from '../services/firebase/database.service';
import GachaService, { GachaPool, RarityRates, PullResult, GachaHistory } from '../services/gacha.service';
import { DB_PATHS } from '../config/firebase.config';
import { getErrorMessage } from '../utils/error.utils';

const router = Router();
const dbService = new EnhancedDatabaseService();

// Validation Schemas
const GachaPoolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cost: z.object({
    tickets: z.number().min(1).max(10),
  }),
  rates: z.object({
    common: z.number().min(0).max(1),
    rare: z.number().min(0).max(1),
    epic: z.number().min(0).max(1),
    legendary: z.number().min(0).max(1),
  }).refine((rates) => {
    const total = rates.common + rates.rare + rates.epic + rates.legendary;
    return Math.abs(total - 1) < 0.001; // Allow for floating point precision
  }, {
    message: "Suma prawdopodobieństw musi wynosić 1.0"
  }),
  featuredPhilosophers: z.array(z.string()).optional(),
  guaranteedRare: z.number().min(1).max(50),
});

const PullRequestSchema = z.object({
  body: z.object({
    poolId: z.string().min(1).default('standard'),
    count: z.enum(['single', 'multi']).default('single'),
  }),
});

const TicketPurchaseSchema = z.object({
  body: z.object({
    amount: z.number().min(1).max(100),
    paymentMethod: z.enum(['achievement', 'daily_reward', 'admin_grant']).optional(),
  }),
});

const GachaHistoryQuerySchema = z.object({
  query: z.object({
    limit: z.string().optional(),
    poolId: z.string().optional(),
    rarity: z.enum(['common', 'rare', 'epic', 'legendary']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    philosopherId: z.string().optional(),
  }).optional(),
});

const CreatePoolSchema = z.object({
  body: GachaPoolSchema,
});

const UpdatePoolSchema = z.object({
  body: GachaPoolSchema.partial(),
  params: z.object({
    poolId: z.string().min(1),
  }),
});

// Apply middleware
router.use(generalRateLimit.middleware);
router.use(checkFirebaseConnection);

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'Gacha service is running',
    timestamp: Date.now(),
    availableEndpoints: [
      'POST /gacha/pull',
      'GET /gacha/tickets',
      'POST /gacha/tickets/purchase',
      'GET /gacha/history',
      'GET /gacha/stats',
      'GET /gacha/pools',
      'GET /gacha/pools/:id/rates'
    ]
  });
});

// Get available gacha pools (public endpoint)
router.get('/pools',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // For now, we have standard pool, but this will support multiple pools/banners
      const standardPool: GachaPool = {
        id: 'standard',
        name: 'Standardowa Pula Filozofów',
        cost: { tickets: 1 },
        rates: {
          common: 0.60,    // 60%
          rare: 0.30,      // 30%
          epic: 0.08,      // 8%
          legendary: 0.02  // 2%
        },
        guaranteedRare: 10,
        featuredPhilosophers: []
      };

      // In the future, fetch active pools from database
      const activePools = [standardPool];

      res.json({
        success: true,
        data: activePools,
        info: {
          multiPullDiscount: '10-pull for 9 tickets',
          pitySystem: 'Guaranteed rare or better every 10 pulls',
          duplicateBonus: '+50 XP and enhanced stats'
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania pul gacha', 500, ErrorType.INTERNAL);
    }
  })
);

// Get specific pool rates (public endpoint)
router.get('/pools/:poolId/rates',
  asyncHandler(async (req: Request, res: Response) => {
    const { poolId } = req.params;

    try {
      // For now, only standard pool exists
      if (poolId !== 'standard') {
        throw new AppError('Pula gacha nie została znaleziona', 404, ErrorType.NOT_FOUND);
      }

      const rates = {
        common: 60.0,
        rare: 30.0,
        epic: 8.0,
        legendary: 2.0
      };

      const pitySystem = {
        guaranteedRareEvery: 10,
        currentImplementation: 'Last pull in 10-pull guarantees rare or better',
        pityCarryover: false
      };

      res.json({
        success: true,
        data: {
          poolId,
          rates,
          pitySystem,
          cost: {
            single: 1,
            multi: 9 // 10% discount
          }
        }
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Błąd podczas pobierania stawek', 500, ErrorType.INTERNAL);
    }
  })
);

// Perform gacha pull (authenticated with strict rate limiting)
router.post('/pull',
  authenticate,
  strictRateLimit.middleware, // Prevent rapid pulling abuse
  validateRequest(PullRequestSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { poolId, count } = req.body;

    try {
      let results: PullResult[];
      let ticketsUsed: number;
      
      if (count === 'single') {
        const result = await GachaService.pullSingle(userId, poolId);
        results = [result];
        ticketsUsed = 1;
      } else {
        results = await GachaService.pullMulti(userId, poolId);
        ticketsUsed = 9; // Multi-pull discount
      }

      // Calculate summary statistics
      const summary = {
        totalPulls: results.length,
        newPhilosophers: results.filter(r => r.isNew).length,
        duplicates: results.filter(r => r.isDuplicate).length,
        rarityBreakdown: results.reduce((acc, r) => {
          acc[r.philosopher.rarity] = (acc[r.philosopher.rarity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        highestRarity: results.reduce((highest, r) => {
          const rarityOrder = { common: 1, rare: 2, epic: 3, legendary: 4 };
          return rarityOrder[r.philosopher.rarity as keyof typeof rarityOrder] > rarityOrder[highest as keyof typeof rarityOrder]
            ? r.philosopher.rarity 
            : highest;
        }, 'common' as string)
      };

      res.json({
        success: true,
        message: count === 'single' 
          ? `Wylosowano ${results[0].philosopher.name}!`
          : `Ukończono ${results.length}-krotne losowanie!`,
        data: {
          results,
          summary,
          ticketsUsed,
          pullType: count
        }
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      
      // Handle specific gacha errors
      if (getErrorMessage(error).includes('Niewystarczająca liczba biletów')) {
        throw new AppError('Brak wystarczającej liczby biletów gacha', 400, ErrorType.VALIDATION);
      }
      if (getErrorMessage(error).includes('Brak filozofów')) {
        throw new AppError('Błąd konfiguracji puli gacha', 500, ErrorType.INTERNAL);
      }
      
      throw new AppError('Błąd podczas losowania', 500, ErrorType.INTERNAL);
    }
  })
);

// Get user's ticket balance (authenticated)
router.get('/tickets',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    try {
      const tickets = await GachaService.getUserTickets(userId);
      
      // Get ticket earning history for the last 7 days
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const userData = await dbService.getUser(userId);
      
      const ticketSources = {
        daily_login: 0, // TODO: implement daily login tracking
        quiz_completion: 0, // TODO: track ticket sources
        achievements: 0,
        purchases: 0
      };

      res.json({
        success: true,
        data: {
          currentTickets: tickets,
          weeklyEarned: 0, // TODO: calculate from history
          sources: ticketSources,
          recommendations: tickets < 10 ? [
            'Ukończ quizy aby zdobyć bilety',
            'Sprawdź swoje osiągnięcia',
            'Codzienne logowanie daje dodatkowe bilety'
          ] : []
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania biletów', 500, ErrorType.INTERNAL);
    }
  })
);

// Purchase/Grant tickets (authenticated)
router.post('/tickets/purchase',
  authenticate,
  validateRequest(TicketPurchaseSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { amount, paymentMethod } = req.body;

    try {
      // For now, this is mainly for admin grants or achievement rewards
      // In a real app, this would integrate with payment processing
      
      if (paymentMethod === 'admin_grant') {
        // Admin granting tickets (you might want to add admin verification)
        await dbService.updateUserStats(userId, {
          gachaTickets: amount
        });

        res.json({
          success: true,
          message: `Dodano ${amount} biletów gacha`,
          data: {
            ticketsGranted: amount,
            newBalance: await GachaService.getUserTickets(userId)
          }
        });
      } else {
        // For achievement or daily reward systems
        throw new AppError('Metoda płatności nie jest jeszcze dostępna', 501, ErrorType.INTERNAL);
      }

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Błąd podczas zakupu biletów', 500, ErrorType.INTERNAL);
    }
  })
);

// Get user's gacha history (authenticated)
router.get('/history',
  authenticate,
  validateRequest(GachaHistoryQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { limit = '50', poolId, rarity, startDate, endDate, philosopherId } = req.query as any;

    try {
      let history = await GachaService.getUserHistory(userId, parseInt(limit));

      // Apply filters
      if (poolId) {
        history = history.filter(h => h.poolId === poolId);
      }

      if (rarity) {
        history = history.filter(h => h.rarity === rarity);
      }

      if (startDate) {
        history = history.filter(h => h.timestamp >= parseInt(startDate));
      }

      if (endDate) {
        history = history.filter(h => h.timestamp <= parseInt(endDate));
      }

      if (philosopherId) {
        history = history.filter(h => h.philosopherId === philosopherId);
      }

      // Enrich history with philosopher names
      const enrichedHistory = await Promise.all(
        history.map(async (pull) => {
          const philosopher = await dbService.getPhilosopher(pull.philosopherId);
          return {
            ...pull,
            philosopherName: philosopher?.name || 'Unknown Philosopher',
            philosopherSchool: philosopher?.school || 'Unknown School'
          };
        })
      );

      res.json({
        success: true,
        data: enrichedHistory,
        pagination: {
          total: history.length,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania historii losowań', 500, ErrorType.INTERNAL);
    }
  })
);

// Get user's gacha statistics (authenticated)
router.get('/stats',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    try {
      const stats = await GachaService.getUserPullStats(userId);
      
      // Calculate additional analytics
      const userData = await dbService.getUser(userId);
      const collection = userData?.philosopherCollection || {};
      
      const collectionStats = {
        totalOwned: Object.keys(collection).length,
        totalDuplicates: Object.values(collection).reduce((sum: number, phil: any) => sum + (phil.duplicates || 0), 0),
        averageLevel: Object.values(collection).length > 0 
          ? Object.values(collection).reduce((sum: number, phil: any) => sum + phil.level, 0) / Object.values(collection).length
          : 0,
        collectionCompletion: 0 // TODO: calculate based on total available philosophers
      };

      const analytics = {
        efficiency: {
          ticketsPerLegendary: stats.rarityBreakdown.legendary > 0 
            ? Math.round(stats.totalPulls / stats.rarityBreakdown.legendary) 
            : 0,
          averageRarity: calculateAverageRarity(stats.rarityBreakdown),
          luckFactor: calculateLuckFactor(stats.rarityBreakdown, stats.totalPulls)
        },
        trends: {
          favoritePool: 'standard', // TODO: calculate from history
          mostPulledDay: 'Monday', // TODO: calculate from timestamps
          pullStreak: 0 // TODO: calculate consecutive days with pulls
        }
      };

      res.json({
        success: true,
        data: {
          pullStats: stats,
          collectionStats,
          analytics
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania statystyk gacha', 500, ErrorType.INTERNAL);
    }
  })
);

// Get pity system status (authenticated)
router.get('/pity-status',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;

    try {
      const history = await GachaService.getUserHistory(userId, 50);
      
      // Calculate pity counter for each pool
      const pityStatus = calculatePityStatus(history);

      res.json({
        success: true,
        data: {
          pityCounters: pityStatus,
          nextGuaranteedRare: Math.max(0, 10 - (pityStatus.standard || 0)),
          explanation: 'Pity system zapewnia filozofa rzadkości "rare" lub wyższej co 10 losowań'
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania statusu pity', 500, ErrorType.INTERNAL);
    }
  })
);

// Admin endpoints for gacha management
router.post('/pools',
  authenticate,
  validateRequest(CreatePoolSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const poolData = req.body;

    try {
      // Check if pool already exists
      const existingPool = await admin.database().ref(`${DB_PATHS.GACHA_SYSTEM}/pools/${poolData.id}`).once('value');
      if (existingPool.exists()) {
        throw new AppError('Pula gacha o tym ID już istnieje', 400, ErrorType.VALIDATION);
      }

      // Validate featured philosophers exist
      if (poolData.featuredPhilosophers) {
        for (const philosopherId of poolData.featuredPhilosophers) {
          const philosopher = await dbService.getPhilosopher(philosopherId);
          if (!philosopher) {
            throw new AppError(`Filozof ${philosopherId} nie istnieje`, 400, ErrorType.VALIDATION);
          }
        }
      }

      // Create pool
      await admin.database()
        .ref(`${DB_PATHS.GACHA_SYSTEM}/pools/${poolData.id}`)
        .set({
          ...poolData,
          createdAt: Date.now(),
          active: true
        });

      res.status(201).json({
        success: true,
        message: 'Pula gacha została utworzona pomyślnie',
        data: poolData
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Błąd podczas tworzenia puli gacha', 500, ErrorType.INTERNAL);
    }
  })
);

// Update gacha pool (admin endpoint)
router.put('/pools/:poolId',
  authenticate,
  validateRequest(UpdatePoolSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { poolId } = req.params;
    const updates = req.body;

    try {
      // Check if pool exists
      const existingPool = await admin.database().ref(`${DB_PATHS.GACHA_SYSTEM}/pools/${poolId}`).once('value');
      if (!existingPool.exists()) {
        throw new AppError('Pula gacha nie została znaleziona', 404, ErrorType.NOT_FOUND);
      }

      // Update pool
      await admin.database()
        .ref(`${DB_PATHS.GACHA_SYSTEM}/pools/${poolId}`)
        .update({
          ...updates,
          updatedAt: Date.now()
        });

      // Get updated data
      const updatedPool = await admin.database().ref(`${DB_PATHS.GACHA_SYSTEM}/pools/${poolId}`).once('value');

      res.json({
        success: true,
        message: 'Pula gacha została zaktualizowana pomyślnie',
        data: updatedPool.val()
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Błąd podczas aktualizacji puli gacha', 500, ErrorType.INTERNAL);
    }
  })
);

// Global gacha statistics (admin endpoint)
router.get('/admin/global-stats',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      // Get global pull statistics
      const globalStats = {
        totalPulls: 0, // TODO: implement global tracking
        totalTicketsSpent: 0,
        averagePullsPerUser: 0,
        mostPopularPhilosopher: 'unknown',
        rateAccuracy: {
          common: 0,
          rare: 0,
          epic: 0,
          legendary: 0
        }
      };

      res.json({
        success: true,
        data: globalStats,
        note: 'Global statistics implementation pending'
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania globalnych statystyk', 500, ErrorType.INTERNAL);
    }
  })
);

// Helper functions
function calculateAverageRarity(breakdown: Record<string, number>): number {
  const weights = { common: 1, rare: 2, epic: 3, legendary: 4 };
  const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
  
  if (total === 0) return 0;
  
  const weightedSum = Object.entries(breakdown).reduce((sum, [rarity, count]) => {
    return sum + (weights[rarity as keyof typeof weights] || 1) * count;
  }, 0);
  
  return Math.round((weightedSum / total) * 100) / 100;
}

function calculateLuckFactor(breakdown: Record<string, number>, totalPulls: number): string {
  if (totalPulls === 0) return 'neutral';
  
  const expectedRates = { common: 0.60, rare: 0.30, epic: 0.08, legendary: 0.02 };
  let luckScore = 0;
  
  Object.entries(breakdown).forEach(([rarity, count]) => {
    const actualRate = count / totalPulls;
    const expectedRate = expectedRates[rarity as keyof typeof expectedRates] || 0;
    luckScore += (actualRate - expectedRate) * 100;
  });
  
  if (luckScore > 5) return 'lucky';
  if (luckScore < -5) return 'unlucky';
  return 'average';
}

function calculatePityStatus(history: GachaHistory[]): Record<string, number> {
  const pityCounters: Record<string, number> = {};
  
  // Group by pool
  const poolHistory = history.reduce((acc, pull) => {
    if (!acc[pull.poolId]) acc[pull.poolId] = [];
    acc[pull.poolId].push(pull);
    return acc;
  }, {} as Record<string, GachaHistory[]>);
  
  // Calculate pity for each pool
  Object.entries(poolHistory).forEach(([poolId, pulls]) => {
    let counter = 0;
    
    // Sort by timestamp (newest first) and count pulls since last rare+
    for (const pull of pulls.sort((a, b) => b.timestamp - a.timestamp)) {
      if (pull.rarity === 'epic' || pull.rarity === 'legendary') {
        break;
      }
      counter++;
    }
    
    pityCounters[poolId] = counter;
  });
  
  return pityCounters;
}

export default router;