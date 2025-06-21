// src/hooks/useQuizSubmission.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import { Alert, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import QuizService from 'server/src/services/quiz.service'; 
import { QuizDatabaseService, StoredQuizResult } from '@/services/firebase/quiz-database.service'; 
import { currentUserAtom } from 'client/src/store/atoms';
import { quizSessionAtom, quizProgressAtom, quizTimerAtom, quizHistoryAtom } from 'client/src/store/quizAtoms';

export interface QuizSubmissionOptions {
  enableOfflineMode?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
  validateAnswers?: boolean;
}

export interface QuizCompletionResult {
  success: boolean;
  result?: StoredQuizResult;
  error?: string;
  isOffline?: boolean;
}

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
    const unsubscribe = NetInfo.addEventListener(netState => {
      setState(prev => ({
        ...prev,
        isOffline: !(netState.isConnected && netState.isInternetReachable)
      }));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!state.isOffline && state.queuedCount > 0 && !state.isSubmitting) {
      processOfflineQueue();
    }
  }, [state.isOffline, state.queuedCount, state.isSubmitting]);

  useEffect(() => {
    if (user) {
      checkOfflineQueueCount();
    }
  }, [user]);

  const checkOfflineQueueCount = useCallback(async () => {
    if (!user) return;
    
    try {
      // const queuedCount = await databaseService.current.getOfflineQueueCount(user.profile.email);
      const queuedCount = 0; // Placeholder
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
      const submission = {
        quizId: session.quizId,
        lessonId: session.quiz.lessonId,
        userId: user.profile.email,
        score: Math.round((progress.criticalThinkingScore / 
          session.quiz.questions.reduce((sum, q) => sum + q.points, 0)) * 100),
        timeSpent: timer.elapsed,
        answers: session.answers,
        debateResults: session.debateResults,
        hintsUsed: session.hintsUsed || 0,
        philosopherBonus: session.philosopherBonus,
        scenarioPath: session.scenarioPath,
        metadata: {
          deviceType: 'android' as const,
          appVersion: '1.0.0',
          submittedAt: Date.now(),
        }
      };

      const result = await databaseService.current.submitCompleteQuizResult(submission);

      setState(prev => ({ 
        ...prev, 
        lastSubmission: result,
        queuedCount: 0 // Reset kolejki po sukcesie
      }));

      setQuizHistory(prev => [result, ...prev]);
      onSuccess?.(result);

      if (showAlerts) {
        Alert.alert(
          'Quiz Completed!',
          `Score: ${result.score}%\nExperience: +${result.experience}\nTickets: +${result.tickets}`,
          [{ text: 'OK' }]
        );
      }

      return { success: true, result };

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to submit quiz';
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

      return { success: false, error: errorMessage };

    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [user, session, progress, timer, onSuccess, onError, showAlerts]);

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
      return await databaseService.current.getUserQuizHistory(user.profile.email, limit);
    } catch (error) {
      console.error('Failed to get submission history:', error);
      return [];
    }
  }, [user]);

  const getQuizAnalytics = useCallback(async () => {
    if (!user) return null;
    
    try {
      // return await databaseService.current.getQuizAnalytics(user.profile.email);
      return null; // Placeholder
    } catch (error) {
      console.error('Failed to get quiz analytics:', error);
      return null;
    }
  }, [user]);

  return [
    state,
    {
      submitQuiz,
      retrySubmission,
      processOfflineQueue,
      clearError,
      getSubmissionHistory,
      getQuizAnalytics,
    }
  ];
}

export function useOfflineQuizQueue() {
  const [queueCount, setQueueCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user] = useAtom(currentUserAtom);

  const databaseService = useRef(new QuizDatabaseService());

  const checkQueueCount = useCallback(async () => {
    if (!user) return;
    try {
      // const count = await databaseService.current.getOfflineQueueCount(user.profile.email);
      const count = 0; // Placeholder
      setQueueCount(count);
    } catch (error) {
      console.error('Failed to check queue count:', error);
    }
  }, [user]);

  const processQueue = useCallback(async () => {
    if (!user || isProcessing) return 0;

    setIsProcessing(true);
    try {
      const processed = await databaseService.current.processOfflineSubmissions(user.profile.email);
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
/*
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable && queueCount > 0) {
        processQueue();
      }
    });

    return unsubscribe;
  }, [queueCount, processQueue]);*/

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