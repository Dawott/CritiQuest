import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { ProgressionMilestone } from '../../../../server/src/services/user-progression.service';

interface MilestoneCardProps {
  milestone: ProgressionMilestone;
}

export function MilestoneCard({ milestone }: MilestoneCardProps) {
  const progress = milestone.currentValue / milestone.requiredValue;
  const progressPercentage = Math.min(progress * 100, 100);
  
  // Wybór ikonki
  const getMilestoneIcon = (milestoneId: string) => {
    switch (milestoneId) {
      case 'first_lesson': return 'school-outline';
      case 'philosophy_novice': return 'library-outline';
      case 'quiz_master': return 'help-circle-outline';
      case 'perfect_thinker': return 'trophy-outline';
      default: return 'star-outline';
    }
  };

  // Get color based on milestone type
  const getMilestoneColor = (milestoneId: string) => {
    switch (milestoneId) {
      case 'first_lesson': return '#10B981';
      case 'philosophy_novice': return '#6366F1';
      case 'quiz_master': return '#8B5CF6';
      case 'perfect_thinker': return '#F59E0B';
      default: return '#94A3B8';
    }
  };

  const color = getMilestoneColor(milestone.id);
  const icon = getMilestoneIcon(milestone.id);

  return (
    <View style={styles.milestoneCard}>
      <View style={styles.milestoneHeader}>
        <View style={[styles.milestoneIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <View style={styles.milestoneInfo}>
          <Text style={styles.milestoneName}>{milestone.name}</Text>
          <Text style={styles.milestoneDescription}>{milestone.description}</Text>
        </View>
        <View style={styles.milestoneProgress}>
          <Text style={[styles.progressText, { color }]}>
            {milestone.currentValue}/{milestone.requiredValue}
          </Text>
        </View>
      </View>
      
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${progressPercentage}%`, 
                backgroundColor: color 
              }
            ]} 
          />
        </View>
        <Text style={styles.progressPercentage}>{Math.floor(progressPercentage)}%</Text>
      </View>

      {/* Rewards Preview */}
      <View style={styles.rewardsPreview}>
        <Text style={styles.rewardsLabel}>Nagrody:</Text>
        <View style={styles.rewardItems}>
          {milestone.reward.rewards.experience && (
            <View style={styles.rewardItem}>
              <Ionicons name="flash" size={14} color="#F59E0B" />
              <Text style={styles.rewardText}>{milestone.reward.rewards.experience} XP</Text>
            </View>
          )}
          {milestone.reward.rewards.gachaTickets && (
            <View style={styles.rewardItem}>
              <Ionicons name="ticket" size={14} color="#8B5CF6" />
              <Text style={styles.rewardText}>{milestone.reward.rewards.gachaTickets} biletów</Text>
            </View>
          )}
          {milestone.reward.rewards.philosopherId && (
            <View style={styles.rewardItem}>
              <Ionicons name="person-add" size={14} color="#10B981" />
              <Text style={styles.rewardText}>Nowy filozof</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  milestoneCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  milestoneIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  milestoneDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  milestoneProgress: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
  },
  rewardsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardsLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  rewardItems: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});