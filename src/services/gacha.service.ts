import { Philosopher, Rarity } from '@/types/database.types';
import DatabaseService from './firebase/database.service';

export interface GachaPool {
  id: string;
  name: string;
  cost: {
    tickets: number;
  };
  rates: RarityRates;
  featuredPhilosophers?: string[];
  guaranteedRare: number; // Pity system
}

export interface RarityRates {
  common: number;
  rare: number;
  epic: number;
  legendary: number;
}

export interface PullResult {
  philosopher: Philosopher;
  isNew: boolean;
  isDuplicate: boolean;
}

export interface GachaHistory {
  philosopherId: string;
  timestamp: number;
  poolId: string;
  rarity: Rarity;
}

class GachaService {
  // Pula standardowa
  private readonly STANDARD_POOL: GachaPool = {
    id: 'standard',
    name: 'Standardowa Pula',
    cost: { tickets: 1 },
    rates: {
      common: 0.60,    // 60%
      rare: 0.30,      // 30%
      epic: 0.08,      // 8%
      legendary: 0.02  // 2%
    },
    guaranteedRare: 10, // Pity
  };

  // Zniżki za multipull
  private readonly MULTI_PULL_COUNT = 10;
  private readonly MULTI_PULL_COST = 9;

  //Pojedynczy pull

  async pullSingle(userId: string, poolId: string = 'standard'): Promise<PullResult> {
    const pool = await this.getPool(poolId);
    
    // Czy ma dość biletów?
    const hasTickets = await this.checkTickets(userId, pool.cost.tickets);
    if (!hasTickets) {
      throw new Error('Niewystarczająca liczba biletów');
    }

    // Odejmij
    await DatabaseService.updateUserStats(userId, {
      gachaTickets: -pool.cost.tickets
    });

    // Sprawdź pity timer
    const pullCount = await this.getUserPullCount(userId, poolId);
    const guaranteedRare = pullCount > 0 && pullCount % pool.guaranteedRare === 0;

    // Pobierz filo
    const allPhilosophers = await DatabaseService.getAllPhilosophers();
    const philosopherArray = Object.entries(allPhilosophers).map(([id, phil]) => ({
      id,
      ...phil
    }));

    // Sprawdź rarity
    const rarity = this.calculateRarity(pool.rates, guaranteedRare);
    
    // Filter by rarity
    const availablePhilosophers = philosopherArray.filter(p => p.rarity === rarity);
    
    if (availablePhilosophers.length === 0) {
      throw new Error(`Brak filozofów o rzadkości: ${rarity}`);
    }

    // Losowo
    const selected = availablePhilosophers[
      Math.floor(Math.random() * availablePhilosophers.length)
    ];

    // Sprawdź czy filozof istnieje
    const userPhilosophers = await DatabaseService.getUserPhilosophers(userId);
    const isNew = !userPhilosophers[selected.id];

    // Dodaj do kolekcji lub zwiększ ilość
    if (isNew) {
      await DatabaseService.addPhilosopherToCollection(userId, selected.id);
    } else {
      await DatabaseService.incrementPhilosopherDuplicates(userId, selected.id);
    }

    // Historia
    await this.recordPullHistory(userId, poolId, selected.id, rarity);

    return {
      philosopher: selected,
      isNew,
      isDuplicate: !isNew
    };
  }

  // Multipull ze zniżką

  async pullMulti(userId: string, poolId: string = 'standard'): Promise<PullResult[]> {
    const pool = await this.getPool(poolId);
    const totalCost = this.MULTI_PULL_COST * pool.cost.tickets;

    // Ilość biletów
    const hasTickets = await this.checkTickets(userId, totalCost);
    if (!hasTickets) {
      throw new Error('Niewystarczająca liczba biletów dla 10x losowania');
    }

    // Odejmij tickety
    await DatabaseService.updateUserStats(userId, {
      gachaTickets: -totalCost
    });

    const results: PullResult[] = [];
    
    // 10x pull
    for (let i = 0; i < this.MULTI_PULL_COUNT; i++) {
      // OPCJONALNIE - pity timer zawsze na true
      const guaranteedRare = i === 9;
      
      const result = await this.performSinglePull(
        userId, 
        poolId, 
        pool, 
        guaranteedRare
      );
      
      results.push(result);
    }

    return results;
  }

  //Wewnętrzna do pulla bez ticketów
  private async performSinglePull(
    userId: string,
    poolId: string,
    pool: GachaPool,
    forceRareOrBetter: boolean = false
  ): Promise<PullResult> {

    const allPhilosophers = await DatabaseService.getAllPhilosophers();
    const philosopherArray = Object.entries(allPhilosophers).map(([id, phil]) => ({
      id,
      ...phil
    }));

    const rarity = this.calculateRarity(pool.rates, forceRareOrBetter);
    
    const availablePhilosophers = philosopherArray.filter(p => p.rarity === rarity);
    
    if (availablePhilosophers.length === 0) {
      throw new Error(`Brak filozofów o rzadkości: ${rarity}`);
    }

    const selected = availablePhilosophers[
      Math.floor(Math.random() * availablePhilosophers.length)
    ];

    const userPhilosophers = await DatabaseService.getUserPhilosophers(userId);
    const isNew = !userPhilosophers[selected.id];

    if (isNew) {
      await DatabaseService.addPhilosopherToCollection(userId, selected.id);
    } else {
      await DatabaseService.incrementPhilosopherDuplicates(userId, selected.id);
    }

    await this.recordPullHistory(userId, poolId, selected.id, rarity);

    return {
      philosopher: selected,
      isNew,
      isDuplicate: !isNew
    };
  }

  //Rarity
  private calculateRarity(rates: RarityRates, guaranteedRareOrBetter: boolean = false): Rarity {
    const random = Math.random();
    
    if (guaranteedRareOrBetter) {
      // Skip common
      const adjustedRates = {
        rare: rates.rare / (1 - rates.common),
        epic: rates.epic / (1 - rates.common),
        legendary: rates.legendary / (1 - rates.common)
      };
      
      if (random < adjustedRates.legendary) return 'legendary';
      if (random < adjustedRates.legendary + adjustedRates.epic) return 'epic';
      return 'rare';
    }
    
    let cumulative = 0;
    
    cumulative += rates.legendary;
    if (random < cumulative) return 'legendary';
    
    cumulative += rates.epic;
    if (random < cumulative) return 'epic';
    
    cumulative += rates.rare;
    if (random < cumulative) return 'rare';
    
    return 'common';
  }

  //Pula na przyszłość
  private async getPool(poolId: string): Promise<GachaPool> {
    // Na przyszłość tutaj będzie podbitka dla systemu banerów/ewentów
    return this.STANDARD_POOL;
  }

  private async checkTickets(userId: string, required: number): Promise<boolean> {
    const user = await DatabaseService.getUser(userId);
    if (!user) return false;
    
    // Ilość ticketów jest w statsach
    const tickets = user.stats.gachaTickets || 0;
    return tickets >= required;
  }

  private async getUserPullCount(userId: string, poolId: string): Promise<number> {
    // Tutaj będzie fetch z historii
    return 0;
  }

  private async recordPullHistory(
    userId: string,
    poolId: string,
    philosopherId: string,
    rarity: Rarity
  ): Promise<void> {
    const history: GachaHistory = {
      philosopherId,
      timestamp: Date.now(),
      poolId,
      rarity
    };
    
    await DatabaseService.addGachaHistory(userId, history);
  }

  async getUserHistory(userId: string, limit: number = 50): Promise<GachaHistory[]> {
    return DatabaseService.getUserGachaHistory(userId, limit);
  }

  async getUserTickets(userId: string): Promise<number> {
    const user = await DatabaseService.getUser(userId);
    return user?.stats.gachaTickets || 0;
  }

  async getUserPullStats(userId: string): Promise<{
    totalPulls: number;
    rarityBreakdown: Record<Rarity, number>;
    uniquePhilosophers: number;
    lastLegendary?: GachaHistory;
  }> {
    const history = await this.getUserHistory(userId, 1000);
    
    const stats = {
      totalPulls: history.length,
      rarityBreakdown: {
        common: 0,
        rare: 0,
        epic: 0,
        legendary: 0
      } as Record<Rarity, number>,
      uniquePhilosophers: new Set(history.map(h => h.philosopherId)).size,
      lastLegendary: undefined as GachaHistory | undefined
    };

    history.forEach(pull => {
      stats.rarityBreakdown[pull.rarity]++;
      if (pull.rarity === 'legendary' && !stats.lastLegendary) {
        stats.lastLegendary = pull;
      }
    });

    return stats;
  }
}

export default new GachaService();