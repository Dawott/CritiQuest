import { useState, useEffect, useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import { currentUserAtom } from '@/store/atoms';
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
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

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
    if (!currentUser?.id) {
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
        currentUser.id,
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
  }, [currentUser, offlineMode, onLevelUp, onReward, showRewardAlerts]);

  const trackLessonProgress = useCallback(async (
    lessonId: string,
    data: {
      sectionCompleted?: number;
      timeSpent: number;
      notesAdded?: string;
      philosophicalInsights?: string[];
    }
  ) => {
    if (!currentUser?.id) return;

    try {
      await UserProgressionService.trackLessonProgress(
        currentUser.id,
        lessonId,
        data
      );
    } catch (error) {
      console.error('Nieudało się załadować postępu:', error);
    }
  }, [currentUser]);

  const trackQuizProgress = useCallback(async (
    quizId: string,
    data: {
      questionAnswered: number;
      isCorrect: boolean;
      timeSpent: number;
      hintsUsed?: number;
    }
  ) => {
    if (!currentUser?.id) return;

    try {
      await UserProgressionService.trackQuizProgress(
        currentUser.id,
        quizId,
        data
      );
    } catch (error) {
      console.error('Nie udało się załadować postępu quizu:', error);
    }
  }, [currentUser]);

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
    if (!currentUser?.id) return;

    try {
      const result = await UserProgressionService.updateDailyStreak(currentUser.id);
      
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
  }, [currentUser, onReward, showRewardAlerts]);

  // Get progression summary
  const getProgressionSummary = useCallback(async () => {
    if (!currentUser?.id) return null;

    try {
      return await UserProgressionService.getProgressionSummary(currentUser.id);
    } catch (error) {
      console.error('Nie udało się pobrać podsumowania postępu:', error);
      return null;
    }
  }, [currentUser]);

  // Check milestones
  const checkMilestones = useCallback(async () => {
    if (!currentUser?.id) return [];

    try {
      const milestones = await UserProgressionService.checkMilestones(currentUser.id);
      
      // Notify about newly completed milestones
      milestones.filter(m => m.completed).forEach(milestone => {
        if (onMilestone) onMilestone(milestone);
      });
      
      return milestones;
    } catch (error) {
      console.error('Nie udało się sprawdzić milestonesów:', error);
      return [];
    }
  }, [currentUser, onMilestone]);

  // Offline support functions
  const queueOfflineUpdate = async (update: ProgressionUpdate) => {
    try {
      const key = `@progression_queue_${currentUser?.id}`;
      const existingQueue = await AsyncStorage.getItem(key);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      
      queue.push({
        ...update,
        timestamp: Date.now()
      });
      
      await AsyncStorage.setItem(key, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to queue offline update:', error);
    }
  };

  const syncPendingUpdates = async () => {
    if (!currentUser?.id || !networkStateRef.current) return;

    try {
      const key = `@progression_queue_${currentUser.id}`;
      const queueData = await AsyncStorage.getItem(key);
      
      if (!queueData) return;
      
      const queue = JSON.parse(queueData) as (ProgressionUpdate & { timestamp: number })[];
      
      // Process each queued update
      for (const update of queue) {
        await UserProgressionService.updateProgression(currentUser.id, update, true);
      }
      
      // Clear queue after successful sync
      await AsyncStorage.removeItem(key);
      
      setState(prev => ({
        ...prev,
        pendingUpdates: []
      }));
    } catch (error) {
      console.error('Failed to sync pending updates:', error);
    }
  };

  // Show reward alert
  const showRewardAlert = (reward: ProgressionReward) => {
    const rewardText = Object.entries(reward.rewards)
      .map(([key, value]) => {
        switch (key) {
          case 'gachaTickets': return `${value} biletów`;
          case 'experience': return `${value} XP`;
          case 'philosopherId': return 'Odblokowano nowego filozofa!';
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
    if (autoSync && currentUser?.id) {
      syncPendingUpdates();
    }
  }, [autoSync, currentUser?.id]);

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

  useEffect(() => {
    if (!currentUser?.id) return;

    const loadSummary = async () => {
      setLoading(true);
      try {
        const data = await UserProgressionService.getProgressionSummary(currentUser.id);
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
  }, [currentUser?.id]);

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