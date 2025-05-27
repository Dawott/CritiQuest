import { useEffect, useState } from 'react';
import DatabaseService from '@/services/firebase/database.service';
import { User } from '@/types/database.types';

export function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = DatabaseService.subscribeToUser(userId, (userData) => {
      setUser(userData);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  return { user, loading };
}