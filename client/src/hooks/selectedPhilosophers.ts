import { Philosopher, User } from "shared/types/database.types";
import { useEffect, useState } from "react";
import DatabaseService from "@/services/firebase/database.service";

export interface DebatePhilosopher extends Philosopher {
  id: string;
  avatar?: string;
  signature_argument?: string;
  rhetoric?: number;
}

export const useSelectedPhilosophers = (user: User | null) => {
  const [selectedPhilosophers, setSelectedPhilosophers] = useState<DebatePhilosopher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPhilosophers = async () => {
      if (!user?.philosopherCollection) {
        setSelectedPhilosophers([]);
        setLoading(false);
        return;
      }

      try {
        const ownedIds = Object.keys(user.philosopherCollection);
        if (ownedIds.length === 0) {
          setSelectedPhilosophers([]);
          setLoading(false);
          return;
        }

        const transformPhilosopher = (
          philosopher: Philosopher, 
          philosopherId: string, 
          ownedData: any
        ): DebatePhilosopher => {
          return {
            ...philosopher,
            id: philosopherId,
            baseStats: ownedData.stats || philosopher.baseStats,
            avatar: '🏛️', // Default avatar
            signature_argument: philosopher.specialAbility.name,
            rhetoric: Math.round((philosopher.baseStats.rhetoric + philosopher.baseStats.logic) / 2),
          };
        };

        const philosopherPromises = ownedIds.map(async (philosopherId) => {
          const ownedData = user.philosopherCollection[philosopherId];
          const fullData = await DatabaseService.getPhilosopher(philosopherId);
          
          if (fullData) {
            return transformPhilosopher(fullData, philosopherId, ownedData);
          }
          
          return {
            id: philosopherId,
            name: getPhilosopherNameFallback(philosopherId),
            era: 'Nieznana Era',
            school: ownedData.school || 'Nieznana Szkoła',
            rarity: 'common' as const,
            baseStats: ownedData.stats || {
              logic: 60, ethics: 60, metaphysics: 60, epistemology: 60,
              aesthetics: 60, mind: 60, language: 60, science: 60, social: 60
            },
            description: 'Wielki Filozof',
            imageUrl: '',
            quotes: ['Cokolwiek powiem, brzmi mądrze'],
            specialAbility: {
              name: 'Przemyślenie',
              description: 'Głębokie zrozumienie zasad filozofii',
              effect: 'Zwiększa wynik debat'
            },
            avatar: '🏛️',
            signature_argument: 'Philosophical reasoning',
            rhetoric: 60,
          } as DebatePhilosopher;
        });

        const philosophers = await Promise.all(philosopherPromises);
        const validPhilosophers = philosophers.filter((p): p is DebatePhilosopher => p !== null);
        
        setSelectedPhilosophers(validPhilosophers);
      } catch (error) {
        console.error('Błąd ładowania filozofów:', error);
        setSelectedPhilosophers([]);
      } finally {
        setLoading(false);
      }
    };

    loadPhilosophers();
  }, [user]);

  return { selectedPhilosophers, loading };
};

// Mapa do fallbacków
const getPhilosopherNameFallback = (philosopherId: string): string => {
  const nameMap: Record<string, string> = {
    'socrates': 'Sokrates',
    'plato': 'Platon',
    'aristotle': 'Arystoteles',
    'kant': 'Immanuel Kant',
    'nietzsche': 'Friedrich Nietzsche',
    'descartes': 'René Descartes',
    'hume': 'David Hume',
    'spinoza': 'Baruch Spinoza',
    'wittgenstein': 'Ludwig Wittgenstein',
    'sartre': 'Jean-Paul Sartre',
  };
  
  return nameMap[philosopherId] || 'Unknown Philosopher';
};