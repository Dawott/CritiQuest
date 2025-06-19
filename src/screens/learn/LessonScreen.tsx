import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  BackHandler,
} from 'react-native';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { LessonWithId } from '@/types/database.types';
import  EnhancedLessonService from '@/services/lesson.service';
import { ContentRenderer } from '@/components/learning/ContentRenderer';
import { useLessonContent } from '@/hooks/useLessonContent';
import { useProgression } from '@/hooks/useProgression';
import { LessonProgressBar } from '@/components/common/ProgressBar.tsx';
import { LessonOverviewModal } from '@/components/modals/LessonOverviewModal';

//const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type LessonScreenRouteProp = RouteProp<{
  LessonScreen: { lessonId: string; userId?: string };
}, 'LessonScreen'>;

export default function LessonScreen() {
  const route = useRoute<LessonScreenRouteProp>();
  const navigation = useNavigation();
  const { lessonId, userId } = route.params;
  
  // State management
  const [lesson, setLesson] = useState<LessonWithId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [conceptsUnlocked, setConceptsUnlocked] = useState<string[]>([]);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const progressPulse = useRef(new Animated.Value(1)).current;

  // Hooks
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
  } = useLessonContent(lesson);

  const { 
    trackLessonProgress, 
    completeLesson,
    isUpdating 
  } = useProgression({
    showRewardAlerts: true,
    onLevelUp: (newLevel) => {
      // Enhanced level up animation with philosophical flair
      console.log(`Osiągnięto nowy poziom oświecenia! Level ${newLevel}`);
      showPhilosophicalInsight(newLevel);
    }
  });

  // Load lesson content
  useEffect(() => {
    const loadLesson = async () => {
      try {
        setIsLoading(true);
        const lessonData = await EnhancedLessonService.getLesson(lessonId, userId);
        if (!lessonData) {
          throw new Error('Lesson not found');
        }
        setLesson(lessonData);
        
        // Prefetch next lessons for smoother experience
        await EnhancedLessonService.prefetchLessonContent(lessonId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nie udało się załadować lekcji');
      } finally {
        setIsLoading(false);
      }
    };

    loadLesson();
  }, [lessonId, userId]);

  // Entrance animation
  useEffect(() => {
    if (!isLoading && lesson) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading, lesson]);

  // Progress pulse animation
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(progressPulse, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(progressPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    if (overallProgress > 0) {
      pulseAnimation.start();
    }
    
    return () => pulseAnimation.stop();
  }, [overallProgress]);

  // Handle Android back button
  const handleExitLesson = useCallback(() => {
  if (overallProgress > 0.1) {
    Alert.alert(
      '🤔 Przerwać lekcję?',
      'Twój postęp zostanie zachowany, ale warto dokończyć, by w pełni zrozumieć koncepcje filozoficzne.',
      [
        { text: 'Kontynuuj naukę', style: 'cancel' },
        { 
          text: 'Wyjdź', 
          style: 'destructive',
          onPress: () => navigation.goBack()
        },
      ]
    );
  } else {
    navigation.goBack();
  }
}, [overallProgress, navigation]);

useFocusEffect(
  React.useCallback(() => {
    const onBackPress = () => {
      handleExitLesson(); 
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription?.remove();
  }, [handleExitLesson])
);

  // Enhanced section completion with philosophical insights
  const handleSectionComplete = async (sectionIndex?: number) => {
    const index = sectionIndex ?? currentSectionIndex;
    const section = sections[index];
    
    // Track progress with philosophical insights
    await trackLessonProgress(lessonId, {
      sectionCompleted: index,
      timeSpent: calculateTimeSpent(),
      philosophicalInsights: extractPhilosophicalConcepts(section),
    });

    // Unlock concepts gradually
    const newConcepts = lesson?.philosophicalConcepts.slice(0, index + 1) || [];
    setConceptsUnlocked(newConcepts);

    // Visual feedback for completion
    markSectionComplete();
    showSectionCompletionFeedback(section);
    
    if (isLastSection) {
      handleLessonComplete();
    } else {
      // Auto-advance with delay for reflection
      setTimeout(() => {
        goToNextSection();
      }, 1500);
    }
  };

  // Complete lesson with enhanced celebration
  const handleLessonComplete = async () => {
    const score = calculateScore();
    const timeSpent = getTotalTimeSpent();
    
    try {
      await completeLesson(lessonId, score, timeSpent, {
        notes: '', // Could be expanded to collect user notes
        philosophicalInsights: conceptsUnlocked,
      });
      
      // Enhanced completion celebration
      showLessonCompletionCelebration();
      
      // Navigate to results with philosophical reflection
      setTimeout(() => {
        (navigation as any).navigate('LessonComplete', { 
          lessonId, 
          score,
          conceptsUnlocked,
          timeSpent 
        });
      }, 3000);
      
    } catch (error) {
      console.error('Failed to complete lesson:', error);
      Alert.alert('Error', 'Failed to save lesson progress');
    }
  };

  // Enhanced progress tracking
  const handleProgress = (progress: number) => {
    updateSectionProgress(progress);
    
    // Trigger micro-animations for engagement
    if (progress === 1) {
      Animated.sequence([
        Animated.timing(progressPulse, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(progressPulse, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // Toggle immersive reading mode
  const toggleImmersiveMode = () => {
    setIsImmersiveMode(!isImmersiveMode);
    
    Animated.timing(headerOpacity, {
      toValue: isImmersiveMode ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Helper functions
  const calculateTimeSpent = () => {
    // Implementation would track actual time spent
    return Math.floor(Date.now() / 1000) - (lesson?.createdAt || 0);
  };

  const getTotalTimeSpent = () => {
    // Calculate total time across all sections
    return calculateTimeSpent();
  };

  const calculateScore = () => {
    // Calculate score based on completion and engagement
    const completionScore = (completedSections.size / sections.length) * 100;
    const timeBonus = Math.max(0, 20 - (getTotalTimeSpent() / 60)); // Bonus for efficient learning
    return Math.min(100, completionScore + timeBonus);
  };

  const extractPhilosophicalConcepts = (section: any) => {
    // Extract key philosophical terms and concepts from section content
    const philosophicalKeywords = [
      'virtue', 'wisdom', 'justice', 'courage', 'temperance',
      'logic', 'ethics', 'metaphysics', 'epistemology',
      'stoicism', 'hedonism', 'nihilism', 'existentialism'
    ];
    
    return philosophicalKeywords.filter(keyword => 
      section.content.toLowerCase().includes(keyword)
    );
  };

  const showPhilosophicalInsight = (level: number) => {
    const insights = [
      "Niezbadane życie nie jest warte życia - Sokrates",
 "Mądrość zaczyna się w zdumieniu - Platon", 
 "Dobre życie jest inspirowane miłością i kierowane wiedzą - Russell",
 "Jedyną prawdziwą mądrością jest wiedzieć, że nic nie wiesz - Sokrates"
    ];
    
    Alert.alert(
      '✨ Philosophical Enlightenment!',
      insights[level % insights.length],
      [{ text: 'Continue Learning', style: 'default' }]
    );
  };

  const showSectionCompletionFeedback = (section: any) => {
    // Could show toast or subtle animation
    console.log(`Sekcja "${section.type}" zakończona!`);
  };

  const showLessonCompletionCelebration = () => {
    // Enhanced celebration animation
    console.log('Lekcja opanowana! Twoja filozoficzna podróż trwa nadal...');
  };

  // Render functions
  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
      <TouchableOpacity onPress={handleExitLesson}>
        <Ionicons name="arrow-back" size={24} color="#F3F4F6" />
      </TouchableOpacity>
      
      <View style={styles.headerCenter}>
        <Text style={styles.lessonTitle} numberOfLines={1}>
          {lesson?.title}
        </Text>
        <Text style={styles.sectionIndicator}>
          {currentSectionIndex + 1} of {sections.length} • {lesson?.stage}
        </Text>
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={() => setShowOverview(true)}>
          <Ionicons name="list" size={24} color="#F3F4F6" />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleImmersiveMode} style={styles.headerAction}>
          <Ionicons 
            name={isImmersiveMode ? "contract" : "expand"} 
            size={20} 
            color="#F3F4F6" 
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderProgressSection = () => (
    <Animated.View 
      style={[
        styles.progressContainer,
        { opacity: isImmersiveMode ? 0 : 1 }
      ]}
    >
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Postęp Nauki</Text>
        <Animated.View style={{ transform: [{ scale: progressPulse }] }}>
          <Text style={styles.progressPercentage}>
            {Math.round(overallProgress * 100)}%
          </Text>
        </Animated.View>
      </View>
      
      <LessonProgressBar 
        progress={overallProgress} 
        height={8} 
        milestone={0.5}
        showPercentage={false}
      />
      
      {conceptsUnlocked.length > 0 && (
        <View style={styles.conceptsUnlocked}>
          <Text style={styles.conceptsTitle}>Odblokowano Ideę:</Text>
          <View style={styles.conceptsList}>
            {conceptsUnlocked.slice(0, 3).map((concept, index) => (
              <View key={concept} style={styles.conceptBadge}>
                <Text style={styles.conceptText}>{concept}</Text>
              </View>
            ))}
            {conceptsUnlocked.length > 3 && (
              <Text style={styles.conceptsMore}>+{conceptsUnlocked.length - 3} więcej</Text>
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );

  const renderNavigation = () => (
    <View style={styles.navigationContainer}>
      <TouchableOpacity
        style={[styles.navButton, isFirstSection && styles.navButtonDisabled]}
        onPress={goToPreviousSection}
        disabled={isFirstSection}
      >
        <Ionicons name="chevron-back" size={20} color="#F3F4F6" />
        <Text style={styles.navButtonText}>Poprzednie</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.sectionDots}
        onPress={() => setShowOverview(true)}
      >
        {sections.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentSectionIndex && styles.activeDot,
              completedSections.has(index) && styles.completedDot,
            ]}
          />
        ))}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.navButton,
          styles.nextButton,
          (!canProceed || isLastSection) && styles.navButtonDisabled,
        ]}
        onPress={isLastSection ? handleLessonComplete : goToNextSection}
        disabled={!canProceed && !isLastSection}
      >
        <Text style={styles.navButtonText}>
          {isLastSection ? 'Complete' : 'Next'}
        </Text>
        <Ionicons 
          name={isLastSection ? "checkmark" : "chevron-forward"} 
          size={20} 
          color="#F3F4F6" 
        />
      </TouchableOpacity>
    </View>
  );

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View style={{ transform: [{ rotate: '360deg' }] }}>
            <Ionicons name="library" size={48} color="#6366F1" />
          </Animated.View>
          <Text style={styles.loadingText}>Szykuję kolejną podróż...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !lesson) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Lesson not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>Powrót do lekcji</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {renderHeader()}
        {renderProgressSection()}

        {/* Main Content */}
        <ScrollView 
          style={styles.contentArea}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {currentSection && (
            <ContentRenderer
              section={currentSection}
              onComplete={() => handleSectionComplete()}
              onProgress={handleProgress}
            />
          )}
          
          {/* Philosophical Context */}
          {lesson.philosophicalConcepts.length > 0 && (
            <View style={styles.contextCard}>
              <Text style={styles.contextTitle}>Kluczowe Idee w tej lekcji</Text>
              <View style={styles.contextList}>
                {lesson.philosophicalConcepts.map((concept, index) => (
                  <View 
                    key={concept} 
                    style={[
                      styles.contextItem,
                      conceptsUnlocked.includes(concept) && styles.contextUnlocked
                    ]}
                  >
                    <Ionicons 
                      name={conceptsUnlocked.includes(concept) ? "checkmark-circle" : "ellipse-outline"} 
                      size={16} 
                      color={conceptsUnlocked.includes(concept) ? "#10B981" : "#6B7280"} 
                    />
                    <Text style={[
                      styles.contextText,
                      conceptsUnlocked.includes(concept) && styles.contextTextUnlocked
                    ]}>
                      {concept}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {renderNavigation()}

        {/* Lesson Overview Modal */}
        {lesson && (
          <LessonOverviewModal
            visible={showOverview}
            lesson={lesson}
            currentSectionIndex={currentSectionIndex}
            completedSections={completedSections}
            onClose={() => setShowOverview(false)}
            onSectionSelect={(index) => {
              // Navigate to specific section if accessible
              setShowOverview(false);
            }}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
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
    fontStyle: 'italic',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  lessonTitle: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionIndicator: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerAction: {
    padding: 4,
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercentage: {
    color: '#6366F1',
    fontSize: 18,
    fontWeight: '700',
  },
  conceptsUnlocked: {
    marginTop: 12,
  },
  conceptsTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  conceptsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conceptBadge: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  conceptText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  conceptsMore: {
    color: '#94A3B8',
    fontSize: 12,
    alignSelf: 'center',
  },
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  contextCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  contextTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  contextList: {
    gap: 8,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contextUnlocked: {
    opacity: 1,
  },
  contextText: {
    color: '#6B7280',
    fontSize: 14,
  },
  contextTextUnlocked: {
    color: '#10B981',
    fontWeight: '500',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    minWidth: 80,
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
    fontSize: 14,
    fontWeight: '600',
  },
  sectionDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#374151',
  },
  activeDot: {
    backgroundColor: '#6366F1',
    width: 24,
  },
  completedDot: {
    backgroundColor: '#10B981',
  },
});