import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useProgressionDisplay } from '../../hooks/useProgression';
import Animated, { 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';

export function ProgressDisplay() {
  const {
    level,
    experience,
    expToNextLevel,
    progressPercentage,
    streak,
    loading
  } = useProgressionDisplay();

  const progressStyle = useAnimatedStyle(() => ({
    width: withSpring(`${progressPercentage}%`)
  }));

  if (loading) return null;

  return (
    <View style={styles.container}>
      <View style={styles.levelSection}>
        <Text style={styles.levelText}>Level {level}</Text>
        <Text style={styles.streakText}>{streak} streak</Text>
      </View>
      
      <View style={styles.progressBar}>
        <Animated.View 
          style={[styles.progressFill, progressStyle]} 
        />
      </View>
      
      <Text style={styles.expText}>
        {experience} / {experience + expToNextLevel} XP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    margin: 16,
  },
  levelSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F3F4F6',
  },
  streakText: {
    fontSize: 16,
    color: '#FCD34D',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  expText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});