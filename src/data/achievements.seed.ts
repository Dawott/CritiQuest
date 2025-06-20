import { z } from 'zod';

// Schemat kryteriów
export const AchievementCriteriaSchema = z.object({
  type: z.string(), // 'perfect_score', 'collection_count', 'win_streak', 'lesson_speedrun', etc.
  maxTime: z.number().optional(), // Speedruny
  minWins: z.number().optional(), // Debaty
  minCount: z.number().optional(), // Kolekcje
  minDays: z.number().optional(), // Streak
});

// Schemat nagród
export const AchievementRewardsSchema = z.object({
  experience: z.number(),
  gachaTickets: z.number()
});

// Główny schemat
export const AchievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  criteria: AchievementCriteriaSchema,
  rewards: AchievementRewardsSchema
});

export type AchievementCriteria = z.infer<typeof AchievementCriteriaSchema>;
export type AchievementRewards = z.infer<typeof AchievementRewardsSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;

// Achievement seed 
export const achievementsSeedData: Record<string, Achievement> = {
  // Learning & Quiz 
  "first-perfect-score": {
    id: "first-perfect-score",
    name: "Doskonałość Filozofa",
    description: "Uzyskaj 100% w jakimkolwiek quizie",
    criteria: {
      type: "perfect_score",
      minCount: 1
    },
    rewards: {
      experience: 100,
      gachaTickets: 1
    }
  },
  
  "quiz-master": {
    id: "quiz-master",
    name: "Myśliciel",
    description: "Uzyskaj perfekcyjny wynik w 10 quizach",
    criteria: {
      type: "perfect_score",
      minCount: 10
    },
    rewards: {
      experience: 500,
      gachaTickets: 5
    }
  },
  
  "speed-learner": {
    id: "speed-learner",
    name: "Szybki Neuron",
    description: "Zakończ lekcję w 5 minut",
    criteria: {
      type: "lesson_speedrun",
      maxTime: 300 // 5 minut w sekundach
    },
    rewards: {
      experience: 150,
      gachaTickets: 2
    }
  },
  
  // Collection Achievements
  "first-philosopher": {
    id: "first-philosopher",
    name: "Wyjście z Jaskini",
    description: "Odblokuj pierwszego filozofa",
    criteria: {
      type: "collection_count",
      minCount: 1
    },
    rewards: {
      experience: 50,
      gachaTickets: 1
    }
  },
  
  "school-collector": {
    id: "school-collector",
    name: "Gimnazjon",
    description: "Uzyskaj 10 filozofów",
    criteria: {
      type: "collection_count",
      minCount: 10
    },
    rewards: {
      experience: 300,
      gachaTickets: 3
    }
  },
  
  "legendary-collector": {
    id: "legendary-collector",
    name: "Kurator Legend",
    description: "Uzyskaj 3 legendarnych filozofów",
    criteria: {
      type: "legendary_collection",
      minCount: 3
    },
    rewards: {
      experience: 1000,
      gachaTickets: 10
    }
  },
  
  // Battle/Debate Achievements
  "first-debate-victory": {
    id: "first-debate-victory",
    name: "Sztuka Erystyki",
    description: "Wygraj pierwszą debatę",
    criteria: {
      type: "debate_wins",
      minWins: 1
    },
    rewards: {
      experience: 100,
      gachaTickets: 1
    }
  },
  
  "debate-champion": {
    id: "debate-champion",
    name: "Faktami i Logiką",
    description: "Wygraj 20 debat",
    criteria: {
      type: "debate_wins",
      minWins: 20
    },
    rewards: {
      experience: 500,
      gachaTickets: 5
    }
  },
  
  "undefeated-philosopher": {
    id: "undefeated-philosopher",
    name: "Zatwardziała Logika",
    description: "Wygraj 5 debat pod rząd",
    criteria: {
      type: "win_streak",
      minWins: 5
    },
    rewards: {
      experience: 400,
      gachaTickets: 4
    }
  },
  
  // Streak & Consistency Achievements
  "daily-thinker": {
    id: "daily-thinker",
    name: "Praktyka Czyni",
    description: "Ukończ quiz codziennie przez 7 dni",
    criteria: {
      type: "daily_streak",
      minDays: 7
    },
    rewards: {
      experience: 200,
      gachaTickets: 2
    }
  },
  
  "devoted-student": {
    id: "devoted-student",
    name: "Wierni",
    description: "Zachowaj 30-dniowy streak",
    criteria: {
      type: "daily_streak",
      minDays: 30
    },
    rewards: {
      experience: 1000,
      gachaTickets: 10
    }
  },
  
  // School/Philosophy Mastery Achievements
  "stoic-initiate": {
    id: "stoic-initiate",
    name: "Panuj nad sobą",
    description: "Ukończ 3 podstawowe lekcje stoicyzmu",
    criteria: {
      type: "school_lessons",
      minCount: 3
    },
    rewards: {
      experience: 250,
      gachaTickets: 3
    }
  },
  
  "existential-explorer": {
    id: "existential-explorer",
    name: "Dasein",
    description: "Ukończ lekcje z egzystencjalizmu",
    criteria: {
      type: "school_lessons",
      minCount: 5
    },
    rewards: {
      experience: 400,
      gachaTickets: 4
    }
  },
  
  // Special/Hidden Achievements
  "socratic-method": {
    id: "socratic-method",
    name: "Wiem, że nic nie wiem",
    description: "Ponieś porażkę w quizach trzy razy",
    criteria: {
      type: "learning_from_failure",
      minCount: 3
    },
    rewards: {
      experience: 200,
      gachaTickets: 2
    }
  },
  
  "philosopher-affinity": {
    id: "philosopher-affinity",
    name: "Za pan brat",
    description: "Użyj tego samego filozofa w 10 debatach pod rząd",
    criteria: {
      type: "philosopher_loyalty",
      minCount: 10
    },
    rewards: {
      experience: 300,
      gachaTickets: 3
    }
  },
  
  "quote-collector": {
    id: "quote-collector",
    name: "Aleksandria",
    description: "Odblokuj 50 filozoficznych cytatów",
    criteria: {
      type: "quote_collection",
      minCount: 50
    },
    rewards: {
      experience: 400,
      gachaTickets: 4
    }
  },
  
  // Milestone Achievements
  "level-10": {
    id: "level-10",
    name: "Rosnąc",
    description: "Uzyskaj 10 level",
    criteria: {
      type: "player_level",
      minCount: 10
    },
    rewards: {
      experience: 200,
      gachaTickets: 2
    }
  },
  
  "level-25": {
    id: "level-25",
    name: "Zaprawiony Myśliciel",
    description: "Uzyskaj poziom 25",
    criteria: {
      type: "player_level",
      minCount: 25
    },
    rewards: {
      experience: 500,
      gachaTickets: 5
    }
  },
  
  "level-50": {
    id: "level-50",
    name: "Zaratustra",
    description: "Uzyskaj poziom 50",
    criteria: {
      type: "player_level",
      minCount: 50
    },
    rewards: {
      experience: 1000,
      gachaTickets: 10
    }
  },
  
  // Time-based Achievements
  "night-owl": {
    id: "night-owl",
    name: "Filozof przy Świecach",
    description: "Zakończ lekcję między północą a 3 rano",
    criteria: {
      type: "time_based",
      minCount: 1
    },
    rewards: {
      experience: 150,
      gachaTickets: 2
    }
  },
  
  "early-bird": {
    id: "early-bird",
    name: "Schodząc z Góry",
    description: "Zakończ pięć lekcji o porannej porze",
    criteria: {
      type: "time_based",
      minCount: 5
    },
    rewards: {
      experience: 250,
      gachaTickets: 3
    }
  }
};

// Helpery
export const getAchievementsByType = (type: string): Achievement[] => {
  return Object.values(achievementsSeedData).filter(
    achievement => achievement.criteria.type === type
  );
};

export const getAchievementsByRewardTier = (minTickets: number): Achievement[] => {
  return Object.values(achievementsSeedData).filter(
    achievement => achievement.rewards.gachaTickets >= minTickets
  );
};

// Kalkulacja możliwych nagród
export const calculateTotalRewards = (): { totalXP: number; totalTickets: number } => {
  return Object.values(achievementsSeedData).reduce(
    (totals, achievement) => ({
      totalXP: totals.totalXP + achievement.rewards.experience,
      totalTickets: totals.totalTickets + achievement.rewards.gachaTickets
    }),
    { totalXP: 0, totalTickets: 0 }
  );
};

// Poziomy trudności i ich nagrody
export const getAchievementTier = (achievement: Achievement): 'bronze' | 'silver' | 'gold' | 'platinum' => {
  const totalReward = achievement.rewards.experience + (achievement.rewards.gachaTickets * 100);
  
  if (totalReward >= 1500) return 'platinum';
  if (totalReward >= 700) return 'gold';
  if (totalReward >= 300) return 'silver';
  return 'bronze';
};

// Sprawdź czy spełnia kryteria
export const wouldAchievementBeCompleted = (
  achievement: Achievement,
  currentValue: number
): boolean => {
  const { criteria } = achievement;
  
  switch (criteria.type) {
    case 'perfect_score':
    case 'collection_count':
    case 'debate_wins':
    case 'daily_streak':
    case 'school_lessons':
    case 'philosopher_loyalty':
    case 'quote_collection':
    case 'player_level':
    case 'time_based':
    case 'legendary_collection':
    case 'learning_from_failure':
      return currentValue >= (criteria.minCount || 0);
    
    case 'win_streak':
      return currentValue >= (criteria.minWins || 0);
    
    case 'lesson_speedrun':
      return currentValue <= (criteria.maxTime || Infinity);
    
    default:
      return false;
  }
};