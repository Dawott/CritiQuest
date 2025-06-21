import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAtom } from 'jotai';
import { currentUserAtom } from 'client/src/store/atoms';
import { quizSessionAtom, quizProgressAtom, quizTimerAtom } from 'client/src/store/quizAtoms';
import DatabaseService from '@/services/firebase/database.service';
import { Quiz, Question, QuizType, DebateQuestion, Philosopher, DebateResult } from 'shared/types/database.types';
import { useProgression } from '@/hooks/useProgression';

// Components
//import QuizTimer from '@/components/quiz/QuizTimer';
import QuestionCard from 'client/src/components/quiz/QuestionCard';
import ScenarioCard from 'client/src/components/quiz/ScenarioCard';
import DebateCard from 'client/src/components/quiz/DebateCard';
import QuizResults from 'client/src/components/quiz/QuizResults';
import PhilosopherHelper from 'client/src/components/quiz/PhilosopherHelper';
import { useSelectedPhilosophers, DebatePhilosopher } from '@/hooks/selectedPhilosophers';
import quizService from 'server/src/services/quiz.service';
import { useQuizSubmission } from '@/hooks/useQuizSubmission';


const { width, height } = Dimensions.get('window');


export default function QuizScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { quizId, lessonId } = route.params as { quizId: string; lessonId?: string };
  const [user] = useAtom(currentUserAtom);
  const [session, setSession] = useAtom(quizSessionAtom);
  const [progress, setProgress] = useAtom(quizProgressAtom);
  const [timer] = useAtom(quizTimerAtom);
  const { selectedPhilosophers, loading: philosophersLoading } = useSelectedPhilosophers(user);
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(width));
  const { 
    trackQuizProgress, 
    completeQuiz,
    recentRewards 
  } = useProgression();
  const [submissionState, { submitQuiz }] = useQuizSubmission({
  onSuccess: (result) => {
    setShowResults(true);
  },
  onError: (error) => {
    console.error('Submission failed:', error);
  }
});
  
  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      const quiz = await DatabaseService.getQuiz(quizId);
      if (!quiz) throw new Error('Quiz not found');
      
      // Bonus za filozofa
      let philosopherBonus;
      if (quiz.philosopherBonus && user?.philosopherCollection?.[quiz.philosopherBonus.philosopherId]) {
        philosopherBonus = {
          philosopherId: quiz.philosopherBonus.philosopherId,
          multiplier: quiz.philosopherBonus.bonusMultiplier,
        };
      }
      
      setSession({
        quizId,
        quiz,
        currentQuestionIndex: 0,
        answers: {},
        timeElapsed: 0,
        hintsUsed: 0,
        philosopherBonus,
      });
      
      // Animacje
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading quiz:', error);
      navigation.goBack();
    }
  };

  const handleAnswer = useCallback((questionId: string, selectedAnswers: string[]) => {
    if (!session) return;
    
    setSession(prev => ({
      ...prev!,
      answers: {
        ...prev!.answers,
        [questionId]: selectedAnswers,
      },
    }));

    // Sprawdź poprawność
    const currentQuestion = session.quiz.questions[session.currentQuestionIndex];
    const isCorrect = selectedAnswers.sort().join(',') === currentQuestion.correctAnswers.sort().join(',');
    
    // Progres
    setProgress(prev => ({
      questionsAnswered: prev.questionsAnswered + 1,
      correctStreak: isCorrect ? prev.correctStreak + 1 : 0,
      criticalThinkingScore: prev.criticalThinkingScore + (isCorrect ? currentQuestion.points : 0),
    }));
    
    // Feedback (haptyka)
    if (isCorrect) {
      // Success
      animateSuccess();
    } else {
      // Wyjaśnienie
      showExplanation(currentQuestion);
    }
    
    // Przejdź do kolejnego
    setTimeout(() => {
      if (session.currentQuestionIndex < session.quiz.questions.length - 1) {
        nextQuestion();
      } else {
        finishQuiz();
      }
    }, isCorrect ? 1500 : 3000);
  }, [session]);

  const nextQuestion = () => {
    if (!session) return;
    
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
    
    setSession(prev => ({
      ...prev!,
      currentQuestionIndex: prev!.currentQuestionIndex + 1,
    }));
  };

  const finishQuiz = async () => {
  if (!session || !user) return;
  
  try {
    const result = quizService.calculateQuizResults(session, progress, timer);
    
    const submissionResult = await submitQuiz();
    
    if (submissionResult.success) {
      await completeQuiz(
        quizId,
        result.score,
        timer.elapsed,
        result.score === 100
      );
      
      (navigation as any).navigate('QuizResults', { 
        quizId, 
        result: submissionResult.result,
        rewards: recentRewards,
        perfectScore: result.score === 100,
        timeBonus: timer.elapsed < (session.quiz.timeLimit || Infinity) * 0.5
      });
    } else {
      console.error('Zapis nieudany:', submissionResult.error);
      
      Alert.alert(
        'Zapis nieudany',
        'Quiz nie mógł zostać zapisany, czy chcesz spróbować?',
        [
          { text: 'Ponów', onPress: () => finishQuiz() },
          { text: 'Anuluj', style: 'cancel' }
        ]
      );
    }
  } catch (error) {
    console.error('Nie udało się ukończyć quizu:', error);
  }
};

const handleDebateResult = useCallback((questionId: string, result: DebateResult) => {
  if (!session) return;
  const score = result.conviction_score;
  const isWinner = result.winner === 'user';
  
  const earnedPoints = Math.round((score / 100) * (session.quiz.questions[session.currentQuestionIndex].points || 50));

  setProgress(prev => ({
    questionsAnswered: prev.questionsAnswered + 1,
    correctStreak: isWinner ? prev.correctStreak + 1 : 0,
    criticalThinkingScore: prev.criticalThinkingScore + earnedPoints,
  }));

  setSession(prev => {
    if (!prev) return prev;
    
    return {
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: [result.winner],
      },
      debateResults: {
        ...prev.debateResults,
        [questionId]: result,
      },
    };
  });
  
  setTimeout(() => {
    if (session.currentQuestionIndex < session.quiz.questions.length - 1) {
      nextQuestion();
    } else {
      finishQuiz();
    }
  }, 2000);
}, [session, nextQuestion, finishQuiz]);


  const renderQuizContent = () => {
    if (!session || loading) return null;
    
    const currentQuestion = session.quiz.questions[session.currentQuestionIndex];
    
    switch (session.quiz.type) {
      case 'debate':
      if (currentQuestion.type === 'debate' && currentQuestion.debateConfig) {
        const debateTopic = {
          id: currentQuestion.id,
          title: currentQuestion.debateConfig.title,
          context: currentQuestion.debateConfig.context,
          question: currentQuestion.debateConfig.question,
          schools_involved: currentQuestion.debateConfig.schools_involved,
        };
        
        // Mock na demo
        const opponentPhilosophers: DebatePhilosopher[] = [{
          id: 'opponent_kant',
          name: 'Immanuel Kant',
          school: 'Idealizm Niemiecki',
          era: 'Oświecenie',
          rarity: 'legendary' as const,
          baseStats: {
            logic: 95,
            wisdom: 100,
            rhetoric: 85,
            influence: 98,
            originality: 70,
          },
          description: 'Wielki niemiecki myśliciel znany z idei Imperatywu Kategorycznego',
          imageUrl: '',
          quotes: ['Istnieje tylko jeden imperatyw kategoryczny: postępuj tylko wedle takiej maksymy, co do której możesz zarazem chcieć, żeby stała się powszechnym prawem.'],
          specialAbility: {
            name: 'Imperatyw Kategoryczny',
            description: 'Uniwersalne Prawo Moralne',
            effect: 'Siła argumentów'
          },
          avatar: '👨‍🎓',
          signature_argument: 'Imperatyw kategoryczny',
          rhetoric: 85,
        }];
        
        return (
          <DebateCard
            topic={debateTopic}
            userPhilosophers={selectedPhilosophers}
            opponentPhilosophers={opponentPhilosophers}
            onDebateComplete={(result) => handleDebateResult(currentQuestion.id, result)}
          />
        );
      }
      return null;

      case 'multiple-choice':
        return (
          <QuestionCard
            question={currentQuestion}
            onAnswer={handleAnswer}
            showHint={showHint}
            philosopherBonus={session.philosopherBonus}
          />
        );
      
      case 'scenario':
        return (
          <ScenarioCard
            scenario={currentQuestion}
            onChoice={handleAnswer}
            philosopherContext={session.philosopherBonus}
          />
        );
      default:
        return null;
    }
  };

  if (showResults && session) {
    return (
      <QuizResults
        result={{
          score: Math.round((progress.criticalThinkingScore / session.quiz.questions.reduce((sum, q) => sum + q.points, 0)) * 100),
          totalPoints: session.quiz.questions.reduce((sum, q) => sum + q.points, 0),
          correctAnswers: progress.questionsAnswered,
          totalQuestions: session.quiz.questions.length,
          timeSpent: timer.elapsed,
          philosophicalInsights: generateInsights(session, progress),
          rewards: {
            experience: 100,
            tickets: 2,
          },
        }}
        onRetry={() => {
          setShowResults(false);
          setProgress({
            questionsAnswered: 0,
            correctStreak: 0,
            criticalThinkingScore: 0,
          });
          loadQuiz();
        }}
        onExit={() => navigation.goBack()}
      />
    );
  }


  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#F3F4F6" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.quizTitle}>{session?.quiz.title || 'Loading...'}</Text>
            <View style={styles.progressIndicator}>
              <Text style={styles.progressText}>
                {session ? `${session.currentQuestionIndex + 1}/${session.quiz.questions.length}` : '...'}
              </Text>
            </View>
          </View>
          
          {/*{session?.quiz.timeLimit && <QuizTimer limit={session.quiz.timeLimit} />}*/}
        </View>

        {/* Progress Bar */}
        {session && (
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((session.currentQuestionIndex + 1) / session.quiz.questions.length) * 100}%` }
              ]} 
            />
          </View>
        )}

        {/* Helper */}
        {session?.philosopherBonus && (
          <PhilosopherHelper
            philosopherId={session.philosopherBonus.philosopherId}
            onHintRequest={() => setShowHint(true)}
          />
        )}

        {/* Quiz */}
        <Animated.View 
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {renderQuizContent()}
        </Animated.View>
        {/* Show submission loading state */}
        {submissionState.isSubmitting && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Submitting quiz...</Text>
          </View>
        )}
        
        {/* Show offline indicator */}
        {submissionState.isOffline && (
          <View style={styles.offlineIndicator}>
            <Text style={styles.offlineText}>Offline - results will sync when connected</Text>
          </View>
        )}

        {/* Streak*/}
        {progress.correctStreak > 1 && (
          <View style={styles.streakIndicator}>
            <Ionicons name="flame" size={20} color="#F59E0B" />
            <Text style={styles.streakText}>{progress.correctStreak} streak!</Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

  

// Helper 
const animateSuccess = () => {
  // Success animation
};

const showExplanation = (question: Question) => {
  // Modal z wyjaśnieniem
};

const selectRewardPhilosopher = async () => {
  // Logic to select appropriate philosopher as reward
  return null;
};

const generateInsights = (session: any, progress: any) => {
  // Insighty
  return [
    "Zaprezentowano doskonałe umiejętności krytycznego myślenia",
    "Silne zrozumienie zasad etyki",
  ];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  progressIndicator: {
    marginTop: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#334155',
    marginHorizontal: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  streakIndicator: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#F3F4F6',
    marginTop: 12,
  },
  offlineIndicator: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#F59E0B',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});