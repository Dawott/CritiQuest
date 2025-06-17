import React, { useEffect, useRef } from 'react';
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
  const { user, loading: userLoading } = useUser(userId || '');
    //const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
    const { updateStreak, checkMilestones } = useProgression({
    onMilestone: (milestone) => {
      showMilestoneModal(milestone);
    }
  });

    const {
    upcomingMilestones,
    recentActivity
  } = useProgressionDisplay();
  useEffect(() => {
    // Update streak na otwarciu
    updateStreak();
    
    // Sprawdź nowe milestone
    checkMilestones();
  }, []);

  // Rotacja dziennych cytatów
  const philosophicalQuotes = [
    { text: "Wiem, że nic nie wiem", author: "Sokrates" },
    { text: "Myślę, więc jestem", author: "Kartezjusz" },
    { text: "Człowiek jest skazany na wolność", author: "Sartre" },
    { text: "To, co nas nie zabije, czyni nas silniejszymi", author: "Nietzsche" },
  ];
  
  const todaysQuote = philosophicalQuotes[new Date().getDay() % philosophicalQuotes.length];

  if (userLoading || isLoading) {
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

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <ProgressDisplay />
      
      {/* Upcoming milestones */}
      <View style={styles.milestonesSection}>
        <Text style={styles.sectionTitle}>Upcoming Milestones</Text>
        {upcomingMilestones.map(milestone => (
          <MilestoneCard 
            key={milestone.id} 
            milestone={milestone} 
          />
        ))}
      </View>
      
      {/* Recent activity */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recentActivity.map(activity => (
          <ActivityItem 
            key={activity.id} 
            activity={activity} 
          />
        ))}
      </View>
          {/* User Info */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={() => navigation.jumpTo('Profil')}
              >
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>
                    {user?.profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <View style={styles.userDetails}>
                <Text style={styles.welcomeText}>Witaj ponownie,</Text>
                <Text style={styles.username}>{user?.profile?.username || 'Filozofie'}</Text>
                <View style={styles.levelContainer}>
                  <Text style={styles.levelText}>Poziom {userLevel}</Text>
                  <View style={styles.expBar}>
                    <View style={[styles.expFill, { width: `${expProgress * 100}%` }]} />
                  </View>
                </View>
              </View>
            </View>
            
            {/* Streak Counter */}
            <TouchableOpacity style={styles.streakContainer}>
              <Ionicons name="flame" size={24} color="#F59E0B" />
              <Text style={styles.streakText}>{user?.stats?.streakDays || 0}</Text>
            </TouchableOpacity>
          </View>

          {/* Dzienne cytaty */}
          <TouchableOpacity 
            style={styles.quoteCard}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.1)']}
              style={styles.quoteGradient}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="#8B5CF6" style={styles.quoteIcon} />
              <Text style={styles.quoteText}>"{todaysQuote.text}"</Text>
              <Text style={styles.quoteAuthor}>- {todaysQuote.author}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Szybkie akcje */}
          <View style={styles.quickActions}>
            <QuickActionCard
              icon="book"
              title="Kontynuuj naukę"
              subtitle="Etyka: Lekcja 3"
              color="#10B981"
              onPress={() => navigation.jumpTo('Nauka')}
            />
            <QuickActionCard
              icon="dice-multiple"
              iconSet="MaterialCommunityIcons"
              title="Wyrocznia"
              subtitle={`${user?.stats?.gachaTickets || 0} biletów`}
              color="#F59E0B"
              onPress={() => navigation.jumpTo('Wyrocznia')}
            />
          </View>

          {/* Progres */}
          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Twój postęp</Text>
            <View style={styles.progressCards}>
              <ProgressCard
                icon="school"
                label="Ukończone lekcje"
                value={user?.progression?.completedLessons?.length || 0}
                total={50}
                color="#6366F1"
              />
              <ProgressCard
                icon="people"
                label="Gimnazjon"
                value={Object.keys(user?.philosopherCollection || {}).length}
                total={30}
                color="#8B5CF6"
              />
              <ProgressCard
                icon="trophy"
                label="Osiągnięcia"
                value={Object.keys(user?.achievements || {}).length}
                total={25}
                color="#F59E0B"
              />
            </View>
          </View>

          {/* Dailies */}
          <TouchableOpacity 
            style={styles.dailyChallenge}
            onPress={() => navigation.jumpTo('Nauka')}
          >
            <LinearGradient
              colors={['#DC2626', '#EF4444']}
              style={styles.challengeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.challengeContent}>
                <Ionicons name="calendar" size={32} color="#FFFFFF" />
                <View style={styles.challengeText}>
                  <Text style={styles.challengeTitle}>Wyzwanie dnia</Text>
                  <Text style={styles.challengeSubtitle}>
                    Dylemat wagonika: Kant vs Utylitaryzm
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Gacha Banner */}
          {user?.philosopherCollection && Object.keys(user.philosopherCollection).length > 0 && (
            <View style={styles.featuredSection}>
              <Text style={styles.sectionTitle}>Wyróżniony filozof</Text>
              <TouchableOpacity 
                style={styles.featuredPhilosopher}
                onPress={() => navigation.jumpTo('Gimnazjon')}
              >
                <LinearGradient
                  colors={['rgba(251, 191, 36, 0.1)', 'rgba(245, 158, 11, 0.1)']}
                  style={styles.featuredGradient}
                >
                  <View style={styles.philosopherCircle}>
                    <Text style={styles.philosopherEmoji}>🏛️</Text>
                  </View>
                  <View style={styles.philosopherInfo}>
                    <Text style={styles.philosopherName}>Arystoteles</Text>
                    <Text style={styles.philosopherSchool}>Perypatetyzm</Text>
                    <View style={styles.philosopherStats}>
                      <View style={styles.statBadge}>
                        <Ionicons name="brain" size={12} color="#F59E0B" />
                        <Text style={styles.statText}>95</Text>
                      </View>
                      <View style={styles.statBadge}>
                        <Ionicons name="heart" size={12} color="#F59E0B" />
                        <Text style={styles.statText}>88</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Helpery
function QuickActionCard({ 
  icon, 
  iconSet = 'Ionicons',
  title, 
  subtitle, 
  color, 
  onPress 
}: {
  icon: string;
  iconSet?: string;
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
  },
  safeArea: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F1F5F9',
    marginTop: 2,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  levelText: {
    fontSize: 12,
    color: '#CBD5E1',
    marginRight: 8,
  },
  expBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
  },
  expFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  quoteCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quoteGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  quoteIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.5,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#E2E8F0',
    lineHeight: 24,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'right',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
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
  progressSection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 16,
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
  dailyChallenge: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  challengeGradient: {
    padding: 20,
  },
  challengeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeText: {
    flex: 1,
    marginHorizontal: 16,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  challengeSubtitle: {
    fontSize: 14,
    color: '#FEE2E2',
  },
  featuredSection: {
    marginTop: 32,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  featuredPhilosopher: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 16,
  },
  philosopherCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  philosopherEmoji: {
    fontSize: 32,
  },
  philosopherInfo: {
    flex: 1,
  },
  philosopherName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  philosopherSchool: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  philosopherStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
});