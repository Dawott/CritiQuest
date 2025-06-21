import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useAtom } from 'jotai';
import { currentUserAtom } from '../../../../client/src/store/atoms';
import DatabaseService from '../../services/firebase/database.service';
import { LessonWithId } from '../../../../shared/types/database.types';
import { RouteProp } from '@react-navigation/native';
import { LearnStackParamList } from '../../../../client/src/navigation/types';

type LessonDetailScreenRouteProp = RouteProp<LearnStackParamList, 'LessonDetail'>;

const LessonDetailScreen: React.FC = () => {
  const route = useRoute<LessonDetailScreenRouteProp>();
  const navigation = useNavigation();
  const { lessonId } = route.params;
  const [user] = useAtom(currentUserAtom);
  
  const [lesson, setLesson] = useState<LessonWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLesson();
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const lessonData = await DatabaseService.getLesson(lessonId);
      if (!lessonData) {
        setError('Lekcja nie została znaleziona');
        return;
      }

      // Convert to LessonWithId format
      const lessonWithStatus: LessonWithId = {
        ...lessonData,
        id: lessonId,
        source: 'internal',
        isCompleted: user?.progression?.completedLessons?.includes(lessonId) || false,
      };

      setLesson(lessonWithStatus);
    } catch (err) {
      console.error('Error loading lesson:', err);
      setError('Nie udało się załadować lekcji');
    } finally {
      setLoading(false);
    }
  };

  const handleStartLesson = () => {
    if (!lesson) return;
    
    // Navigate to lesson viewer - you might want to use LessonViewerScreen or create a new one
    (navigation as any).navigate('LessonViewer', { 
      lessonId: lesson.id,
      userId: user?.profile?.email // or however you identify users
    });
  };

  const handleStartQuiz = () => {
    if (!lesson?.quiz) return;
    
    (navigation as any).navigate('QuizScreen', {
      quizId: lesson.quiz,
      lessonId: lesson.id,
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#10B981';
      case 'intermediate': return '#F59E0B';
      case 'advanced': return '#EF4444';
      case 'expert': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'Początkujący';
      case 'intermediate': return 'Średniozaawansowany';
      case 'advanced': return 'Zaawansowany';
      case 'expert': return 'Ekspert';
      default: return difficulty;
    }
  };

  const getStageLabel = (stage: string) => {
    const stageLabels: Record<string, string> = {
      'ancient-philosophy': 'Filozofia Starożytna',
      'medieval-philosophy': 'Filozofia Średniowieczna',
      'renaissance-philosophy': 'Renesans i Humanizm',
      'modern-philosophy': 'Filozofia Nowożytna',
      'contemporary-philosophy': 'Filozofia Współczesna',
      'ethics': 'Etyka',
      'logic': 'Logika',
      'metaphysics': 'Metafizyka',
    };
    return stageLabels[stage] || stage;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Ładowanie lekcji...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !lesson) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Lekcja nie została znaleziona'}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryText}>Wróć</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.stageInfo}>
            <Text style={styles.stageText}>{getStageLabel(lesson.stage)}</Text>
            <View style={styles.statusBadge}>
              {lesson.isCompleted ? (
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              ) : (
                <Ionicons name="play-circle" size={16} color="#6366F1" />
              )}
              <Text style={[
                styles.statusText,
                lesson.isCompleted ? styles.completedText : styles.availableText
              ]}>
                {lesson.isCompleted ? 'Ukończone' : 'Dostępne'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.lessonDescription}>{lesson.description}</Text>
        </View>

        {/* Meta Information */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={20} color="#9CA3AF" />
              <Text style={styles.metaText}>{lesson.estimatedTime} min</Text>
            </View>
            
            <View style={styles.metaItem}>
              <View style={[
                styles.difficultyDot, 
                { backgroundColor: getDifficultyColor(lesson.difficulty) }
              ]} />
              <Text style={styles.metaText}>{getDifficultyLabel(lesson.difficulty)}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="library-outline" size={20} color="#9CA3AF" />
              <Text style={styles.metaText}>{lesson.content.sections?.length || 0} sekcji</Text>
            </View>
            
            <View style={styles.metaItem}>
              <Ionicons name="trophy-outline" size={20} color="#9CA3AF" />
              <Text style={styles.metaText}>{lesson.rewards?.experience || 0} XP</Text>
            </View>
          </View>
        </View>

        {/* Philosophical Concepts */}
        {lesson.philosophicalConcepts && lesson.philosophicalConcepts.length > 0 && (
          <View style={styles.conceptsSection}>
            <Text style={styles.sectionTitle}>Kluczowe pojęcia</Text>
            <View style={styles.conceptsContainer}>
              {lesson.philosophicalConcepts.map((concept, index) => (
                <View key={index} style={styles.conceptBadge}>
                  <Text style={styles.conceptText}>{concept}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Required Philosopher */}
        {lesson.requiredPhilosopher && (
          <View style={styles.requirementSection}>
            <Text style={styles.sectionTitle}>Wymagania</Text>
            <View style={styles.requirementCard}>
              <Ionicons name="person-outline" size={24} color="#F59E0B" />
              <View style={styles.requirementText}>
                <Text style={styles.requirementTitle}>Wymagany filozof</Text>
                <Text style={styles.requirementSubtitle}>{lesson.requiredPhilosopher}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Rewards */}
        <View style={styles.rewardsSection}>
          <Text style={styles.sectionTitle}>Nagrody</Text>
          <View style={styles.rewardsContainer}>
            <View style={styles.rewardItem}>
              <Ionicons name="star-outline" size={20} color="#F59E0B" />
              <Text style={styles.rewardText}>{lesson.rewards?.experience || 0} Doświadczenia</Text>
            </View>
            {lesson.rewards?.gachaTickets && lesson.rewards.gachaTickets > 0 && (
              <View style={styles.rewardItem}>
                <Ionicons name="ticket-outline" size={20} color="#8B5CF6" />
                <Text style={styles.rewardText}>{lesson.rewards.gachaTickets} Biletów Wyroczni</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {lesson.isCompleted ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleStartLesson}
            >
              <Ionicons name="refresh-outline" size={20} color="#6366F1" />
              <Text style={styles.secondaryButtonText}>Powtórz</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleStartQuiz}
            >
              <Ionicons name="school-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Quiz</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton, styles.fullWidth]}
            onPress={handleStartLesson}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Rozpocznij lekcję</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  stageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stageText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedText: {
    color: '#10B981',
  },
  availableText: {
    color: '#6366F1',
  },
  lessonTitle: {
    color: '#F3F4F6',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  lessonDescription: {
    color: '#D1D5DB',
    fontSize: 16,
    lineHeight: 24,
  },
  metaContainer: {
    backgroundColor: '#1F2937',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  metaText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  conceptsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#F3F4F6',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  conceptsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conceptBadge: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  conceptText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '500',
  },
  requirementSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  requirementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  requirementText: {
    flex: 1,
  },
  requirementTitle: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '600',
  },
  requirementSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  rewardsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  rewardsContainer: {
    gap: 8,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 20,
  },
  actionContainer: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    flex: 1,
  },
  fullWidth: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#6366F1',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LessonDetailScreen;