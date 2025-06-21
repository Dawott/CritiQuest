import DatabaseService from '../../../client/src/services/firebase/database.service';
import EnhancedDatabaseService  from '../../../client/src/services/firebase/database.service';
import { DB_PATHS } from '../../../server/src/config/firebase.config';
import { RecentActivityItem } from '../../../client/src/hooks/useProfileData';
import { v4 as uuidv4 } from 'uuid';

export interface ActivityData {
  lessonId?: string;
  achievementId?: string;
  philosopherId?: string;
  milestoneId?: string;
  level?: number;
  score?: number;
  experience?: number;
  [key: string]: any;
}

class ActivityTrackingService {
  private readonly MAX_ACTIVITIES = 50; // Keep last 50 activities

  async trackActivity(
    userId: string,
    type: 'lesson_complete' | 'achievement_unlock' | 'philosopher_obtained' | 'milestone_reached' | 'level_up',
    title: string,
    description: string,
    data?: ActivityData
  ): Promise<void> {
    try {
      const activityId = uuidv4();
      const timestamp = Date.now();
      
      const activity: RecentActivityItem = {
        id: activityId,
        type,
        timestamp,
        title,
        description,
        icon: this.getActivityIcon(type),
        color: this.getActivityColor(type),
        data,
      };

      const activityPath = `${DB_PATHS.USER_PROGRESS}/${userId}/recentActivity`;
      
      // Get current activities
      const currentActivities = await DatabaseService.read<RecentActivityItem[]>(activityPath) || [];
      
      // Add new activity to the beginning
      const updatedActivities = [activity, ...currentActivities];
      
      // Keep only the last MAX_ACTIVITIES
      const trimmedActivities = updatedActivities.slice(0, this.MAX_ACTIVITIES);
      
      // Save back to database
      await DatabaseService.create(activityPath, trimmedActivities);
      
      console.log(`Activity tracked: ${type} for user ${userId}`);
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }

  async trackLessonCompletion(
    userId: string,
    lessonId: string,
    lessonTitle: string,
    score: number,
    timeSpent: number
  ): Promise<void> {
    const description = `Wynik: ${score}% • Czas: ${Math.round(timeSpent / 60)}min`;
    
    await this.trackActivity(
      userId,
      'lesson_complete',
      `Ukończono: ${lessonTitle}`,
      description,
      { lessonId, score, timeSpent }
    );
  }

  async trackAchievementUnlock(
    userId: string,
    achievementId: string,
    achievementName: string,
    experience: number = 0
  ): Promise<void> {
    const description = experience > 0 ? `+${experience} XP` : 'Nowe osiągnięcie!';
    
    await this.trackActivity(
      userId,
      'achievement_unlock',
      `Osiągnięcie: ${achievementName}`,
      description,
      { achievementId, experience }
    );
  }

  async trackPhilosopherObtained(
    userId: string,
    philosopherId: string,
    philosopherName: string,
    rarity: string
  ): Promise<void> {
    const description = `Rzadkość: ${rarity}`;
    
    await this.trackActivity(
      userId,
      'philosopher_obtained',
      `Odblokowano: ${philosopherName}`,
      description,
      { philosopherId, rarity }
    );
  }

  async trackMilestoneReached(
    userId: string,
    milestoneId: string,
    milestoneName: string,
    rewards: { experience?: number; gachaTickets?: number }
  ): Promise<void> {
    const rewardText = [];
    if (rewards.experience) rewardText.push(`+${rewards.experience} XP`);
    if (rewards.gachaTickets) rewardText.push(`+${rewards.gachaTickets} 🎫`);
    
    const description = rewardText.length > 0 ? rewardText.join(' • ') : 'Kamień milowy osiągnięty!';
    
    await this.trackActivity(
      userId,
      'milestone_reached',
      `Kamień milowy: ${milestoneName}`,
      description,
      { milestoneId, ...rewards }
    );
  }

  async trackLevelUp(
    userId: string,
    oldLevel: number,
    newLevel: number,
    experience: number = 0
  ): Promise<void> {
    const levelsGained = newLevel - oldLevel;
    const description = levelsGained > 1 
      ? `+${levelsGained} poziomów! +${experience} XP`
      : `Nowy poziom! +${experience} XP`;
    
    await this.trackActivity(
      userId,
      'level_up',
      `Poziom ${newLevel}!`,
      description,
      { level: newLevel, oldLevel, experience }
    );
  }

  async getRecentActivities(userId: string, limit: number = 10): Promise<RecentActivityItem[]> {
    try {
      const activityPath = `${DB_PATHS.USER_PROGRESS}/${userId}/recentActivity`;
      const activities = await DatabaseService.read<RecentActivityItem[]>(activityPath) || [];
      
      return activities
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent activities:', error);
      return [];
    }
  }

  async clearOldActivities(userId: string, keepCount: number = 20): Promise<void> {
    try {
      const activityPath = `${DB_PATHS.USER_PROGRESS}/${userId}/recentActivity`;
      const activities = await DatabaseService.read<RecentActivityItem[]>(activityPath) || [];
      
      if (activities.length <= keepCount) return;
      
      const trimmedActivities = activities
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, keepCount);
      
      await DatabaseService.create(activityPath, trimmedActivities);
      
      console.log(`Cleaned up activities for user ${userId}, kept ${keepCount} most recent`);
    } catch (error) {
      console.error('Error cleaning up activities:', error);
    }
  }

  private getActivityIcon(type: string): string {
    switch (type) {
      case 'lesson_complete': return 'book';
      case 'achievement_unlock': return 'trophy';
      case 'philosopher_obtained': return 'people';
      case 'milestone_reached': return 'flag';
      case 'level_up': return 'arrow-up-circle';
      default: return 'checkmark-circle';
    }
  }

  private getActivityColor(type: string): string {
    switch (type) {
      case 'lesson_complete': return '#10B981';
      case 'achievement_unlock': return '#F59E0B';
      case 'philosopher_obtained': return '#8B5CF6';
      case 'milestone_reached': return '#6366F1';
      case 'level_up': return '#EF4444';
      default: return '#94A3B8';
    }
  }

  // Batch operations for efficiency
  async trackMultipleActivities(
    userId: string,
    activities: Array<{
      type: RecentActivityItem['type'];
      title: string;
      description: string;
      data?: ActivityData;
    }>
  ): Promise<void> {
    try {
      const timestamp = Date.now();
      const activityPath = `${DB_PATHS.USER_PROGRESS}/${userId}/recentActivity`;
      
      // Get current activities
      const currentActivities = await DatabaseService.read<RecentActivityItem[]>(activityPath) || [];
      
      // Create new activity items
      const newActivities = activities.map((activity, index) => ({
        id: uuidv4(),
        timestamp: timestamp + index, // Slight offset to maintain order
        icon: this.getActivityIcon(activity.type),
        color: this.getActivityColor(activity.type),
        ...activity,
      }));
      
      // Merge and trim
      const allActivities = [...newActivities, ...currentActivities];
      const trimmedActivities = allActivities.slice(0, this.MAX_ACTIVITIES);
      
      // Save to database
      await DatabaseService.create(activityPath, trimmedActivities);
      
      console.log(`Tracked ${activities.length} activities for user ${userId}`);
    } catch (error) {
      console.error('Error tracking multiple activities:', error);
    }
  }

  // Integration helpers for existing services
  async integrateWithProgressionService(userId: string, progressionUpdate: any): Promise<void> {
    const activities = [];

    // Track lesson completions
    if (progressionUpdate.lessonsCompleted?.length) {
      for (const lessonId of progressionUpdate.lessonsCompleted) {
        // You would fetch lesson data here
        activities.push({
          type: 'lesson_complete' as const,
          title: `Ukończono lekcję`,
          description: 'Nowa lekcja ukończona!',
          data: { lessonId },
        });
      }
    }

    // Track achievements
    if (progressionUpdate.achievementsEarned?.length) {
      for (const achievementId of progressionUpdate.achievementsEarned) {
        activities.push({
          type: 'achievement_unlock' as const,
          title: `Nowe osiągnięcie!`,
          description: 'Osiągnięcie odblokowane',
          data: { achievementId },
        });
      }
    }

    // Track level ups
    if (progressionUpdate.levelUp) {
      activities.push({
        type: 'level_up' as const,
        title: `Poziom ${progressionUpdate.newLevel}!`,
        description: `Awansowano z poziomu ${progressionUpdate.oldLevel}`,
        data: { level: progressionUpdate.newLevel, oldLevel: progressionUpdate.oldLevel },
      });
    }

    if (activities.length > 0) {
      await this.trackMultipleActivities(userId, activities);
    }
  }
}

export default new ActivityTrackingService();