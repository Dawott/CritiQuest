import React, { useState } from 'react';
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
import { useAtom } from 'jotai';
import { currentUserAtom } from '@/store/atoms';
import { useUser } from '@/hooks/useUser';
import AuthService from '@/services/firebase/auth.service';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { MainTabParamList, RootStackParamList } from '@/navigation/types';

const { width } = Dimensions.get('window');

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profil'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [currentUser] = useAtom(currentUserAtom);
  const userId = AuthService.currentUser?.uid;
  const { user, loading } = useUser(userId || '');
  const [activeTab, setActiveTab] = useState<'stats' | 'collection' | 'social'>('stats');

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
  
  // Statsy
  const totalPhilosophers = Object.keys(user?.philosopherCollection || {}).length;
  const totalLessons = user?.progression?.completedLessons?.length || 0;
  const totalAchievements = Object.keys(user?.achievements || {}).length;
  const winRate = user?.stats?.perfectScores 
    ? Math.round((user.stats.perfectScores / user.stats.quizzesCompleted) * 100) 
    : 0;

  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Settings */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profil</Text>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={handleLogout}
            >
              <Ionicons name="settings-outline" size={24} color="#F3F4F6" />
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.profileGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Avatar */}
              <View style={styles.avatarSection}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={['#FFFFFF20', '#FFFFFF10']}
                    style={styles.avatarBorder}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {user?.profile?.username?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                  </LinearGradient>
                  <TouchableOpacity style={styles.editAvatarButton}>
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.userInfo}>
                  <Text style={styles.username}>{user?.profile?.username || 'Filozof'}</Text>
                  <Text style={styles.userEmail}>{user?.profile?.email}</Text>
                  <View style={styles.joinedContainer}>
                    <Ionicons name="calendar-outline" size={14} color="#E0E7FF" />
                    <Text style={styles.joinedText}>
                      Dołączył {new Date(user?.profile?.joinedAt || Date.now()).toLocaleDateString('pl-PL', { 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Level & Progress */}
              <View style={styles.levelSection}>
                <View style={styles.levelHeader}>
                  <Text style={styles.levelLabel}>Poziom {userLevel}</Text>
                  <Text style={styles.expText}>{userExp}/{expForNextLevel} XP</Text>
                </View>
                <View style={styles.expBar}>
                  <View style={[styles.expFill, { width: `${expProgress * 100}%` }]} />
                </View>
                <Text style={styles.levelTitle}>
                  {userLevel < 10 ? 'Początkujący Myśliciel' :
                   userLevel < 20 ? 'Adept Filozofii' :
                   userLevel < 30 ? 'Mędrzec' :
                   userLevel < 50 ? 'Mistrz Dialektyki' :
                   'Filozof Doskonały'}
                </Text>
              </View>

              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <QuickStat icon="flame" value={user?.stats?.streakDays || 0} label="Seria dni" />
                <QuickStat icon="time-outline" value={`${Math.round((user?.stats?.totalTimeSpent || 0) / 60)}h`} label="Czas nauki" />
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
              style={[styles.tab, activeTab === 'social' && styles.activeTab]}
              onPress={() => setActiveTab('social')}
            >
              <Text style={[styles.tabText, activeTab === 'social' && styles.activeTabText]}>
                Społeczność
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'stats' && (
            <View style={styles.tabContent}>
              {/* Progress */}
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

              {/* Recent Activity */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ostatnia aktywność</Text>
                <View style={styles.activityList}>
                  <ActivityItem
                    icon="book"
                    title="Ukończono: Wprowadzenie do Etyki"
                    time="2 godziny temu"
                    color="#10B981"
                  />
                  <ActivityItem
                    icon="people"
                    title="Odblokowano: Immanuel Kant"
                    time="Wczoraj"
                    color="#8B5CF6"
                  />
                  <ActivityItem
                    icon="trophy"
                    title="Osiągnięcie: Pierwszy Tydzień"
                    time="3 dni temu"
                    color="#F59E0B"
                  />
                </View>
              </View>
            </View>
          )}

          {activeTab === 'collection' && (
            <View style={styles.tabContent}>
              {/* Philosopher Collection Overview */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Moja kolekcja filozofów</Text>
                  <TouchableOpacity onPress={() => navigation.jumpTo('Gimnazjon')}>
                    <Text style={styles.seeAllText}>Zobacz wszystkich →</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.collectionStats}>
                  <Text style={styles.collectionCount}>{totalPhilosophers}/30</Text>
                  <Text style={styles.collectionLabel}>filozofów odblokowanych</Text>
                </View>

                {/* Rarity Breakdown */}
                <View style={styles.rarityGrid}>
                  <RarityCard rarity="common" count={8} total={12} />
                  <RarityCard rarity="rare" count={4} total={10} />
                  <RarityCard rarity="epic" count={1} total={6} />
                  <RarityCard rarity="legendary" count={0} total={2} />
                </View>

                {/* Featured Philosophers */}
                <Text style={styles.subsectionTitle}>Najsilniejsi filozofowie</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.philosopherScroll}
                >
                  <PhilosopherMini name="Sokrates" level={5} rarity="rare" />
                  <PhilosopherMini name="Arystoteles" level={3} rarity="common" />
                  <PhilosopherMini name="Kant" level={2} rarity="epic" />
                </ScrollView>
              </View>
            </View>
          )}

          {activeTab === 'social' && (
            <View style={styles.tabContent}>
              {/* Friends List */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Znajomi (5)</Text>
                  <TouchableOpacity>
                    <Ionicons name="person-add-outline" size={20} color="#6366F1" />
                  </TouchableOpacity>
                </View>

                <View style={styles.friendsList}>
                  <FriendCard 
                    username="FilozofKról" 
                    level={15} 
                    status="online"
                    philosophers={12}
                  />
                  <FriendCard 
                    username="SokratesFan" 
                    level={8} 
                    status="offline"
                    philosophers={5}
                  />
                  <FriendCard 
                    username="MiłośnikEtyki" 
                    level={22} 
                    status="online"
                    philosophers={18}
                  />
                </View>
              </View>

              {/* Leaderboard */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Twoja pozycja w rankingu</Text>
                <View style={styles.leaderboardCard}>
                  <Text style={styles.rankNumber}>#42</Text>
                  <Text style={styles.rankLabel}>w tym tygodniu</Text>
                  <TouchableOpacity style={styles.viewLeaderboardButton}>
                    <Text style={styles.viewLeaderboardText}>Zobacz ranking</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Helpery
function QuickStat({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <View style={styles.quickStat}>
      <Ionicons name={icon as any} size={20} color="#FFFFFF" style={styles.quickStatIcon} />
      <Text style={styles.quickStatValue}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
    </View>
  );
}

function ProgressCard({ 
  icon, 
  title, 
  value, 
  total, 
  color 
}: { 
  icon: string; 
  title: string; 
  value: number; 
  total: number; 
  color: string;
}) {
  const progress = value / total;
  
  return (
    <View style={styles.progressCard}>
      <View style={[styles.progressIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.progressTitle}>{title}</Text>
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

function ActivityItem({ 
  icon, 
  title, 
  time, 
  color 
}: { 
  icon: string; 
  title: string; 
  time: string; 
  color: string;
}) {
  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activityTime}>{time}</Text>
      </View>
    </View>
  );
}

function RarityCard({ 
  rarity, 
  count, 
  total 
}: { 
  rarity: 'common' | 'rare' | 'epic' | 'legendary'; 
  count: number; 
  total: number;
}) {
  const rarityColors = {
    common: '#9CA3AF',
    rare: '#60A5FA',
    epic: '#A78BFA',
    legendary: '#FCD34D',
  };
  
  const rarityNames = {
    common: 'Zwykłe',
    rare: 'Rzadkie',
    epic: 'Epickie',
    legendary: 'Legendarne',
  };
  
  return (
    <View style={[styles.rarityCard, { borderColor: rarityColors[rarity] }]}>
      <Text style={[styles.rarityName, { color: rarityColors[rarity] }]}>
        {rarityNames[rarity]}
      </Text>
      <Text style={styles.rarityCount}>{count}/{total}</Text>
    </View>
  );
}

function PhilosopherMini({ 
  name, 
  level, 
  rarity 
}: { 
  name: string; 
  level: number; 
  rarity: string;
}) {
  const rarityColors: Record<string, string> = {
    common: '#9CA3AF',
    rare: '#60A5FA',
    epic: '#A78BFA',
    legendary: '#FCD34D',
  };
  
  return (
    <TouchableOpacity style={styles.philosopherMini}>
      <LinearGradient
        colors={[rarityColors[rarity], `${rarityColors[rarity]}80`]}
        style={styles.philosopherMiniGradient}
      >
        <Text style={styles.philosopherMiniEmoji}>🏛️</Text>
        <Text style={styles.philosopherMiniName}>{name}</Text>
        <Text style={styles.philosopherMiniLevel}>Lv. {level}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function FriendCard({ 
  username, 
  level, 
  status, 
  philosophers 
}: { 
  username: string; 
  level: number; 
  status: 'online' | 'offline'; 
  philosophers: number;
}) {
  return (
    <TouchableOpacity style={styles.friendCard}>
      <View style={styles.friendAvatar}>
        <Text style={styles.friendAvatarText}>{username.charAt(0)}</Text>
        <View style={[styles.statusDot, status === 'online' && styles.statusOnline]} />
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendUsername}>{username}</Text>
        <Text style={styles.friendStats}>Poziom {level} • {philosophers} filozofów</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#64748B" />
    </TouchableOpacity>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileGradient: {
    padding: 20,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarBorder: {
    padding: 3,
    borderRadius: 50,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4C1D95',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6366F1',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#E0E7FF',
    marginBottom: 8,
  },
  joinedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinedText: {
    fontSize: 12,
    color: '#E0E7FF',
    marginLeft: 4,
  },
  levelSection: {
    marginBottom: 20,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  expText: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  expBar: {
    height: 8,
    backgroundColor: '#FFFFFF20',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  expFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  levelTitle: {
    fontSize: 14,
    color: '#E0E7FF',
    fontStyle: 'italic',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF20',
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatIcon: {
    marginBottom: 4,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#E0E7FF',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#334155',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  activeTabText: {
    color: '#F3F4F6',
  },
  tabContent: {
    marginTop: 20,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  seeAllText: {
    fontSize: 14,
    color: '#6366F1',
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  progressCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
  },
  progressIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F3F4F6',
    marginBottom: 8,
  },
  progressTotal: {
    fontSize: 16,
    fontWeight: '400',
    color: '#64748B',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  activityList: {
    marginTop: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    color: '#F3F4F6',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#64748B',
  },
  collectionStats: {
    alignItems: 'center',
    marginVertical: 20,
  },
  collectionCount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#6366F1',
  },
  collectionLabel: {
    fontSize: 16,
    color: '#94A3B8',
  },
  rarityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  rarityCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  rarityName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  rarityCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 12,
  },
  philosopherScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  philosopherMini: {
    marginRight: 12,
  },
  philosopherMiniGradient: {
    width: 100,
    height: 120,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  philosopherMiniEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  philosopherMiniName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  philosopherMiniLevel: {
    fontSize: 11,
    color: '#FFFFFF80',
  },
  friendsList: {
    marginTop: 16,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  friendAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#6B7280',
    borderWidth: 3,
    borderColor: '#1E293B',
  },
  statusOnline: {
    backgroundColor: '#10B981',
  },
  friendInfo: {
    flex: 1,
  },
  friendUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 2,
  },
  friendStats: {
    fontSize: 13,
    color: '#94A3B8',
  },
  leaderboardCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  rankNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#6366F1',
    marginBottom: 4,
  },
  rankLabel: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 16,
  },
  viewLeaderboardButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewLeaderboardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});