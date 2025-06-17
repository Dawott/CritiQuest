// src/hooks/useQuizSubmission.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import { Alert, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { EnhancedQuizService, QuizSubmissionOptions, QuizCompletionResult } from '@/services/quiz.service';
import  QuizDatabaseService  from '@/services/firebase/database.service';
import { currentUserAtom } from '@/store/atoms';
import { quizSessionAtom, quizProgressAtom, quizTimerAtom, quizHistoryAtom } from '@/store/quizAtoms';
import { StoredQuizResult } from '@/types/database.types';

export interface QuizSubmissionState {
  isSubmitting: boolean;
  isOffline: boolean;
  queuedCount: number;
  lastSubmission?: StoredQuizResult;
  error?: string;
}

export interface QuizSubmissionHookOptions {
  enableOfflineMode?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  onSuccess?: (result: StoredQuizResult) => void;
  onError?: (error: string) => void;
  onOfflineQueue?: (queuedCount: number) => void;
  showAlerts?: boolean;
}

export interface QuizSubmissionActions {
  submitQuiz: () => Promise<QuizCompletionResult>;
  retrySubmission: () => Promise<QuizCompletionResult>;
  processOfflineQueue: () => Promise<number>;
  clearError: () => void;
  getSubmissionHistory: (limit?: number) => Promise<StoredQuizResult[]>;
  getQuizAnalytics: () => Promise<any>;
}

export function useQuizSubmission(
  options: QuizSubmissionHookOptions = {}
): [QuizSubmissionState, QuizSubmissionActions] {
  const [user] = useAtom(currentUserAtom);
  const [session] = useAtom(quizSessionAtom);
  const [progress] = useAtom(quizProgressAtom);
  const [timer] = useAtom(quizTimerAtom);
  const [, setQuizHistory] = useAtom(quizHistoryAtom);

  const [state, setState] = useState<QuizSubmissionState>({
    isSubmitting: false,
    isOffline: false,
    queuedCount: 0
  });

  const quizService = useRef(new EnhancedQuizService());
  const databaseService = useRef(new QuizDatabaseService());
  const lastSubmissionRef = useRef<QuizCompletionResult | null>(null);

  const {
    enableOfflineMode = true,
    autoRetry = true,
    maxRetries = 3,
    onSuccess,
    onError,
    onOfflineQueue,
    showAlerts = true
  } = options;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setState(prev => ({
        ...prev,
        isOffline: !(state.isConnected && state.isInternetReachable)
      }));

      if (state.isConnected && state.isInternetReachable && prev.queuedCount > 0) {
        processOfflineQueue();
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      checkOfflineQueueCount();
    }
  }, [user]);

  const checkOfflineQueueCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const queuedCount = 0;
      setState(prev => ({ ...prev, queuedCount }));
    } catch (error) {
      console.error('Failed to check offline queue:', error);
    }
  }, [user]);

  const submitQuiz = useCallback(async (): Promise<QuizCompletionResult> => {
    if (!user || !session) {
      const error = 'No active user or quiz session';
      setState(prev => ({ ...prev, error }));
      return { success: false, error };
    }

    setState(prev => ({ 
      ...prev, 
      isSubmitting: true, 
      error: undefined 
    }));

    try {
      const submissionOptions: QuizSubmissionOptions = {
        enableOfflineMode,
        retryOnFailure: autoRetry,
        maxRetries,
        validateAnswers: true
      };

      const result = await quizService.current.submitQuiz(
        session,
        progress,
        timer,
        user.profile.email,
        submissionOptions
      );

      lastSubmissionRef.current = result;

      if (result.success && result.result) {
        setState(prev => ({ 
          ...prev, 
          lastSubmission: result.result,
          queuedCount: result.isOffline ? prev.queuedCount + 1 : prev.queuedCount
        }));

        setQuizHistory(prev => [result.result!, ...prev]);

        onSuccess?.(result.result);

        if (showAlerts && !result.isOffline) {
          Alert.alert(
            'Quiz Completed!',
            `Score: ${result.result.score}%\nExperience: +${result.result.experience}\nTickets: +${result.result.tickets}`,
            [{ text: 'OK' }]
          );
        } else if (showAlerts && result.isOffline) {
          Alert.alert(
            'Quiz Saved Offline',
            'Your quiz will be submitted when connection is restored.',
            [{ text: 'OK' }]
          );
        }

        if (result.isOffline) {
          onOfflineQueue?.(state.queuedCount + 1);
        }

      } else {
        const errorMessage = result.error || 'Unknown submission error';
        setState(prev => ({ ...prev, error: errorMessage }));
        onError?.(errorMessage);

        if (showAlerts) {
          Alert.alert(
            'Submission Failed',
            errorMessage,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Retry', onPress: () => retrySubmission() }
            ]
          );
        }
      }

      return result;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to submit quiz';
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);

      if (showAlerts) {
        Alert.alert(
          'Error',
          errorMessage,
          [{ text: 'OK' }]
        );
      }

      return { success: false, error: errorMessage };

    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [user, session, progress, timer, enableOfflineMode, autoRetry, maxRetries, onSuccess, onError, onOfflineQueue, showAlerts]);

  const retrySubmission = useCallback(async (): Promise<QuizCompletionResult> => {
    if (!lastSubmissionRef.current || lastSubmissionRef.current.success) {
      return { success: false, error: 'No failed submission to retry' };
    }

    return await submitQuiz();
  }, [submitQuiz]);

  const processOfflineQueue = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      setState(prev => ({ ...prev, isSubmitting: true }));

      const processedCount = await databaseService.current.processOfflineSubmissions(user.profile.email);
      
      setState(prev => ({ 
        ...prev, 
        queuedCount: Math.max(0, prev.queuedCount - processedCount) 
      }));

      if (processedCount > 0 && showAlerts) {
        Alert.alert(
          'Offline Quizzes Submitted',
          `Successfully submitted ${processedCount} queued quiz${processedCount > 1 ? 'es' : ''}.`,
          [{ text: 'OK' }]
        );
      }

      return processedCount;

    } catch (error: any) {
      console.error('Failed to process offline queue:', error);
      
      if (showAlerts) {
        Alert.alert(
          'Queue Processing Failed',
          'Some offline quizzes could not be submitted. They will be retried later.',
          [{ text: 'OK' }]
        );
      }

      return 0;

    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [user, showAlerts]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
  }, []);

  const getSubmissionHistory = useCallback(async (limit: number = 10): Promise<StoredQuizResult[]> => {
    if (!user) return [];

    try {
      const history = await databaseService.current.getUserQuizHistory(
        user.profile.email,
        limit
      );
      
      setQuizHistory(history);
      
      return history;
    } catch (error) {
      console.error('Failed to get submission history:', error);
      return [];
    }
  }, [user, setQuizHistory]);

  const getQuizAnalytics = useCallback(async () => {
    if (!user) return null;

    try {
      return await quizService.current.getUserQuizAnalytics(user.profile.email);
    } catch (error) {
      console.error('Failed to get quiz analytics:', error);
      return null;
    }
  }, [user]);

  const actions: QuizSubmissionActions = {
    submitQuiz,
    retrySubmission,
    processOfflineQueue,
    clearError,
    getSubmissionHistory,
    getQuizAnalytics
  };

  return [state, actions];
}

export function useOfflineQuizQueue() {
  const [queueCount, setQueueCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user] = useAtom(currentUserAtom);

  const checkQueueCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const databaseService = new QuizDatabaseService();
      const count = 0; 
      setQueueCount(count);
    } catch (error) {
      console.error('Failed to check queue count:', error);
    }
  }, [user]);

  const processQueue = useCallback(async () => {
    if (!user || isProcessing) return 0;

    setIsProcessing(true);
    try {
      const databaseService = new QuizDatabaseService();
      const processed = await databaseService.processOfflineSubmissions(user.profile.email);
      setQueueCount(prev => Math.max(0, prev - processed));
      return processed;
    } catch (error) {
      console.error('Failed to process queue:', error);
      return 0;
    } finally {
      setIsProcessing(false);
    }
  }, [user, isProcessing]);

  useEffect(() => {
    checkQueueCount();
  }, [checkQueueCount]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable && queueCount > 0) {
        processQueue();
      }
    });

    return unsubscribe;
  }, [queueCount, processQueue]);

  return {
    queueCount,
    isProcessing,
    processQueue,
    checkQueueCount
  };
}

export function useQuizValidation() {
  const [session] = useAtom(quizSessionAtom);
  const [progress] = useAtom(quizProgressAtom);

  const validateQuiz = useCallback(() => {
    if (!session) {
      return { isValid: false, errors: ['No active quiz session'] };
    }

    const errors: string[] = [];

    const answeredQuestions = Object.keys(session.answers).length;
    const totalQuestions = session.quiz.questions.length;
    
    if (answeredQuestions < totalQuestions) {
      errors.push(`${totalQuestions - answeredQuestions} question(s) remain unanswered`);
    }

    for (const [questionId, answers] of Object.entries(session.answers)) {
      if (!Array.isArray(answers) || answers.length === 0) {
        errors.push(`Invalid answer for question ${questionId}`);
      }
    }

    if (session.timeElapsed < 10) {
      errors.push('Quiz completed too quickly - please review your answers');
    }

    if (progress.questionsAnswered !== totalQuestions) {
      errors.push('Quiz progress mismatch - please restart the quiz');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }, [session, progress]);

  return { validateQuiz };
}