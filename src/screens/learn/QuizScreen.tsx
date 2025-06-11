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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAtom } from 'jotai';
import { currentUserAtom } from '@/store/atoms';
import { quizSessionAtom, quizProgressAtom, quizTimerAtom } from '@/store/quizAtoms';
import DatabaseService from '@/services/firebase/database.service';
import { Quiz, Question, QuizType, DebateQuestion, Philosopher } from '@/types/database.types';

// Components
import QuizTimer from '@/components/quiz/QuizTimer';
import QuestionCard from '@/components/quiz/QuestionCard';
import ScenarioCard from '@/components/quiz/ScenarioCard';
import DebateCard from '@/components/quiz/DebateCard.tsx';
import QuizResults from '@/components/quiz/QuizResults';
import PhilosopherHelper from '@/components/quiz/PhilosopherHelper';

const { width, height } = Dimensions.get('window');

export default function QuizScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { quizId, lessonId } = route.params as { quizId: string; lessonId?: string };
  
  const [user] = useAtom(currentUserAtom);
  const [session, setSession] = useAtom(quizSessionAtom);
  const [progress, setProgress] = useAtom(quizProgressAtom);
  const [timer] = useAtom(quizTimerAtom);
  
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(width));
  
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
    
    const totalPoints = session.quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const earnedPoints = progress.criticalThinkingScore;
    const score = Math.round((earnedPoints / totalPoints) * 100);
    
    // Bonus + wynik
    let experience = Math.round(earnedPoints * 10);
    let tickets = 0;
    
    if (session.philosopherBonus) {
      experience = Math.round(experience * session.philosopherBonus.multiplier);
    }
    
    if (score >= session.quiz.passingScore) {
      tickets = Math.ceil(score / 20); // ticket za wynik >20%
    }
    
    // Nagroda specjalna
    let newPhilosopher;
    if (score === 100 && progress.correctStreak === session.quiz.questions.length) {
      // TBD - nagroda za perfekcyjny wynik to filozof, ale trzeba go dobrać
      newPhilosopher = await selectRewardPhilosopher();
    }
    
    const result = {
      score,
      totalPoints,
      correctAnswers: progress.questionsAnswered,
      totalQuestions: session.quiz.questions.length,
      timeSpent: timer.elapsed,
      philosophicalInsights: generateInsights(session, progress),
      rewards: {
        experience,
        tickets,
        newPhilosopher,
      },
    };
    
    // Submit
    await DatabaseService.submitQuizResult(
      user.profile.email,
      quizId,
      score,
      timer.elapsed
    );
    
    setShowResults(true);
  };

  const getSelectedTeam = useCallback(async (): Promise<Philosopher[]> => {
  if (!user?.philosopherCollection) return [];
  
  try {
    const ownedPhilosopherIds = Object.keys(user.philosopherCollection);
    
    if (ownedPhilosopherIds.length === 0) {
      return [{
        id: 'default_socrates',
        name: 'Sokrates',
        school: 'Filozofia Klasyczna', 
        era: 'Starożytność',
        rarity: 'common',
        stats: {
          logic: 75,
          ethics: 80,
          metaphysics: 70,
          epistemology: 90,
          aesthetics: 60,
          mind: 85,
          language: 80,
          science: 50,
          social: 75,
        },
        avatar: '🏛️',
        signature_argument: 'Wiem, że nic nie wiem',
      }];
    }
    
    const firstPhilosopherId = ownedPhilosopherIds[0];
    const ownedPhilosopher = user.philosopherCollection[firstPhilosopherId];
    
    const fullPhilosopherData = await DatabaseService.getPhilosopher(firstPhilosopherId);
    
    if (fullPhilosopherData) {
      return [{
        ...fullPhilosopherData,
        id: firstPhilosopherId,
        stats: ownedPhilosopher.stats,
      }];
    }
    
    return [{
      id: firstPhilosopherId,
      name: getPhilosopherNameFallback(firstPhilosopherId),
      school: ownedPhilosopher.school || 'Nieznana Szkoła',
      era: 'Era Filozoficzna',
      rarity: 'common',
      stats: ownedPhilosopher.stats,
      avatar: '🏛️',
      signature_argument: 'Filozoficzny argument',
    }];
    
  } catch (error) {
    console.error('Error fetching philosopher data:', error);
    
    return [{
      id: 'error_default',
      name: 'Domyślny Filozof',
      school: 'Ogólna Filozofia',
      era: 'Współczesność',
      rarity: 'common',
      stats: {
        logic: 60,
        ethics: 60,
        metaphysics: 60,
        epistemology: 60,
        aesthetics: 60,
        mind: 60,
        language: 60,
        science: 60,
        social: 60,
      },
      avatar: '🎓',
      signature_argument: 'Myślenie krytyczne',
    }];
  }
}, [user]);

const getPhilosopherNameFallback = (philosopherId: string): string => {
  const nameMap: Record<string, string> = {
    'socrates': 'Sokrates',
    'plato': 'Platon',
    'aristotle': 'Arystoteles', 
    'kant': 'Immanuel Kant',
    'nietzsche': 'Friedrich Nietzsche',
    'descartes': 'René Descartes',
    'hume': 'David Hume',
    'spinoza': 'Baruch Spinoza',
    'wittgenstein': 'Ludwig Wittgenstein',
    'sartre': 'Jean-Paul Sartre',
    'beauvoir': 'Simone de Beauvoir',
    'foucault': 'Michel Foucault',
    'mill': 'John Stuart Mill',
    'rawls': 'John Rawls',
    'nozick': 'Robert Nozick',
  };
  
  return nameMap[philosopherId] || 'Filozof';
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
        return (
          <DebateCard
            question={currentQuestion as DebateQuestion}
            userPhilosophers={getSelectedTeam()}
            onAnswer={handleDebateResult}
            philosopherBonus={session.philosopherBonus}
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
          
          {session?.quiz.timeLimit && <QuizTimer limit={session.quiz.timeLimit} />}
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
});