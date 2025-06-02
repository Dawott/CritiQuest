import { useEffect, useState } from 'react';
import { LessonAPI } from '../services/api/lesson.api';
import { Lesson } from '../types/database.types';

export function useApiLessons(stage?: string) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        setLoading(true);
        const data = await LessonAPI.getLessons({ 
          stage,
          includeExternal: true 
        });
        setLessons(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [stage]);

  return { lessons, loading, error, refetch: fetchLessons };
}