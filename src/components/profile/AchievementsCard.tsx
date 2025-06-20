import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { UnlockedAchievementItem } from '@/hooks/useProfileData';

interface AchievementsCardProps {
  achievements: UnlockedAchievementItem[];
  onViewAll: () => void;
  onAchievementPress: (achievement: UnlockedAchievementItem) => void;
}

export const AchievementsCard: React.FC<AchievementsCardProps> = ({
  achievements,
  onViewAll,
  onAchievementPress,
}) => {
  const recentAchievements = achievements.slice(0, 6);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lesson_completion': return 'book';
      case 'quiz_mastery': return 'checkmark-circle';
      case 'streak': return 'flame';
      case 'collection': return 'people';
      case 'social': return 'heart';
      default: return 'trophy';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lesson_completion': return '#10B981';
      case 'quiz_mastery': return '#6366F1';
      case 'streak': return '#F59E0B';
      case 'collection': return '#8B5CF6';
      case 'social': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Osiągnięcia</Text>
          <Text style={styles.subtitle}>{achievements.length} odblokowanych</Text>
        </View>
        <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>Zobacz wszystkie</Text>
          <Ionicons name="chevron-forward" size={16} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementScroll}>
        {recentAchievements.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.achievementCard, !item.viewed && styles.unviewedCard]}
            onPress={() => onAchievementPress(item)}
          >
            <View style={[styles.achievementIcon, { backgroundColor: getTypeColor(item.achievement.criteria.type) }]}>
              <Ionicons 
                name={getTypeIcon(item.achievement.criteria.type)} 
                size={20} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={styles.achievementName} numberOfLines={2}>
              {item.achievement.name}
            </Text>
            <Text style={styles.achievementDate}>
              {new Date(item.unlockedAt).toLocaleDateString()}
            </Text>
            {!item.viewed && <View style={styles.newBadge} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
    marginRight: 4,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 4,
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  philosopherScroll: {
    marginTop: 8,
  },
  philosopherCard: {
    width: 120,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  philosopherGradient: {
    padding: 12,
    alignItems: 'center',
  },
  philosopherEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  philosopherName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  philosopherLevel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  expBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  expFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  lessonsList: {
    marginTop: 8,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  lessonContent: {
    flex: 1,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F1F5F9',
    flex: 1,
    marginRight: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  lessonMeta: {
    fontSize: 12,
    color: '#94A3B8',
  },
  achievementScroll: {
    marginTop: 8,
  },
  achievementCard: {
    width: 100,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#334155',
    marginRight: 12,
    alignItems: 'center',
    position: 'relative',
  },
  unviewedCard: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  newBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  milestonesList: {
    marginTop: 8,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  milestoneDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#94A3B8',
    minWidth: 40,
  },
  milestoneReward: {
    alignItems: 'flex-end',
  },
  rewardText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  activitiesList: {
    marginTop: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: '#64748B',
  },
});