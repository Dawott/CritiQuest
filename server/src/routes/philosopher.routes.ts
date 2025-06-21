import { Router, Request, Response } from 'express';
import { z } from 'zod';
import admin from 'firebase-admin';
import { validateRequest, generalRateLimit, checkFirebaseConnection } from '../middleware/middleware';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { asyncHandler, AppError, ErrorType } from '../middleware/error.middleware';
import {EnhancedDatabaseService} from '../../../client/src/services/firebase/database.service';
import { PhilosopherSchema, PhilosopherStatsSchema } from '../../../shared/utils/schemas';
import { DB_PATHS } from '../../../server/src/config/firebase.config';

const router = Router();
const dbService = new EnhancedDatabaseService();

// Validation Schemas
const PhilosopherQuerySchema = z.object({
  query: z.object({
    rarity: z.enum(['common', 'rare', 'epic', 'legendary']).optional(),
    school: z.string().optional(),
    era: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
    search: z.string().optional(),
    owned: z.enum(['true', 'false']).optional(),
  }).optional(),
});

const PhilosopherParamsSchema = z.object({
  params: z.object({
    philosopherId: z.string().min(1),
  }),
});

const CreatePhilosopherSchema = z.object({
  body: PhilosopherSchema,
});

const UpdatePhilosopherSchema = z.object({
  body: PhilosopherSchema.partial(),
  params: z.object({
    philosopherId: z.string().min(1),
  }),
});

const LevelUpPhilosopherSchema = z.object({
  body: z.object({
    experienceToAdd: z.number().min(1).max(1000),
  }),
  params: z.object({
    philosopherId: z.string().min(1),
  }),
});

const CollectionFilterSchema = z.object({
  query: z.object({
    minLevel: z.string().optional(),
    maxLevel: z.string().optional(),
    school: z.string().optional(),
    rarity: z.enum(['common', 'rare', 'epic', 'legendary']).optional(),
    sortBy: z.enum(['level', 'experience', 'duplicates', 'rarity', 'name']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).optional(),
});

// Apply middleware
router.use(generalRateLimit.middleware);
router.use(checkFirebaseConnection);

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'Philosopher service is running',
    timestamp: Date.now(),
    availableEndpoints: [
      'GET /philosophers',
      'GET /philosophers/:id',
      'GET /philosophers/collection',
      'POST /philosophers/:id/level-up',
      'PUT /philosophers/:id/enhance'
    ]
  });
});

// Get all philosophers (public endpoint with filtering)
router.get('/',
  validateRequest(PhilosopherQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { rarity, school, era, limit = '20', offset = '0', search, owned } = req.query as any;

    try {
      // Get all philosophers from database
      const allPhilosophers = await dbService.getAllPhilosophers();
      
      if (!allPhilosophers) {
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, limit: parseInt(limit), offset: parseInt(offset) }
        });
      }

      let philosophersArray = Object.entries(allPhilosophers).map(([id, philosopher]) => ({
        id,
        ...philosopher
      }));

      // Apply filters
      if (rarity) {
        philosophersArray = philosophersArray.filter(p => p.rarity === rarity);
      }

      if (school) {
        philosophersArray = philosophersArray.filter(p => 
          p.school.toLowerCase().includes(school.toLowerCase())
        );
      }

      if (era) {
        philosophersArray = philosophersArray.filter(p => 
          p.era.toLowerCase().includes(era.toLowerCase())
        );
      }

      if (search) {
        const searchLower = search.toLowerCase();
        philosophersArray = philosophersArray.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.specialAbility.name.toLowerCase().includes(searchLower)
        );
      }

      // Sort by rarity and name
      philosophersArray.sort((a, b) => {
        const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
        if (a.rarity !== b.rarity) {
          return rarityOrder[b.rarity] - rarityOrder[a.rarity];
        }
        return a.name.localeCompare(b.name);
      });

      // Apply pagination
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);
      const paginatedPhilosophers = philosophersArray.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        data: paginatedPhilosophers,
        pagination: {
          total: philosophersArray.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < philosophersArray.length
        },
        filters: {
          schools: [...new Set(Object.values(allPhilosophers).map(p => p.school))],
          eras: [...new Set(Object.values(allPhilosophers).map(p => p.era))],
          rarities: ['common', 'rare', 'epic', 'legendary']
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania filozofów', 500, ErrorType.INTERNAL);
    }
  })
);

// Get single philosopher (public endpoint)
router.get('/:philosopherId',
  validateRequest(PhilosopherParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { philosopherId } = req.params;

    try {
      const philosopher = await dbService.getPhilosopher(philosopherId);
      
      if (!philosopher) {
        throw new AppError('Filozof nie został znaleziony', 404, ErrorType.NOT_FOUND);
      }

      res.json({
        success: true,
        data: {
          id: philosopherId,
          ...philosopher
        }
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Błąd podczas pobierania filozofa', 500, ErrorType.INTERNAL);
    }
  })
);

// Get user's philosopher collection (authenticated)
router.get('/collection/owned',
  authenticate,
  validateRequest(CollectionFilterSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { minLevel, maxLevel, school, rarity, sortBy = 'level', sortOrder = 'desc' } = req.query as any;

    try {
      // Get user data
      const userData = await dbService.getUser(userId);
      if (!userData || !userData.philosopherCollection) {
        return res.json({
          success: true,
          data: [],
          stats: {
            totalOwned: 0,
            totalLevel: 0,
            averageLevel: 0,
            rarityBreakdown: { common: 0, rare: 0, epic: 0, legendary: 0 }
          }
        });
      }

      const ownedPhilosophers = userData.philosopherCollection;
      
      // Get full philosopher data and merge with owned data
      const enrichedPhilosophers = await Promise.all(
        Object.entries(ownedPhilosophers).map(async ([philosopherId, ownedData]) => {
          const fullPhilosopher = await dbService.getPhilosopher(philosopherId);
          if (!fullPhilosopher) return null;

          return {
            id: philosopherId,
            ...fullPhilosopher,
            owned: {
              level: ownedData.level,
              experience: ownedData.experience,
              duplicates: ownedData.duplicates,
              enhancedStats: ownedData.stats,
            }
          };
        })
      );

      let filteredPhilosophers = enrichedPhilosophers.filter(p => p !== null);

      // Apply filters
      if (minLevel) {
        filteredPhilosophers = filteredPhilosophers.filter(p => p.owned.level >= parseInt(minLevel));
      }

      if (maxLevel) {
        filteredPhilosophers = filteredPhilosophers.filter(p => p.owned.level <= parseInt(maxLevel));
      }

      if (school) {
        filteredPhilosophers = filteredPhilosophers.filter(p => 
          p.school.toLowerCase().includes(school.toLowerCase())
        );
      }

      if (rarity) {
        filteredPhilosophers = filteredPhilosophers.filter(p => p.rarity === rarity);
      }

      // Sort collection
      filteredPhilosophers.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'level':
            comparison = a.owned.level - b.owned.level;
            break;
          case 'experience':
            comparison = a.owned.experience - b.owned.experience;
            break;
          case 'duplicates':
            comparison = a.owned.duplicates - b.owned.duplicates;
            break;
          case 'rarity':
            const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
            comparison = rarityOrder[a.rarity] - rarityOrder[b.rarity];
            break;
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
        }
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Calculate collection stats
      const stats = {
        totalOwned: filteredPhilosophers.length,
        totalLevel: filteredPhilosophers.reduce((sum, p) => sum + p.owned.level, 0),
        averageLevel: filteredPhilosophers.length > 0 
          ? Math.round(filteredPhilosophers.reduce((sum, p) => sum + p.owned.level, 0) / filteredPhilosophers.length * 10) / 10
          : 0,
        rarityBreakdown: filteredPhilosophers.reduce((acc, p) => {
          acc[p.rarity] = (acc[p.rarity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      res.json({
        success: true,
        data: filteredPhilosophers,
        stats
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania kolekcji', 500, ErrorType.INTERNAL);
    }
  })
);

// Level up philosopher (authenticated)
router.post('/:philosopherId/level-up',
  authenticate,
  validateRequest(LevelUpPhilosopherSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { philosopherId } = req.params;
    const { experienceToAdd } = req.body;

    try {
      // Check if user owns this philosopher
      const userData = await dbService.getUser(userId);
      if (!userData?.philosopherCollection?.[philosopherId]) {
        throw new AppError('Nie posiadasz tego filozofa', 403, ErrorType.AUTHORIZATION);
      }

      const ownedPhilosopher = userData.philosopherCollection[philosopherId];
      const currentLevel = ownedPhilosopher.level;
      const currentExp = ownedPhilosopher.experience;
      
      // Calculate new experience and level
      let newExperience = currentExp + experienceToAdd;
      let newLevel = currentLevel;
      let levelsGained = 0;

      // Level up logic (100 exp per level, with increasing requirements)
      while (newExperience >= newLevel * 100) {
        newExperience -= newLevel * 100;
        newLevel++;
        levelsGained++;
      }

      // Cap at level 50
      if (newLevel > 50) {
        newLevel = 50;
        newExperience = 0;
      }

      // Enhanced stats calculation (5% increase per level)
      const basePhilosopher = await dbService.getPhilosopher(philosopherId);
      if (!basePhilosopher) {
        throw new AppError('Dane filozofa nie zostały znalezione', 404, ErrorType.NOT_FOUND);
      }

      const statMultiplier = 1 + ((newLevel - 1) * 0.05) + (ownedPhilosopher.duplicates * 0.1);
      const enhancedStats = Object.entries(basePhilosopher.baseStats).reduce((stats, [key,value]) => {
        (stats as any)[key] = Math.round(value * statMultiplier);
        return stats;
      }, {} as any);

      // Update database
      const updates = {
        [`users/${userId}/philosopherCollection/${philosopherId}/level`]: newLevel,
        [`users/${userId}/philosopherCollection/${philosopherId}/experience`]: newExperience,
        [`users/${userId}/philosopherCollection/${philosopherId}/stats`]: enhancedStats,
      };

      await admin.database().ref().update(updates);

      res.json({
        success: true,
        message: levelsGained > 0 
          ? `${basePhilosopher.name} osiągnął poziom ${newLevel}!` 
          : `Dodano ${experienceToAdd} doświadczenia`,
        data: {
          previousLevel: currentLevel,
          newLevel,
          levelsGained,
          experienceAdded: experienceToAdd,
          newExperience,
          enhancedStats,
          statMultiplier: Math.round(statMultiplier * 100) / 100
        }
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Błąd podczas podnoszenia poziomu filozofa', 500, ErrorType.INTERNAL);
    }
  })
);

// Enhance philosopher with duplicates (authenticated)
router.put('/:philosopherId/enhance',
  authenticate,
  validateRequest(PhilosopherParamsSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const { philosopherId } = req.params;

    try {
      // Check if user owns this philosopher
      const userData = await dbService.getUser(userId);
      if (!userData?.philosopherCollection?.[philosopherId]) {
        throw new AppError('Nie posiadasz tego filozofa', 403, ErrorType.AUTHORIZATION);
      }

      const ownedPhilosopher = userData.philosopherCollection[philosopherId];
      
      if (ownedPhilosopher.duplicates < 1) {
        throw new AppError('Brak duplikatów do wzmocnienia', 400, ErrorType.VALIDATION);
      }

      // Use one duplicate for enhancement
      const newDuplicates = ownedPhilosopher.duplicates - 1;
      const experienceGained = 150; // Flat experience bonus
      const newExperience = ownedPhilosopher.experience + experienceGained;

      // Recalculate enhanced stats
      const basePhilosopher = await dbService.getPhilosopher(philosopherId);
      if (!basePhilosopher) {
        throw new AppError('Dane filozofa nie zostały znalezione', 404, ErrorType.NOT_FOUND);
      }

      const statMultiplier = 1 + ((ownedPhilosopher.level - 1) * 0.05) + (newDuplicates * 0.1);
      const enhancedStats = Object.entries(basePhilosopher.baseStats).reduce((stats, [key, value]) => {
        stats[key] = Math.round(value * statMultiplier);
        return stats;
      }, {} as any);

      // Update database
      const updates = {
        [`users/${userId}/philosopherCollection/${philosopherId}/duplicates`]: newDuplicates,
        [`users/${userId}/philosopherCollection/${philosopherId}/experience`]: newExperience,
        [`users/${userId}/philosopherCollection/${philosopherId}/stats`]: enhancedStats,
      };

      await admin.database().ref().update(updates);

      res.json({
        success: true,
        message: `${basePhilosopher.name} został wzmocniony duplikatem!`,
        data: {
          experienceGained,
          newExperience,
          duplicatesUsed: 1,
          remainingDuplicates: newDuplicates,
          enhancedStats,
          newStatMultiplier: Math.round(statMultiplier * 100) / 100
        }
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Błąd podczas wzmacniania filozofa', 500, ErrorType.INTERNAL);
    }
  })
);

// Get philosopher schools and eras (public endpoint)
router.get('/meta/schools',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const allPhilosophers = await dbService.getAllPhilosophers();
      
      if (!allPhilosophers) {
        return res.json({
          success: true,
          data: { schools: [], eras: [] }
        });
      }

      const schools = [...new Set(Object.values(allPhilosophers).map(p => p.school))].sort();
      const eras = [...new Set(Object.values(allPhilosophers).map(p => p.era))].sort();

      res.json({
        success: true,
        data: {
          schools,
          eras,
          totalPhilosophers: Object.keys(allPhilosophers).length,
          rarityDistribution: Object.values(allPhilosophers).reduce((acc, p) => {
            acc[p.rarity] = (acc[p.rarity] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      });

    } catch (error) {
      throw new AppError('Błąd podczas pobierania metadanych', 500, ErrorType.INTERNAL);
    }
  })
);

// Admin endpoints for creating/updating philosophers
router.post('/',
  authenticate,
  validateRequest(CreatePhilosopherSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Check if user has admin privileges (you'll need to implement this)
    // For now, we'll assume any authenticated user can create (adjust as needed)
    
    const { body: philosopherData } = req.body;

    try {
      // Generate ID from name
      const philosopherId = philosopherData.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      // Check if philosopher already exists
      const existingPhilosopher = await dbService.getPhilosopher(philosopherId);
      if (existingPhilosopher) {
        throw new AppError('Filozof o tej nazwie już istnieje', 400, ErrorType.VALIDATION);
      }

      // Create philosopher
      await admin.database()
        .ref(`${DB_PATHS.PHILOSOPHERS}/${philosopherId}`)
        .set(philosopherData);

      res.status(201).json({
        success: true,
        message: 'Filozof został utworzony pomyślnie',
        data: {
          id: philosopherId,
          ...philosopherData
        }
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Błąd podczas tworzenia filozofa', 500, ErrorType.INTERNAL);
    }
  })
);

// Update philosopher (admin endpoint)
router.put('/:philosopherId',
  authenticate,
  validateRequest(UpdatePhilosopherSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { philosopherId } = req.params;
    const { body: updates } = req.body;

    try {
      // Check if philosopher exists
      const existingPhilosopher = await dbService.getPhilosopher(philosopherId);
      if (!existingPhilosopher) {
        throw new AppError('Filozof nie został znaleziony', 404, ErrorType.NOT_FOUND);
      }

      // Update philosopher
      await admin.database()
        .ref(`${DB_PATHS.PHILOSOPHERS}/${philosopherId}`)
        .update(updates);

      // Get updated data
      const updatedPhilosopher = await dbService.getPhilosopher(philosopherId);

      res.json({
        success: true,
        message: 'Filozof został zaktualizowany pomyślnie',
        data: {
          id: philosopherId,
          ...updatedPhilosopher
        }
      });

    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Błąd podczas aktualizacji filozofa', 500, ErrorType.INTERNAL);
    }
  })
);

export default router;