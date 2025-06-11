import { Philosopher, User } from "@/types/database.types";
import { DatabaseService } from "node_modules/firebase-admin/lib/database/database";
import { useEffect, useState } from "react";
import getPhilosopher from "@services/firebase/database.service"

export const useSelectedPhilosophers = (user: User | null) => {
  const [selectedPhilosophers, setSelectedPhilosophers] = useState<Philosopher[]>([]);
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

        const philosopherId = ownedIds[0];
        const ownedData = user.philosopherCollection[philosopherId];
        
        const fullData = await DatabaseService.getPhilosopher(philosopherId);
        
        if (fullData) {
          setSelectedPhilosophers([{
            ...fullData,
            id: philosopherId,
            stats: ownedData.stats, 
          }]);
        }
      } catch (error) {
        console.error('Error loading philosophers:', error);
        setSelectedPhilosophers([]);
      } finally {
        setLoading(false);
      }
    };

    loadPhilosophers();
  }, [user]);

  return { selectedPhilosophers, loading };
};
