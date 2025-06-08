import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import { QuizResult } from '@/store/quizAtoms';

const { width, height } = Dimensions.get('window');

interface QuizResultsProps {
  result: QuizResult;
  onRetry: () => void;
  onExit: () => void;
}

export default function QuizResults({ result, onRetry, onExit }: QuizResultsProps) {
  const [showRewards, setShowRewards] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rewardAnimations = useRef(result.rewards.tickets > 0 ? 
    Array(3).fill(0).map(() => new Animated.Value(0)) : []
  ).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate score progress
    setTimeout(() => {
      Animated.timing(progressAnim, {
        toValue: result.score / 100,
        duration: 1500,
        useNativeDriver: false,
      }).start(() => {
        setShowRewards(true);
        animateRewards();
      });
    }, 500);
  }, []);

  const animateRewards = () => {
    const animations = rewardAnimations.map((anim, index) =>
      Animated.sequence([
        Animated.delay(index * 200),
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(animations).start(() => {
      setShowInsights(true);
    });
  };

  const getGradeInfo = () => {
    if (result.score >= 95) return { grade: 'S', color: '#FCD34D', label: 'Doskonale!' };
    if (result.score >= 90) return { grade: 'A', color: '#10B981', label: 'Świetnie!' };
    if (result.score >= 80) return { grade: 'B', color: '#3B82F6', label: 'Bardzo dobrze!' };
    if (result.score >= 70) return { grade: 'C', color: '#8B5CF6', label: 'Dobrze' };
    if (result.score >= 60) return { grade: 'D', color: '#F59E0B', label: 'Zaliczone' };
    return { grade: 'F', color: '#EF4444', label: 'Spróbuj ponownie' };
  };

  const gradeInfo = getGradeInfo();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Wyniki Quizu</Text>
        </View>

        {/* Score */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreCircle}>
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                styles.progressCircle,
                {
                  transform: [
                    {
                      rotate: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={[gradeInfo.color, `${gradeInfo.color}80`]}
                style={styles.progressGradient}
              />
            </Animated.View>
            
            <View style={styles.scoreContent}>
              <Text style={[styles.grade, { color: gradeInfo.color }]}>
                {gradeInfo.grade}
              </Text>
              <Text style={styles.scoreText}>{result.score}%</Text>
              <Text style={styles.scoreLabel}>{gradeInfo.label}</Text>
            </View>
          </View>

          {/* Celebration Animation */}
          {result.score >= 80 && (
            <LottieView
              source={require('@/assets/animations/confetti.json')}
              autoPlay
              loop={false}
              style={styles.celebrationAnimation}
            />
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="checkmark-circle"
            label="Poprawne"
            value={`${result.correctAnswers}/${result.totalQuestions}`}
            color="#10B981"
          />
          <StatCard
            icon="time"
            label="Czas"
            value={formatTime(result.timeSpent)}
            color="#3B82F6"
          />
          <StatCard
            icon="star"
            label="Punkty"
            value={`${Math.round(result.score * result.totalPoints / 100)}/${result.totalPoints}`}
            color="#F59E0B"
          />
        </View>

        {/* NAgrody */}
        {showRewards && (
          <View style={styles.rewardsSection}>
            <Text style={styles.sectionTitle}>Nagrody</Text>
            <View style={styles.rewardsContainer}>
              <Animated.View
                style={[
                  styles.rewardCard,
                  {
                    opacity: rewardAnimations[0],
                    transform: [
                      { scale: rewardAnimations[0] },
                      {
                        translateY: rewardAnimations[0].interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.1)']}
                  style={styles.rewardGradient}
                >
                  <MaterialCommunityIcons name="star-four-points" size={32} color="#6366F1" />
                  <Text style={styles.rewardValue}>+{result.rewards.experience}</Text>
                  <Text style={styles.rewardLabel}>XP</Text>
                </LinearGradient>
              </Animated.View>

              {result.rewards.tickets > 0 && (
                <Animated.View
                  style={[
                    styles.rewardCard,
                    {
                      opacity: rewardAnimations[1],
                      transform: [
                        { scale: rewardAnimations[1] },
                        {
                          translateY: rewardAnimations[1].interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['rgba(245, 158, 11, 0.1)', 'rgba(251, 191, 36, 0.1)']}
                    style={styles.rewardGradient}
                  >
                    <MaterialCommunityIcons name="ticket-percent" size={32} color="#F59E0B" />
                    <Text style={styles.rewardValue}>+{result.rewards.tickets}</Text>
                    <Text style={styles.rewardLabel}>Bilety</Text>
                  </LinearGradient>
                </Animated.View>
              )}

              {result.rewards.newPhilosopher && (
                <Animated.View
                  style={[
                    styles.rewardCard,
                    styles.philosopherReward,
                    {
                      opacity: rewardAnimations[2],
                      transform: [
                        { scale: rewardAnimations[2] },
                        {
                          translateY: rewardAnimations[2].interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['rgba(167, 139, 250, 0.1)', 'rgba(196, 181, 253, 0.1)']}
                    style={styles.rewardGradient}
                  >
                    <Text style={styles.philosopherEmoji}>🏛️</Text>
                    <Text style={styles.rewardValue}>NOWY!</Text>
                    <Text style={styles.rewardLabel}>Filozof</Text>
                  </LinearGradient>
                </Animated.View>
              )}
            </View>
          </View>
        )}

        {/* Insights */}
        {showInsights && result.philosophicalInsights.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>Filozoficzne spostrzeżenia</Text>
            {result.philosophicalInsights.map((insight, index) => (
              <View key={index} style={styles.insightCard}>
                <Ionicons name="bulb" size={20} color="#A78BFA" />
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <LinearGradient
              colors={['transparent', 'transparent']}
              style={[styles.buttonGradient, styles.retryGradient]}
            >
              <Ionicons name="refresh" size={20} color="#6366F1" />
              <Text style={styles.retryText}>Spróbuj ponownie</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.continueButton} onPress={onExit}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.buttonGradient}
            >
              <Text style={styles.continueText}>Kontynuuj</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// Helpery
function StatCard({ icon, label, value, color }: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Helper Functions
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  scoreSection: {
    alignItems: 'center',
    marginVertical: 32,
    position: 'relative',
  },
  scoreCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  progressCircle: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  progressGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  scoreContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  grade: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 4,
  },
  celebrationAnimation: {
    position: 'absolute',
    width: width,
    height: 300,
    top: -50,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  rewardsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 16,
  },
  rewardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rewardCard: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  philosopherReward: {
    maxWidth: 120,
  },
  rewardGradient: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  rewardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F3F4F6',
    marginTop: 8,
  },
  rewardLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  philosopherEmoji: {
    fontSize: 32,
  },
  insightsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  insightText: {
    fontSize: 14,
    color: '#E0E7FF',
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  retryButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  retryGradient: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});