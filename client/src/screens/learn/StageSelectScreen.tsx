import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAtom } from 'jotai';
import { currentUserAtom } from 'client/src/store/atoms';
import DatabaseService from '@/services/firebase/database.service';
import { LessonWithId } from 'shared/types/database.types';
import { RouteProp } from '@react-navigation/native';
import { LearnStackParamList } from 'client/src/navigation/types';

type StageSelectScreenRouteProp = RouteProp<LearnStackParamList, 'StageSelect'>;

const StageSelectScreen: React.FC = () => {
  const route = useRoute<StageSelectScreenRouteProp>();
  const navigation = useNavigation();
  const { stage } = route.params;
  const [user] = useAtom(currentUserAtom);
  
  const [lessons, setLessons] = useState<LessonWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLessons();
  }, [stage]);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const stageLessons = await DatabaseService.getLessonsByStage(stage);
      
      // Convert to LessonWithId format and add completion status
      const lessonsWithStatus = stageLessons.map(lesson => ({
        ...lesson,
        source: 'internal' as const,
        isCompleted: user?.progression?.completedLessons?.includes(lesson.id) || false,
      }));
      
      setLessons(lessonsWithStatus);
    } catch (error) {
      console.error('Error loading lessons:', error);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLessons();
    setRefreshing(false);
  };

  const handleLessonPress = (lesson: LessonWithId) => {
    (navigation as any).navigate('LessonDetail', { lessonId: lesson.id });
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

  const renderLessonItem = ({ item }: { item: LessonWithId }) => (
    <TouchableOpacity
      style={styles.lessonCard}
      onPress={() => handleLessonPress(item)}
    >
      <View style={styles.lessonHeader}>
        <View style={styles.lessonInfo}>
          <Text style={styles.lessonTitle}>{item.title}</Text>
          <Text style={styles.lessonDescription}>{item.description}</Text>
        </View>
        <View style={styles.lessonStatus}>
          {item.isCompleted ? (
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          ) : (
            <Ionicons name="play-circle-outline" size={24} color="#6366F1" />
          )}
        </View>
      </View>
      
      <View style={styles.lessonMeta}>
        <View style={styles.difficultyBadge}>
          <View style={[
            styles.difficultyDot, 
            { backgroundColor: getDifficultyColor(item.difficulty) }
          ]} />
          <Text style={styles.difficultyText}>
            {getDifficultyLabel(item.difficulty)}
          </Text>
        </View>
        
        <View style={styles.timeEstimate}>
          <Ionicons name="time-outline" size={16} color="#9CA3AF" />
          <Text style={styles.timeText}>{item.estimatedTime} min</Text>
        </View>
      </View>

      {item.philosophicalConcepts && item.philosophicalConcepts.length > 0 && (
        <View style={styles.conceptsContainer}>
          {item.philosophicalConcepts.slice(0, 3).map((concept, index) => (
            <View key={index} style={styles.conceptBadge}>
              <Text style={styles.conceptText}>{concept}</Text>
            </View>
          ))}
          {item.philosophicalConcepts.length > 3 && (
            <View style={styles.conceptBadge}>
              <Text style={styles.conceptText}>+{item.philosophicalConcepts.length - 3}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

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

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={lessons}
        renderItem={renderLessonItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={64} color="#6B7280" />
            <Text style={styles.emptyTitle}>Brak lekcji</Text>
            <Text style={styles.emptySubtitle}>
              W tej kategorii nie ma jeszcze dostępnych lekcji
            </Text>
          </View>
        }
      />
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
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  lessonCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  lessonInfo: {
    flex: 1,
    marginRight: 12,
  },
  lessonTitle: {
    color: '#F3F4F6',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  lessonDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
  },
  lessonStatus: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  difficultyText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '500',
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  conceptsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  conceptBadge: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  conceptText: {
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 16,
  },
  emptyTitle: {
    color: '#F3F4F6',
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default StageSelectScreen;