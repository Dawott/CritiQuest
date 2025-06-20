import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAtom, useAtomValue } from 'jotai';
import { currentUserAtom, isLoadingAtom } from '@/store/atoms';
import { useNavigation } from '@/hooks/useNavigation';
import { useUser } from '@/hooks/useUser';
import AuthService from '@/services/firebase/auth.service';
import LottieView from 'lottie-react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList, RootStackParamList } from '@/navigation/types';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProgression, useProgressionDisplay } from '@/hooks/useProgression';
import { ProgressDisplay } from '@/components/progression/ProgressDisplay';
import { MilestoneModal } from '@/components/modals/MilestoneModal';
import { ProgressionMilestone } from '@/services/user-progression.service';
import { MilestoneCard } from '@/components/progression/MilestoneCard';
import { ActivityItem } from '@/components/progression/ActivityItem';
import { formatActivityFromEvent, formatActivityTime, RecentActivity } from '@/types/activity.types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 52) / 2; 

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const navigation = useNavigation();
  const [currentUser] = useAtom(currentUserAtom);
  const isLoading = useAtomValue(isLoadingAtom);
  const userId = AuthService.currentUser?.uid;
  const [milestoneModalVisible, setMilestoneModalVisible] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<ProgressionMilestone | null>(null);
  const { user, loading: userLoading } = useUser(userId || '');
  
  const showMilestoneModal = (milestone: ProgressionMilestone) => {
    setCurrentMilestone(milestone);
    setMilestoneModalVisible(true);
  };

  const closeMilestoneModal = () => {
    setMilestoneModalVisible(false);
    setCurrentMilestone(null);
  };

  const { updateStreak, checkMilestones } = useProgression({
    onMilestone: (milestone) => {
      showMilestoneModal(milestone);
    }
  });

  const {
    upcomingMilestones,
    recentActivity
  } = useProgressionDisplay();

  const processedActivity: RecentActivity[] = React.useMemo(() => {
    if (!recentActivity || !Array.isArray(recentActivity)) {
      return [];
    }

    return recentActivity
      .map((activity: any, index: number) => {
        // Check if already formatted
        if (activity.icon && activity.title && activity.color) {
          return {
            id: activity.id || `activity_${Date.now()}_${index}`,
            type: activity.type || 'unknown',
            title: activity.title,
            timestamp: activity.timestamp || Date.now(),
            icon: activity.icon,
            color: activity.color,
          } as RecentActivity;
        }
        
        // Convert from raw ProgressEvents
        return formatActivityFromEvent(activity);
      })
      .slice(0, 5); // Show only 5 recent activities
  }, [recentActivity]);

  // Effect to check for milestones on mount
  useEffect(() => {
    if (user) {
      checkMilestones();
    }
  }, [user, checkMilestones]);

  if (isLoading || userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Ładowanie...</Text>
      </View>
    );
  }

  const renderWelcomeSection = () => (
    <LinearGradient
      colors={['#6366F1', '#8B5CF6', '#EC4899']}
      style={styles.welcomeGradient}
    >
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.profile?.username?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.welcomeText}>Witaj z powrotem,</Text>
            <Text style={styles.userName}>
              {user?.profile?.username || 'Filozofie'}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => {/* Handle notifications */}}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Daily streak or inspiration */}
      <View style={styles.dailySection}>
        <Text style={styles.dailyQuote}>
          "Niezbadane życie nie jest warte życia" - Sokrates
        </Text>
      </View>
    </LinearGradient>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsSection}>
      <Text style={styles.sectionTitle}>Szybkie Akcje</Text>
      <View style={styles.quickActionsGrid}>
        <QuickActionCard
          icon="book-outline"
          iconSet="Ionicons"
          title="Kontynuuj Naukę"
          subtitle="Wróć do lekcji"
          color="#10B981"
          onPress={() => navigation.navigate('Nauka')}
        />
        <QuickActionCard
          icon="dice-multiple-outline"
          iconSet="MaterialCommunityIcons"
          title="Wyrocznia"
          subtitle="Odkryj filozofa"
          color="#8B5CF6"
          onPress={() => navigation.navigate('Wyrocznia')}
        />
        <QuickActionCard
          icon="people-outline"
          iconSet="Ionicons"
          title="Gimnazjon"
          subtitle="Twoja kolekcja"
          color="#F59E0B"
          onPress={() => navigation.navigate('Gimnazjon')}
        />
        <QuickActionCard
          icon="trophy-outline"
          iconSet="Ionicons"
          title="Wyzwanie"
          subtitle="Dzienny quiz"
          color="#EF4444"
          onPress={() => {/* Navigate to daily quiz */}}
        />
      </View>
    </View>
  );

  const renderProgressSection = () => (
    <View style={styles.progressSection}>
      <Text style={styles.sectionTitle}>Twój Postęp</Text>
      <View style={styles.progressCards}>
        <ProgressCard
          icon="flame"
          label="Seria"
          value={user?.stats?.streakDays || 0}
          total={user?.stats?.totalTimeSpent || 1}
          color="#F59E0B"
        />
        <ProgressCard
          icon="trophy"
          label="Poziom"
          value={user?.progression?.level|| 1}
          total={(user?.progression?.level || 1) + 1}
          color="#10B981"
        />
        <ProgressCard
          icon="people"
          label="Filozofowie"
          value={Object.keys(user?.philosopherCollection || {}).length}
          total={50} 
          color="#8B5CF6"
        />
      </View>
    </View>
  );

  const renderRecentActivity = () => (
    <View style={styles.activitySection}>
      <Text style={styles.sectionTitle}>Ostatnia Aktywność</Text>
      {processedActivity.length > 0 ? (
        <View style={styles.activityList}>
          {processedActivity.map((activity, index) => (
             <ActivityItem 
              key={activity.id || index} 
              icon={activity.icon}
              title={activity.title}
              time={formatActivityTime(activity.timestamp)}
              color={activity.color}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyState}>
          Rozpocznij swoją filozoficzną podróż!
        </Text>
      )}
    </View>
  );

  const renderUpcomingMilestones = () => (
    upcomingMilestones && upcomingMilestones.length > 0 && (
      <View style={styles.milestonesSection}>
        <Text style={styles.sectionTitle}>Nadchodzące Osiągnięcia</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {upcomingMilestones.slice(0, 3).map((milestone: ProgressionMilestone, index: number) => (
            <TouchableOpacity 
            key={milestone.id || `milestone-${index}`} 
            onPress={() => showMilestoneModal(milestone)}
            activeOpacity={0.8}
          >
            <MilestoneCard milestone={milestone} />
          </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderWelcomeSection()}
        {renderQuickActions()}
        {renderProgressSection()}
        {renderRecentActivity()}
        {renderUpcomingMilestones()}
      </ScrollView>

      <MilestoneModal
        visible={milestoneModalVisible}
        milestone={currentMilestone}
        onClose={closeMilestoneModal}
      />
    </SafeAreaView>
  );
}

// Helper Components
function QuickActionCard({ 
  icon, 
  iconSet = 'Ionicons',
  title, 
  subtitle, 
  color, 
  onPress 
}: {
  icon: string;
  iconSet?: 'Ionicons' | 'MaterialCommunityIcons';
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}) {
  const IconComponent = iconSet === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
  
  return (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
        <IconComponent name={icon as any} size={28} color={color} />
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function ProgressCard({ 
  icon, 
  label, 
  value, 
  total, 
  color 
}: {
  icon: string;
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const progress = value / total;
  
  return (
    <View style={styles.progressCard}>
      <Ionicons name={icon as any} size={24} color={color} />
      <Text style={styles.progressLabel}>{label}</Text>
      <Text style={styles.progressValue}>
        {value}<Text style={styles.progressTotal}>/{total}</Text>
      </Text>
      <View style={styles.progressBar}>
        <View 
          style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: color }]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 16,
    fontSize: 16,
  },
  
  // Welcome Section
  welcomeGradient: {
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailySection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  dailyQuote: {
    color: '#FFFFFF',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Quick Actions
  quickActionsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
    width: CARD_WIDTH,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Progress Section
  progressSection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  progressCards: {
    flexDirection: 'row',
    gap: 12,
  },
  progressCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  progressTotal: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748B',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Activity Section
  activitySection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  activityList: {
    gap: 8,
  },
  emptyState: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },

  // Milestones Section
  milestonesSection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
});