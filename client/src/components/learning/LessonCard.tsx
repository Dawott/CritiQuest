import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Lesson } from 'shared/types/database.types';
import LessonProgressBar from 'client/src/components/common/ProgressBar';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface LessonCardProps {
  lesson: Lesson;
  progress?: number;
  isLocked?: boolean;
  onPress: () => void;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  progress = 0,
  isLocked = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, isLocked && styles.locked]}
      onPress={onPress}
      disabled={isLocked}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={isLocked ? 'lock-closed' : 'book'} 
            size={24} 
            color={isLocked ? '#6B7280' : '#6366F1'} 
          />
        </View>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, isLocked && styles.lockedText]}>
            {lesson.title}
          </Text>
          <Text style={[styles.difficulty]}>
            {lesson.difficulty}
          </Text>
        </View>
        <Text style={styles.duration}>{lesson.estimatedTime} min</Text>
      </View>
      
      <Text style={[styles.description, isLocked && styles.lockedText]} numberOfLines={2}>
        {lesson.description}
      </Text>
      
      <View style={styles.concepts}>
        {lesson.philosophicalConcepts.slice(0, 3).map((concept, index) => (
          <View key={index} style={styles.conceptBadge}>
            <Text style={styles.conceptText}>{concept}</Text>
          </View>
        ))}
      </View>
      
      {!isLocked && progress > 0 && (
        <LessonProgressBar progress={progress} style={styles.progressBar} />
      )}
      
      <View style={styles.rewards}>
        <View style={styles.reward}>
          <Text style={styles.rewardIcon}>✨</Text>
          <Text style={styles.rewardText}>{lesson.rewards.experience} XP</Text>
        </View>
        <View style={styles.reward}>
          <Text style={styles.rewardIcon}>🎫</Text>
          <Text style={styles.rewardText}>{lesson.rewards.gachaTickets} Tickets</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  locked: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  lockedText: {
    color: '#6B7280',
  },
  difficulty: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  beginner: { color: '#10B981' },
  intermediate: { color: '#F59E0B' },
  advanced: { color: '#EF4444' },
  duration: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  description: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 12,
    lineHeight: 20,
  },
  concepts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  conceptBadge: {
    backgroundColor: '#374151',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  conceptText: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  progressBar: {
    marginBottom: 12,
  },
  rewards: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  rewardText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});