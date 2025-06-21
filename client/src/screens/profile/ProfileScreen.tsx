import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAtom } from 'jotai';
import { currentUserAtom } from '../../../../client/src/store/atoms';
import { useUser } from '../../hooks/useUser';
import AuthService from '../../services/firebase/auth.service';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { MainTabParamList, RootStackParamList } from '../../../../client/src/navigation/types';

// Import new hooks and components
import {
  usePhilosopherCollection,
  useCompletedLessons,
  useUnlockedAchievements,
  useRecentActivity,
  useMilestones,
} from '../../hooks/useProfileData';
import { PhilosopherCollectionCard } from '../../../../client/src/components/profile/PhilosopherCollectionCard';
import { CompletedLessonsCard } from '../../../../client/src/components/profile/CompletedLessonsCard';
import { AchievementsCard } from '../../../../client/src/components/profile/AchievementsCard';
import { MilestonesCard } from '../../../../client/src/components/profile/MilestonesCard';
import { RecentActivityCard } from '../../../../client/src/components/profile/RecentActivityCard';

const { width } = Dimensions.get('window');

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profil'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [currentUser] = useAtom(currentUserAtom);
  const userId = AuthService.currentUser?.uid || null;
  const { user, loading: userLoading} = useUser(userId || '');
  const [activeTab, setActiveTab] = useState<'stats' | 'collection' | 'achievements'>('stats');
  const [refreshing, setRefreshing] = useState(false);

  // Use new hooks for data
  const { 
    philosophers, 
    loading: philosophersLoading, 
    collectionStats 
  } = usePhilosopherCollection(userId);
  
  const { 
    lessons, 
    loading: lessonsLoading, 
    lessonStats 
  } = useCompletedLessons(userId);
  
  const { 
    achievements, 
    loading: achievementsLoading 
  } = useUnlockedAchievements(userId);
  
  const { 
    activities, 
    loading: activitiesLoading 
  } = useRecentActivity(userId);
  
  const { 
    upcomingMilestones, 
    completedMilestones, 
    loading: milestonesLoading 
  } = useMilestones(userId);

  const loading = userLoading || philosophersLoading || lessonsLoading || achievementsLoading;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      //await refetchUser();
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      navigation.navigate('Auth' as any);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const userLevel = user?.progression?.level || 1;
  const userExp = user?.progression?.experience || 0;
  const expForNextLevel = userLevel * 100;
  const expProgress = userExp / expForNextLevel;
  
  // Dynamic stats calculation
  const totalPhilosophers = philosophers.length;
  const totalLessons = lessons.length;
  const totalAchievements = achievements.length;
  const winRate = user?.stats?.perfectScores && user?.stats?.quizzesCompleted 
    ? Math.round((user.stats.perfectScores / user.stats.quizzesCompleted) * 100) 
    : 0;

  const getUserTitle = (level: number) => {
    if (level < 10) return 'Początkujący Myśliciel';
    if (level < 20) return 'Adept Filozofii';
    if (level < 30) return 'Mędrzec';
    if (level < 50) return 'Mistrz Dialektyki';
    return 'Filozof Doskonały';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
        }
      >
        {/* Header with user info */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.profileGradient}
          >
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {user?.profile?.username?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.userName}>
              {user?.profile?.username || 'Użytkownik'}
            </Text>
            <Text style={styles.userLevel}>Poziom {userLevel}</Text>
            
            {/* Progress Bar */}
            <View style={styles.expContainer}>
              <View style={styles.expBar}>
                <View style={[styles.expFill, { width: `${Math.min(expProgress * 100, 100)}%` }]} />
              </View>
              <Text style={styles.expText}>{userExp} / {expForNextLevel} XP</Text>
            </View>

            <Text style={styles.userTitle}>
              {getUserTitle(userLevel)}
            </Text>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <QuickStat icon="flame" value={user?.stats?.streakDays || 0} label="Seria dni" />
              <QuickStat 
                icon="time-outline" 
                value={`${Math.round((user?.stats?.totalTimeSpent || 0) / 60)}h`} 
                label="Czas nauki" 
              />
              <QuickStat icon="trophy" value={`${winRate}%`} label="Skuteczność" />
            </View>
          </LinearGradient>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
            onPress={() => setActiveTab('stats')}
          >
            <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
              Statystyki
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'collection' && styles.activeTab]}
            onPress={() => setActiveTab('collection')}
          >
            <Text style={[styles.tabText, activeTab === 'collection' && styles.activeTabText]}>
              Kolekcja
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'achievements' && styles.activeTab]}
            onPress={() => setActiveTab('achievements')}
          >
            <Text style={[styles.tabText, activeTab === 'achievements' && styles.activeTabText]}>
              Osiągnięcia
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.content}>
          {activeTab === 'stats' && (
            <View style={styles.tabContent}>
              {/* Progress Cards */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Postęp w nauce</Text>
                <View style={styles.progressGrid}>
                  <ProgressCard
                    icon="book"
                    title="Ukończone lekcje"
                    value={totalLessons}
                    total={50}
                    color="#10B981"
                  />
                  <ProgressCard
                    icon="checkmark-circle"
                    title="Quizy zaliczone"
                    value={user?.stats?.quizzesCompleted || 0}
                    total={100}
                    color="#6366F1"
                  />
                  <ProgressCard
                    icon="star"
                    title="Perfekcyjne wyniki"
                    value={user?.stats?.perfectScores || 0}
                    total={50}
                    color="#F59E0B"
                  />
                  <ProgressCard
                    icon="medal"
                    title="Osiągnięcia"
                    value={totalAchievements}
                    total={25}
                    color="#EF4444"
                  />
                </View>
              </View>

              {/* Milestones */}
              {!milestonesLoading && upcomingMilestones.length > 0 && (
                <MilestonesCard
                  upcomingMilestones={upcomingMilestones}
                  completedMilestones={completedMilestones}
                  onViewAll={() => navigation.navigate('Milestones' as any)}
                />
              )}

              {/* Recent Activity */}
              {!activitiesLoading && activities.length > 0 && (
                <RecentActivityCard
                  activities={activities}
                  onViewAll={() => navigation.navigate('ActivityHistory' as any)}
                />
              )}
            </View>
          )}

          {activeTab === 'collection' && (
            <View style={styles.tabContent}>
              {/* Philosopher Collection */}
              <PhilosopherCollectionCard
                philosophers={philosophers}
                collectionStats={collectionStats}
                onViewAll={() => navigation.navigate('PhilosopherCollection' as any)}
                onPhilosopherPress={(philosopher) => 
                  navigation.navigate('PhilosopherDetail', { philosopherId: philosopher.id })
                }
              />

              {/* Completed Lessons */}
              <CompletedLessonsCard
                lessons={lessons}
                lessonStats={lessonStats}
                onViewAll={() => navigation.navigate('LessonHistory' as any)}
                onLessonPress={(lesson) => 
                  //PLACEHOLDER
                  console.log('Navigate to lesson:', lesson.id)
                }
              />
            </View>
          )}

          {activeTab === 'achievements' && (
            <View style={styles.tabContent}>
              {/* Achievements */}
              <AchievementsCard
                achievements={achievements}
                onViewAll={() => navigation.navigate('AllAchievements' as any)}
                onAchievementPress={(achievement) => 
                  //PLACEHOLDER
                  console.log('View achievement:', achievement.id)
                }
              />

              {/* Achievement Stats */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Statystyki osiągnięć</Text>
                <View style={styles.achievementStats}>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Łącznie odblokowanych:</Text>
                    <Text style={styles.statValue}>{achievements.length}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Nieobejrzanych:</Text>
                    <Text style={styles.statValue}>
                      {achievements.filter(a => !a.viewed).length}
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Ostatnie odblokowane:</Text>
                    <Text style={styles.statValue}>
                      {achievements.length > 0 
                        ? new Date(achievements[0].unlockedAt).toLocaleDateString()
                        : 'Brak'
                      }
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
const QuickStat: React.FC<{ icon: string; value: string | number; label: string }> = ({ 
  icon, value, label 
}) => (
  <View style={styles.quickStatItem}>
    <Ionicons name={icon as any} size={20} color="#FFFFFF" />
    <Text style={styles.quickStatValue}>{value}</Text>
    <Text style={styles.quickStatLabel}>{label}</Text>
  </View>
);

const ProgressCard: React.FC<{ 
  icon: string; 
  title: string; 
  value: number; 
  total: number; 
  color: string 
}> = ({ icon, title, value, total, color }) => {
  const percentage = (value / total) * 100;
  
  return (
    <View style={styles.progressCard}>
      <View style={[styles.progressIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={20} color="#FFFFFF" />
      </View>
      <Text style={styles.progressTitle}>{title}</Text>
      <Text style={styles.progressValue}>{value}/{total}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.progressPercentage}>{Math.round(percentage)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
  },
  profileGradient: {
    padding: 20,
    paddingTop: 60,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutButton: {
    padding: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userLevel: {
    fontSize: 16,
    color: '#E2E8F0',
    marginBottom: 16,
  },
  expContainer: {
    marginBottom: 8,
  },
  expBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
  },
  expFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  expText: {
    fontSize: 14,
    color: '#E2E8F0',
    textAlign: 'center',
  },
  userTitle: {
    fontSize: 14,
    color: '#FEE2E2',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tabContent: {
    flex: 1,
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  progressCard: {
    width: (width - 60) / 2,
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  progressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#94A3B8',
  },
  achievementStats: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
  },
});