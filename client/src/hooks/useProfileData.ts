import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../hooks/useUser';
import DatabaseService from '../services/firebase/database.service';
import UserProgressionService from '../../../server/src/services/user-progression.service';
import { Philosopher, Achievement, Lesson, ProgressionMilestone } from '../../../shared/types/database.types';
import { PhilosopherStats } from '../../../shared/data/philosophers.seed';

export interface PhilosopherCollectionItem {
  id: string;
  philosopher: Philosopher;
  level: number;
  experience: number;
  stats: PhilosopherStats;
  obtainedAt: number;
  duplicates: number;
}

export interface CompletedLessonItem {
  id: string;
  lesson: Lesson;
  completedAt: number;
  score: number;
  timeSpent: number;
  attempts: number;
  bestScore: number;
}

export interface UnlockedAchievementItem {
  id: string;
  achievement: Achievement;
  unlockedAt: number;
  viewed: boolean;
  progress: number;
}

export interface RecentActivityItem {
  id: string;
  type: 'lesson_complete' | 'achievement_unlock' | 'philosopher_obtained' | 'milestone_reached' | 'level_up';
  timestamp: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  data?: any;
}

export const usePhilosopherCollection = (userId: string | null) => {
  const [philosophers, setPhilosophers] = useState<PhilosopherCollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useUser(userId || '');

  useEffect(() => {
    if (!user?.philosopherCollection) {
      setPhilosophers([]);
      setLoading(false);
      return;
    }

    const loadPhilosophers = async () => {
      try {
        setLoading(true);
        const philosopherIds = Object.keys(user.philosopherCollection);
        const philosopherPromises = philosopherIds.map(async (id) => {
          const ownedData = user.philosopherCollection[id];
          const philosopherData = await DatabaseService.getPhilosopher(id);
          
          if (!philosopherData) return null;
          
          return {
            id,
            philosopher: philosopherData,
            level: ownedData.level,
            experience: ownedData.experience,
            stats: ownedData.stats || philosopherData.baseStats,
            //obtainedAt: ownedData.obtainedAt,
            duplicates: ownedData.duplicates || 0,
          } as PhilosopherCollectionItem;
        });

        const results = await Promise.all(philosopherPromises);
        const validPhilosophers = results.filter(Boolean) as PhilosopherCollectionItem[];
        
        // Sort by obtained date (newest first)
        validPhilosophers.sort((a, b) => b.obtainedAt - a.obtainedAt);
        
        setPhilosophers(validPhilosophers);
        setError(null);
      } catch (err) {
        console.error('Error loading philosopher collection:', err);
        setError('Failed to load philosopher collection');
      } finally {
        setLoading(false);
      }
    };

    loadPhilosophers();
  }, [user?.philosopherCollection]);

  const collectionStats = useMemo(() => {
    if (!philosophers.length) return null;
    
    const totalLevel = philosophers.reduce((sum, p) => sum + p.level, 0);
    const averageLevel = totalLevel / philosophers.length;
    const rarityBreakdown = philosophers.reduce((acc, p) => {
      acc[p.philosopher.rarity] = (acc[p.philosopher.rarity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalCount: philosophers.length,
      totalLevel,
      averageLevel: Math.round(averageLevel * 10) / 10,
      rarityBreakdown,
      newestPhilosopher: philosophers[0],
    };
  }, [philosophers]);

  return { philosophers, loading, error, collectionStats };
};

export const useCompletedLessons = (userId: string | null) => {
  const [lessons, setLessons] = useState<CompletedLessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useUser(userId || '');

  useEffect(() => {
    if (!user?.progression?.completedLessons) {
      setLessons([]);
      setLoading(false);
      return;
    }

    const loadCompletedLessons = async () => {
      try {
        setLoading(true);
        const lessonIds = user.progression.completedLessons;
        const lessonPromises = lessonIds.map(async (lessonId) => {
          const lessonData = await DatabaseService.read<Lesson>(`lessons/${lessonId}`);
          const progressPath = `userProgress/${userId}/lessons/${lessonId}`;
          const progressData = await DatabaseService.read<any>(progressPath);
          
          if (!lessonData || !progressData) return null;
          
          return {
            id: lessonId,
            lesson: lessonData,
            completedAt: progressData.completedAt || Date.now(),
            score: progressData.score || 0,
            timeSpent: progressData.timeSpent || 0,
            attempts: progressData.attempts || 1,
            bestScore: progressData.bestScore || progressData.score || 0,
          } as CompletedLessonItem;
        });

        const results = await Promise.all(lessonPromises);
        const validLessons = results.filter(Boolean) as CompletedLessonItem[];
        
        // Sort by completion date (newest first)
        validLessons.sort((a, b) => b.completedAt - a.completedAt);
        
        setLessons(validLessons);
        setError(null);
      } catch (err) {
        console.error('Error loading completed lessons:', err);
        setError('Failed to load completed lessons');
      } finally {
        setLoading(false);
      }
    };

    loadCompletedLessons();
  }, [user?.progression?.completedLessons, userId]);

  const lessonStats = useMemo(() => {
    if (!lessons.length) return null;
    
    const totalTimeSpent = lessons.reduce((sum, l) => sum + l.timeSpent, 0);
    const averageScore = lessons.reduce((sum, l) => sum + l.score, 0) / lessons.length;
    const perfectScores = lessons.filter(l => l.score === 100).length;
    const difficultyBreakdown = lessons.reduce((acc, l) => {
      acc[l.lesson.difficulty] = (acc[l.lesson.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalCount: lessons.length,
      totalTimeSpent,
      averageScore: Math.round(averageScore * 10) / 10,
      perfectScores,
      difficultyBreakdown,
      recentLesson: lessons[0],
    };
  }, [lessons]);

  return { lessons, loading, error, lessonStats };
};

export const useUnlockedAchievements = (userId: string | null) => {
  const [achievements, setAchievements] = useState<UnlockedAchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useUser(userId || '');

  useEffect(() => {
    if (!user?.achievements) {
      setAchievements([]);
      setLoading(false);
      return;
    }

    const loadAchievements = async () => {
      try {
        setLoading(true);
        const achievementIds = Object.keys(user.achievements);
        const achievementPromises = achievementIds.map(async (id) => {
          const ownedData = user.achievements[id];
          const achievementData = await DatabaseService.read<Achievement>(`achievements/${id}`);
          
          if (!achievementData) return null;
          
          return {
            id,
            achievement: achievementData,
            unlockedAt: ownedData.unlockedAt,
            viewed: ownedData.viewed || false,
            progress: 100, // Achievements are 100% when unlocked
          } as UnlockedAchievementItem;
        });

        const results = await Promise.all(achievementPromises);
        const validAchievements = results.filter(Boolean) as UnlockedAchievementItem[];
        
        // Sort by unlock date (newest first)
        validAchievements.sort((a, b) => b.unlockedAt - a.unlockedAt);
        
        setAchievements(validAchievements);
        setError(null);
      } catch (err) {
        console.error('Error loading achievements:', err);
        setError('Failed to load achievements');
      } finally {
        setLoading(false);
      }
    };

    loadAchievements();
  }, [user?.achievements, userId]);

  return { achievements, loading, error };
};

export const useRecentActivity = (userId: string | null) => {
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!userId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const loadRecentActivity = async () => {
      try {
        setLoading(true);
        const activityPath = `userProgress/${userId}/recentActivity`;
        const activityData = await DatabaseService.read<RecentActivityItem[]>(activityPath);
        
        if (activityData) {
          // Sort by timestamp (newest first) and take last 10
          const sortedActivities = activityData
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);
          setActivities(sortedActivities);
        } else {
          setActivities([]);
        }
      } catch (err) {
        console.error('Error loading recent activity:', err);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecentActivity();
  }, [userId]);

  return { activities, loading };
};

export const useMilestones = (userId: string | null) => {
  const [milestones, setMilestones] = useState<ProgressionMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!userId) {
      setMilestones([]);
      setLoading(false);
      return;
    }

    const loadMilestones = async () => {
      try {
        setLoading(true);
        const milestonesData = await UserProgressionService.checkMilestones(userId);
        setMilestones(milestonesData as ProgressionMilestone[]);
      } catch (err) {
        console.error('Error loading milestones:', err);
        setMilestones([]);
      } finally {
        setLoading(false);
      }
    };

    loadMilestones();
  }, [userId]);

  const upcomingMilestones = useMemo(() => {
    return milestones
      .filter(m => !m.completed)
      .sort((a, b) => (b.currentValue / b.requiredValue) - (a.currentValue / a.requiredValue))
      .slice(0, 3);
  }, [milestones]);

  const completedMilestones = useMemo(() => {
    return milestones.filter(m => m.completed);
  }, [milestones]);

  return { 
    milestones, 
    upcomingMilestones, 
    completedMilestones, 
    loading 
  };
};