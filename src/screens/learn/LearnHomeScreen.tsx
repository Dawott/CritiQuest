import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useAtom } from 'jotai';
import { currentUserAtom } from '@/store/atoms';
import DatabaseService from '@/services/firebase/database.service';
import { LessonWithId } from '@/types/database.types';

const { width } = Dimensions.get('window');

interface LessonGroup {
  stage: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  lessons: LessonWithId[];
  completedCount: number;
}

interface QuickStats {
  totalLessonsCompleted: number;
  currentStreak: number;
  philosophersUnlocked: number;
  averageScore: number;
}

const LearnHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [user] = useAtom(currentUserAtom);
  const [lessonGroups, setLessonGroups] = useState<LessonGroup[]>([]);
  const [recentLessons, setRecentLessons] = useState<LessonWithId[]>([]);
  const [quickStats, setQuickStats] = useState<QuickStats>({
    totalLessonsCompleted: 0,
    currentStreak: 0,
    philosophersUnlocked: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLearningData();
  }, [user]);

  const loadLearningData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      await Promise.all([
        loadLessonGroups(),
        loadRecentLessons(),
        loadQuickStats(),
      ]);
    } catch (error) {
      console.error('Error loading learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLessonGroups = async () => {
    if (!user) return;
    
    try {
      // Since there's no getAllLessons method, we'll need to fetch by stages
      // Define the stages we want to fetch
      const stages = [
        'ancient-philosophy',
        'medieval-philosophy', 
        'renaissance-philosophy',
        'modern-philosophy',
        'contemporary-philosophy',
        'ethics',
        'logic',
        'metaphysics'
      ];
      
      const completedLessons = user.progression?.completedLessons || [];
      const lessonsByStage: Record<string, LessonWithId[]> = {};
      
      // Fetch lessons for each stage
      for (const stage of stages) {
        try {
          const stageLessons = await DatabaseService.getLessonsByStage(stage);
          if (stageLessons.length > 0) {
            lessonsByStage[stage] = stageLessons.map(lesson => ({
              ...lesson,
              source: 'internal' as const,
            }));
          }
        } catch (error) {
          console.error(`Error fetching lessons for stage ${stage}:`, error);
        }
      }
      
      // Define stage metadata
      const stageMetadata = {
        'ancient-philosophy': {
          title: 'Filozofia Starożytna',
          description: 'Fundamenty myśli filozoficznej',
          icon: 'library-outline',
          color: '#F59E0B',
        },
        'medieval-philosophy': {
          title: 'Filozofia Średniowieczna',
          description: 'Synteza wiary i rozumu',
          icon: 'castle-outline',
          color: '#8B5CF6',
        },
        'renaissance-philosophy': {
          title: 'Renesans i Humanizm',
          description: 'Powrót do człowieka',
          icon: 'flower-outline',
          color: '#10B981',
        },
        'modern-philosophy': {
          title: 'Filozofia Nowożytna',
          description: 'Rewolucja naukowa i oświecenie',
          icon: 'telescope-outline',
          color: '#3B82F6',
        },
        'contemporary-philosophy': {
          title: 'Filozofia Współczesna',
          description: 'Nowe wyzwania i perspektywy',
          icon: 'rocket-outline',
          color: '#EF4444',
        },
        'ethics': {
          title: 'Etyka',
          description: 'Nauka o dobru i złu',
          icon: 'heart-outline',
          color: '#10B981',
        },
        'logic': {
          title: 'Logika',
          description: 'Sztuka poprawnego rozumowania',
          icon: 'git-branch-outline',
          color: '#3B82F6',
        },
        'metaphysics': {
          title: 'Metafizyka',
          description: 'Natura rzeczywistości',
          icon: 'infinite-outline',
          color: '#8B5CF6',
        },
      };
      
      // Create lesson groups only for stages that have lessons
      const groups: LessonGroup[] = Object.entries(lessonsByStage)
        .filter(([_, lessons]) => lessons.length > 0)
        .map(([stage, lessons]) => {
          const metadata = stageMetadata[stage as keyof typeof stageMetadata] || {
            title: stage.charAt(0).toUpperCase() + stage.slice(1),
            description: 'Odkryj więcej',
            icon: 'book-outline',
            color: '#6B7280',
          };
          
          // Sort lessons by order
          const sortedLessons = lessons.sort((a, b) => a.order - b.order);
          
          // Count completed lessons in this group
          const completedCount = sortedLessons.filter(lesson => 
            completedLessons.includes(lesson.id)
          ).length;
          
          return {
            stage,
            ...metadata,
            lessons: sortedLessons,
            completedCount,
          };
        });
      
      setLessonGroups(groups);
    } catch (error) {
      console.error('Error loading lesson groups:', error);
      // Fallback to empty groups on error
      setLessonGroups([]);
    }
  };

  const loadRecentLessons = async () => {
    if (!user) return;
    
    try {
      const completedLessons = user.progression?.completedLessons || [];
      
      if (completedLessons.length === 0) {
        setRecentLessons([]);
        return;
      }
      
      // Get the most recent lesson from completed lessons
      const recentLessonId = completedLessons[completedLessons.length - 1];
      
      try {
        // Try to fetch the actual lesson data
        const lessonData = await DatabaseService.getLesson(recentLessonId);
        if (lessonData) {
          // Convert Lesson to LessonWithId
          const lessonWithId: LessonWithId = {
            ...lessonData,
            id: recentLessonId,
            source: 'internal',
            isCompleted: true,
          };
          setRecentLessons([lessonWithId]);
        } else {
          setRecentLessons([]);
        }
      } catch (error) {
        console.error('Error fetching recent lesson:', error);
        setRecentLessons([]);
      }
    } catch (error) {
      console.error('Error loading recent lessons:', error);
      setRecentLessons([]);
    }
  };

  const loadQuickStats = async () => {
    if (!user) return;
    
    try {
      // Calculate stats from user progression and stats
      const lessonsCompleted = user.progression?.completedLessons?.length || 0;
      const philosophersCount = Object.keys(user.philosopherCollection || {}).length;
      const currentStreak = user.stats?.streakDays || 0;
      
      // Calculate average score from perfect scores and total quizzes
      const perfectScores = user.stats?.perfectScores || 0;
      const totalQuizzes = user.stats?.quizzesCompleted || 0;
      const averageScore = totalQuizzes > 0 ? Math.round((perfectScores / totalQuizzes) * 100) : 0;
      
      setQuickStats({
        totalLessonsCompleted: lessonsCompleted,
        currentStreak: currentStreak,
        philosophersUnlocked: philosophersCount,
        averageScore: averageScore,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLearningData();
    setRefreshing(false);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.greeting}>
          Witaj ponownie, {user?.profile?.username || 'Filozofie'}!
        </Text>
        <Text style={styles.subtitle}>
          Kontynuuj swoją podróż przez świat filozofii
        </Text>
      </View>
      <TouchableOpacity style={styles.profileButton}>
        <Ionicons name="person-circle-outline" size={32} color="#F3F4F6" />
      </TouchableOpacity>
    </View>
  );

  const renderQuickStats = () => (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Twoje Postępy</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.statNumber}>{quickStats.totalLessonsCompleted}</Text>
          <Text style={styles.statLabel}>Lekcje</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={24} color="#F59E0B" />
          <Text style={styles.statNumber}>{quickStats.currentStreak}</Text>
          <Text style={styles.statLabel}>Seria</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="account-group" size={24} color="#6366F1" />
          <Text style={styles.statNumber}>{quickStats.philosophersUnlocked}</Text>
          <Text style={styles.statLabel}>Filozofowie</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="star" size={24} color="#EF4444" />
          <Text style={styles.statNumber}>{Math.round(quickStats.averageScore)}%</Text>
          <Text style={styles.statLabel}>Średnia</Text>
        </View>
      </View>
    </View>
  );

  const renderContinueLearning = () => {
    return (
      <View style={styles.continueSection}>
        <Text style={styles.sectionTitle}>Kontynuuj naukę</Text>
        {recentLessons.length > 0 ? (
          <TouchableOpacity 
            style={styles.continueCard}
            onPress={() => (navigation as any).navigate('LessonDetail', { lessonId: recentLessons[0].id })}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.continueGradient}
            >
              <View style={styles.continueContent}>
                <Text style={styles.continueTitle}>Ostatnia lekcja</Text>
                <Text style={styles.continueSubtitle}>{recentLessons[0].title}</Text>
                <View style={styles.continueProgress}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: '100%' }]} />
                  </View>
                  <Text style={styles.progressText}>Ukończone</Text>
                </View>
              </View>
              <Ionicons name="checkmark-circle" size={48} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.noLessonsCard}>
            <Ionicons name="book-outline" size={48} color="#6B7280" />
            <Text style={styles.noLessonsText}>Brak otwartych lekcji</Text>
            <Text style={styles.noLessonsSubtext}>Wybierz temat poniżej, aby rozpocząć naukę</Text>
          </View>
        )}
      </View>
    );
  };

  const renderLessonGroups = () => (
    <View style={styles.stagesSection}>
      <Text style={styles.sectionTitle}>Tematy</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {lessonGroups.map((group, index) => (
          <TouchableOpacity
            key={group.stage}
            style={styles.stageCard}
            onPress={() => (navigation as any).navigate('StageSelect', { stage: group.stage })}
          >
            <LinearGradient
              colors={[group.color, `${group.color}CC`]}
              style={styles.stageGradient}
            >
              <View style={styles.stageHeader}>
                <Ionicons 
                  name={group.icon as any} 
                  size={32} 
                  color="#FFFFFF"
                />
              </View>
              
              <Text style={styles.stageTitle}>
                {group.title}
              </Text>
              
              <Text style={styles.stageDescription}>
                {group.description}
              </Text>
              
              <View style={styles.stageProgress}>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill, 
                    { width: `${group.lessons.length > 0 ? (group.completedCount / group.lessons.length) * 100 : 0}%` }
                  ]} />
                </View>
                <Text style={styles.stageProgressText}>
                  {group.completedCount}/{group.lessons.length}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.actionsSection}>
      <Text style={styles.sectionTitle}>Szybkie Akcje</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard}>
          <MaterialCommunityIcons name="lightbulb-on" size={24} color="#F59E0B" />
          <Text style={styles.actionTitle}>Dzienny Quiz</Text>
          <Text style={styles.actionSubtitle}>Sprawdź swoją wiedzę</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => (navigation as any).navigate('ScenarioScreen', { scenarioId: 'daily' })}
        >
          <MaterialCommunityIcons name="drama-masks" size={24} color="#8B5CF6" />
          <Text style={styles.actionTitle}>Scenariusz</Text>
          <Text style={styles.actionSubtitle}>Filozoficzny dylemat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="people" size={24} color="#10B981" />
          <Text style={styles.actionTitle}>Debata</Text>
          <Text style={styles.actionSubtitle}>Pomiędzy filozofami</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="book" size={24} color="#3B82F6" />
          <Text style={styles.actionTitle}>Lektury</Text>
          <Text style={styles.actionSubtitle}>Dodatkowe materiały</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Ładowanie ścieżki wiedzy...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderQuickStats()}
        {renderContinueLearning()}
        {renderLessonGroups()}
        {renderQuickActions()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    color: '#F3F4F6',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 4,
  },
  profileButton: {
    padding: 8,
  },
  sectionTitle: {
    color: '#F3F4F6',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsContainer: {
    padding: 20,
    paddingTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: (width - 60) / 4,
    borderWidth: 1,
    borderColor: '#374151',
  },
  statNumber: {
    color: '#F3F4F6',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  continueSection: {
    padding: 20,
    paddingTop: 10,
  },
  continueCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  noLessonsCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  noLessonsText: {
    color: '#F3F4F6',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  noLessonsSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  continueGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  continueContent: {
    flex: 1,
  },
  continueTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
  continueSubtitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  continueProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  stagesSection: {
    padding: 20,
    paddingTop: 10,
  },
  stageCard: {
    width: 240,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  stageGradient: {
    padding: 20,
    height: 200,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stageTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  stageDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
    flex: 1,
  },
  stageProgress: {
    marginTop: 16,
  },
  stageProgressText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  actionsSection: {
    padding: 20,
    paddingTop: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    width: (width - 60) / 2,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionTitle: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  actionSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  bottomPadding: {
    height: 20,
  },
});

export default LearnHomeScreen;