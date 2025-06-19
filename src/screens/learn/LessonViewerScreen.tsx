import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { LessonWithId } from '@/types/database.types';
import EnhancedLessonService from '@/services/lesson.service';
import { ContentRenderer } from '@/components/learning/ContentRenderer';
import { useLessonContent } from '@/hooks/useLessonContent';
import { LessonProgressBar } from '@/components/common/ProgressBar.tsx';

type LessonViewerScreenRouteProp = RouteProp<{
  LessonViewer: { lessonId: string; userId: string };
}, 'LessonViewer'>;

export const LessonViewerScreen: React.FC = () => {
  const route = useRoute<LessonViewerScreenRouteProp>();
  const navigation = useNavigation();
  const { lessonId, userId } = route.params;
  
  const [lesson, setLesson] = useState<LessonWithId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    currentSection,
    currentSectionIndex,
    sections,
    completedSections,
    overallProgress,
    canProceed,
    isLastSection,
    isFirstSection,
    markSectionComplete,
    updateSectionProgress,
    goToNextSection,
    goToPreviousSection,
    completeLessonSection,
  } = useLessonContent(lesson);

  // załaduj zawartość
  useEffect(() => {
    const loadLesson = async () => {
      try {
        setIsLoading(true);
        const lessonData = await EnhancedLessonService.getLesson(lessonId, userId);
        if (!lessonData) {
          throw new Error('Brak lekcji');
        }
        setLesson(lessonData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nie udało się załadować lekcji');
      } finally {
        setIsLoading(false);
      }
    };

    loadLesson();
  }, [lessonId, userId]);

  const handleSectionComplete = () => {
    markSectionComplete();
    
    if (isLastSection) {
      Alert.alert(
        'Lekcja zakończona!',
        'Dobra robota! Gotowy na sprawdzian?',
        [
          { text: 'Sprawdź', style: 'cancel' },
          { 
            text: 'Podejmij Quiz', 
            onPress: () => (navigation as any).navigate('Quiz', { 
              lessonId: lesson?.id,
              quizId: lesson?.quiz,
            })
          },
        ]
      );
    }
  };

  const handleProgress = (progress: number) => {
    updateSectionProgress(progress);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading lesson...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !lesson) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Brak lekcji'}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#F3F4F6" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.sectionIndicator}>
            Section {currentSectionIndex + 1} of {sections.length}
          </Text>
        </View>
        <TouchableOpacity onPress={() => {/* Show lesson overview */}}>
          <Ionicons name="list" size={24} color="#F3F4F6" />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <LessonProgressBar progress={overallProgress} />
        <Text style={styles.progressText}>{Math.round(overallProgress)}% Complete</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {currentSection && (
          <ContentRenderer
            section={currentSection}
            onComplete={handleSectionComplete}
            onProgress={handleProgress}
          />
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, isFirstSection && styles.navButtonDisabled]}
          onPress={goToPreviousSection}
          disabled={isFirstSection}
        >
          <Ionicons name="chevron-back" size={20} color="#F3F4F6" />
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextButton,
            !canProceed && styles.navButtonDisabled,
          ]}
          onPress={goToNextSection}
          disabled={!canProceed || isLastSection}
        >
          <Text style={styles.navButtonText}>
            {isLastSection ? 'Complete' : 'Next'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#F3F4F6" />
        </TouchableOpacity>
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
  },
  loadingText: {
    color: '#F3F4F6',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  backText: {
    color: '#6366F1',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  lessonTitle: {
    color: '#F3F4F6',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionIndicator: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    padding: 16,
    paddingTop: 8,
  },
  progressText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  nextButton: {
    backgroundColor: '#6366F1',
  },
  navButtonDisabled: {
    backgroundColor: '#1F2937',
    opacity: 0.5,
  },
  navButtonText: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '500',
  },
});