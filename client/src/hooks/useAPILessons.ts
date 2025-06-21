import { useCallback, useEffect, useState } from 'react';
import { LessonAPI } from '../../../server/src/services/api/lesson.api';
import { Lesson } from '../../../shared/types/database.types';

export function useApiLessons(stage?: string) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLessons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
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
  }, [stage]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  return { lessons, loading, error, refetch: fetchLessons };
}