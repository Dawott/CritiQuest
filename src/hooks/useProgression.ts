import { useState, useEffect, useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import { currentUserAtom } from '@/store/atoms';
import AuthService from '@/services/firebase/auth.service';
import UserProgressionService, { 
  ProgressionUpdate, 
  ProgressionReward,
  ProgressionMilestone 
} from '@/services/user-progression.service';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface ProgressionState {
  isUpdating: boolean;
  lastUpdate: number;
  pendingUpdates: ProgressionUpdate[];
  recentRewards: ProgressionReward[];
  error: string | null;
}

interface UseProgressionOptions {
  autoSync?: boolean;
  offlineMode?: boolean;
  showRewardAlerts?: boolean;
  onLevelUp?: (newLevel: number) => void;
  onReward?: (reward: ProgressionReward) => void;
  onMilestone?: (milestone: ProgressionMilestone) => void;
}

export function useProgression(options: UseProgressionOptions = {}) {
  const [currentUser] = useAtom(currentUserAtom);
  const [state, setState] = useState<ProgressionState>({
    isUpdating: false,
    lastUpdate: Date.now(),
    pendingUpdates: [],
    recentRewards: [],
    error: null
  });

  const {
    autoSync = true,
    offlineMode = true,
    showRewardAlerts = true,
    onLevelUp,
    onReward,
    onMilestone
  } = options;

  const networkStateRef = useRef<boolean>(true);
  const syncTimeoutRef = useRef<number | null>(null);

  // Helper do pobierania user ID z firebase'a
  const getCurrentUserId = useCallback(() => {
    return AuthService.currentUser?.uid || null;
  }, []);

  // Monitor network
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      networkStateRef.current = state.isConnected ?? false;
      
      if (state.isConnected && networkStateRef.current) {
        syncPendingUpdates();
      }
    });

    return () => unsubscribe();
  }, []);

  const updateProgression = useCallback(async (
    update: ProgressionUpdate,
    immediate: boolean = false
  ) => {
    const userId = getCurrentUserId();
    if (!userId) {
      setState(prev => ({ ...prev, error: 'Nikt się nie zalogował' }));
      return;
    }

    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      if (!networkStateRef.current && offlineMode) {
        await queueOfflineUpdate(update);
        setState(prev => ({
          ...prev,
          isUpdating: false,
          pendingUpdates: [...prev.pendingUpdates, update]
        }));
        return;
      }

      const result = await UserProgressionService.updateProgression(
        userId,
        update,
        immediate
      );

      if (result.success) {
        setState(prev => ({
          ...prev,
          isUpdating: false,
          lastUpdate: Date.now(),
          recentRewards: [...(result.rewards || []), ...prev.recentRewards].slice(0, 10)
        }));

        // Handle callbacks
        if (result.newLevel && onLevelUp) {
          onLevelUp(result.newLevel);
        }

        if (result.rewards) {
          result.rewards.forEach(reward => {
            if (onReward) onReward(reward);
            if (showRewardAlerts) showRewardAlert(reward);
          });
        }
      } else {
        throw new Error(result.error || 'Update nieudany');
      }
    } catch (error) {
      console.error('Błąd podczas update postępu:', error);
      setState(prev => ({
        ...prev,
        isUpdating: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd'
      }));

      if (offlineMode) {
        await queueOfflineUpdate(update);
      }
    }
  }, [getCurrentUserId, offlineMode, onLevelUp, onReward, showRewardAlerts]);

  const trackLessonProgress = useCallback(async (
    lessonId: string,
    data: {
      sectionCompleted?: number;
      timeSpent: number;
      notesAdded?: string;
      philosophicalInsights?: string[];
    }
  ) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      await UserProgressionService.trackLessonProgress(
        userId,
        lessonId,
        data
      );
    } catch (error) {
      console.error('Nie udało się załadować postępu:', error);
    }
  }, [getCurrentUserId]);

  const trackQuizProgress = useCallback(async (
    quizId: string,
    data: {
      questionAnswered: number;
      isCorrect: boolean;
      timeSpent: number;
      hintsUsed?: number;
    }
  ) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      await UserProgressionService.trackQuizProgress(
        userId,
        quizId,
        data
      );
    } catch (error) {
      console.error('Nie udało się załadować postępu quizu:', error);
    }
  }, [getCurrentUserId]);

  // Complete lesson
  const completeLesson = useCallback(async (
    lessonId: string,
    score: number,
    timeSpent: number,
    additionalData?: {
      notes?: string;
      philosophicalInsights?: string[];
    }
  ) => {
    const experienceGained = Math.floor(score * 10); // 10 XP per score point
    
    await updateProgression({
      experience: experienceGained,
      lessonsCompleted: [lessonId],
      timeSpent,
      customData: additionalData
    }, true); // Update od razu po sukcesie lekcji
  }, [updateProgression]);

  // Complete quiz
  const completeQuiz = useCallback(async (
    quizId: string,
    score: number,
    timeSpent: number,
    perfectScore: boolean
  ) => {
    const experienceGained = Math.floor(score * 15); // 15 XP per score point
    
    await updateProgression({
      experience: experienceGained,
      quizzesCompleted: 1,
      timeSpent,
      customData: {
        quizId,
        score,
        perfectScore
      }
    }, true); // Immediate update for quiz completion
  }, [updateProgression]);

  // Update daily streak
  const updateStreak = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      const result = await UserProgressionService.updateDailyStreak(userId);
      
      if (result.reward) {
        setState(prev => ({
          ...prev,
          recentRewards: [result.reward!, ...prev.recentRewards].slice(0, 10)
        }));
        
        if (onReward) onReward(result.reward);
        if (showRewardAlerts) showRewardAlert(result.reward);
      }
      
      return result.newStreak;
    } catch (error) {
      console.error('Nie udało się zapisać streak:', error);
      return 0;
    }
  }, [getCurrentUserId, onReward, showRewardAlerts]);

  // Get progression summary
  const getProgressionSummary = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) return null;

    try {
      return await UserProgressionService.getProgressionSummary(userId);
    } catch (error) {
      console.error('Nie udało się pobrać podsumowania postępu:', error);
      return null;
    }
  }, [getCurrentUserId]);

  // Check milestones
  const checkMilestones = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) return [];

    try {
      const milestones = await UserProgressionService.checkMilestones(userId);
      
      // Notify about newly completed milestones
      milestones.filter(m => m.completed).forEach(milestone => {
        if (onMilestone) onMilestone(milestone);
      });
      
      return milestones;
    } catch (error) {
      console.error('Nie udało się sprawdzić milestonesów:', error);
      return [];
    }
  }, [getCurrentUserId, onMilestone]);

  // Offline support functions
  const queueOfflineUpdate = async (update: ProgressionUpdate) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      const key = `@progression_queue_${userId}`;
      const existingQueue = await AsyncStorage.getItem(key);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      
      queue.push({
        ...update,
        timestamp: Date.now(),
      });
      
      await AsyncStorage.setItem(key, JSON.stringify(queue));
    } catch (error) {
      console.error('Nie udało się zapisać offline update:', error);
    }
  };

  const syncPendingUpdates = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      const key = `@progression_queue_${userId}`;
      const queuedUpdates = await AsyncStorage.getItem(key);
      
      if (!queuedUpdates) return;
      
      const updates = JSON.parse(queuedUpdates);
      
      for (const update of updates) {
        await UserProgressionService.updateProgression(userId, update, true);
      }
      
      await AsyncStorage.removeItem(key);
      
      setState(prev => ({
        ...prev,
        pendingUpdates: []
      }));
      
    } catch (error) {
      console.error('Nie udało się zsynchronizować pending updates:', error);
    }
  }, [getCurrentUserId]);

  const showRewardAlert = (reward: ProgressionReward) => {
    const rewardText = Object.entries(reward.rewards)
      .map(([key, value]) => {
        switch (key) {
          case 'gachaTickets': return `${value} bilety gacha`;
          case 'experience': return `${value} XP`;
          case 'philosopherId': return 'Nowy filozof!';
          case 'badgeId': return 'Nowa odznaka!';
          default: return '';
        }
      })
      .filter(Boolean)
      .join(', ');

    Alert.alert(
      'Uzyskano nagrody!',
      `${reward.message}\n\nNagrody: ${rewardText}`,
      [{ text: 'Świetnie!', style: 'default' }]
    );
  };

  // Auto-sync on mount if enabled
  useEffect(() => {
    const userId = getCurrentUserId();
    if (autoSync && userId) {
      syncPendingUpdates();
    }
  }, [autoSync, getCurrentUserId, syncPendingUpdates]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    isUpdating: state.isUpdating,
    pendingUpdates: state.pendingUpdates.length,
    recentRewards: state.recentRewards,
    error: state.error,
    
    // Actions
    updateProgression,
    trackLessonProgress,
    trackQuizProgress,
    completeLesson,
    completeQuiz,
    updateStreak,
    checkMilestones,
    getProgressionSummary,
    syncPendingUpdates,
    
    // Utils
    clearError: () => setState(prev => ({ ...prev, error: null }))
  };
}

// Hook for displaying progression UI
export function useProgressionDisplay() {
  const [currentUser] = useAtom(currentUserAtom);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Helper to get current user ID from Firebase Auth
  const getCurrentUserId = useCallback(() => {
    return AuthService.currentUser?.uid || null;
  }, []);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;

    const loadSummary = async () => {
      setLoading(true);
      try {
        const data = await UserProgressionService.getProgressionSummary(userId);
        setSummary(data);
      } catch (error) {
        console.error('Nie udało się załadować postępu:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();

    // Subscribe to progression updates
    const handleUpdate = () => {
      loadSummary();
    };

    UserProgressionService.on('progressionUpdated', handleUpdate);
    
    return () => {
      UserProgressionService.off('progressionUpdated', handleUpdate);
    };
  }, [getCurrentUserId]);

  const progressPercentage = summary 
    ? (summary.experience - UserProgressionService['EXP_FOR_LEVEL'](summary.level)) / 
      (UserProgressionService['EXP_FOR_LEVEL'](summary.level + 1) - UserProgressionService['EXP_FOR_LEVEL'](summary.level)) * 100
    : 0;

  return {
    level: summary?.level || 1,
    experience: summary?.experience || 0,
    expToNextLevel: summary?.expToNextLevel || 100,
    progressPercentage,
    totalLessons: summary?.totalLessons || 0,
    totalQuizzes: summary?.totalQuizzes || 0,
    streak: summary?.streak || 0,
    recentActivity: summary?.recentActivity || [],
    upcomingMilestones: summary?.upcomingMilestones || [],
    loading
  };
}