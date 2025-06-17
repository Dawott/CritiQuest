import { useProgression } from '@/hooks/useProgression';

export default function LessonScreen() {
  const { lessonId } = route.params;
  const { 
    trackLessonProgress, 
    completeLesson,
    isUpdating 
  } = useProgression({
    showRewardAlerts: true,
    onLevelUp: (newLevel) => {
      // TBD level up animacja
      console.log(`Level up! Aktualny level ${newLevel}`);
    }
  });

  // progres sekcji
  const handleSectionComplete = async (sectionIndex: number) => {
    await trackLessonProgress(lessonId, {
      sectionCompleted: sectionIndex,
      timeSpent: calculateTimeSpent(),
      philosophicalInsights: collectInsights()
    });
  };

  // Ukończ lekcję
  const handleLessonComplete = async () => {
    const score = calculateScore();
    const timeSpent = getTotalTimeSpent();
    
    await completeLesson(lessonId, score, timeSpent, {
      notes: userNotes,
      philosophicalInsights: insights
    });
    
    // Nawiguj do nowej lekcji
    navigation.navigate('LessonComplete', { lessonId, score });
  };

  return (
    // TBD
    <View>
      {/* Lesson content */}
    </View>
  );
}