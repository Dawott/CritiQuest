import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useAtom } from 'jotai';
import { currentUserAtom } from '@/store/atoms';
import DatabaseService from '@/services/firebase/database.service';
import { Philosopher, OwnedPhilosopher, Rarity } from '@/types/database.types';
import AuthService from '@/services/firebase/auth.service';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

interface PhilosopherCard extends Philosopher {
  id: string;
  owned?: OwnedPhilosopher;
  isOwned: boolean;
}

interface CollectionStats {
  totalOwned: number;
  totalAvailable: number;
  completionPercentage: number;
  rarityBreakdown: Record<Rarity, { owned: number; total: number }>;
  averageLevel: number;
  strongestPhilosopher: PhilosopherCard | null;
}

const rarityGradients: Record<Rarity, string[]> = {
  common: ['#9CA3AF', '#6B7280'],
  rare: ['#60A5FA', '#3B82F6'],
  epic: ['#A78BFA', '#8B5CF6'],
  legendary: ['#FCD34D', '#F59E0B'],
};

const schoolColors: Record<string, string[]> = {
  'Starożytna': ['#DC2626', '#EF4444'],
  'Średniowieczna': ['#7C2D12', '#A16207'],
  'Renesansowa': ['#059669', '#10B981'],
  'Nowożytna': ['#7C3AED', '#8B5CF6'],
  'Współczesna': ['#0891B2', '#06B6D4'],
  'Analityczna': ['#4338CA', '#6366F1'],
  'Fenomenologia': ['#BE185D', '#EC4899'],
  'Pragmatyzm': ['#EA580C', '#F97316'],
};

export default function CollectionHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [user] = useAtom(currentUserAtom);
  
  const [philosophers, setPhilosophers] = useState<PhilosopherCard[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'owned' | Rarity>('owned');
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  const getCurrentUserId = useCallback(() => {
    return AuthService.currentUser?.uid || null;
  }, []);

  useEffect(() => {
    loadCollectionData();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [user]);

  const loadCollectionData = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Load all philosophers and user's collection
      const allPhilosophers = await DatabaseService.getAllPhilosophers();
      const userCollection = user?.philosopherCollection || {};
      
      // Merge philosopher data with ownership info
      const philosopherCards: PhilosopherCard[] = Object.entries(allPhilosophers).map(([id, philosopher]) => ({
        id,
        ...philosopher,
        owned: userCollection[id],
        isOwned: !!userCollection[id],
      }));
      
      // Calculate stats
      const ownedPhilosophers = philosopherCards.filter(p => p.isOwned);
      const rarityBreakdown: Record<Rarity, { owned: number; total: number }> = {
        common: { owned: 0, total: 0 },
        rare: { owned: 0, total: 0 },
        epic: { owned: 0, total: 0 },
        legendary: { owned: 0, total: 0 },
      };
      
      philosopherCards.forEach(p => {
        rarityBreakdown[p.rarity].total++;
        if (p.isOwned) {
          rarityBreakdown[p.rarity].owned++;
        }
      });
      
      const averageLevel = ownedPhilosophers.length > 0
        ? ownedPhilosophers.reduce((sum, p) => sum + (p.owned?.level || 1), 0) / ownedPhilosophers.length
        : 0;
      
      const strongestPhilosopher = ownedPhilosophers.reduce((strongest, current) => {
        const currentLevel = current.owned?.level || 1;
        const strongestLevel = strongest?.owned?.level || 0;
        return currentLevel > strongestLevel ? current : strongest;
      }, null as PhilosopherCard | null);
      
      const collectionStats: CollectionStats = {
        totalOwned: ownedPhilosophers.length,
        totalAvailable: philosopherCards.length,
        completionPercentage: (ownedPhilosophers.length / philosopherCards.length) * 100,
        rarityBreakdown,
        averageLevel,
        strongestPhilosopher,
      };
      
      setPhilosophers(philosopherCards);
      setStats(collectionStats);
    } catch (error) {
      console.error('Error loading collection:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPhilosophers = () => {
    let filtered = philosophers;
    
    switch (selectedFilter) {
      case 'owned':
        filtered = philosophers.filter(p => p.isOwned);
        break;
      case 'all':
        // Show all philosophers
        break;
      default:
        // Filter by rarity
        filtered = philosophers.filter(p => p.rarity === selectedFilter);
        break;
    }
    
    return filtered.sort((a, b) => {
      // Sort owned philosophers first, then by rarity, then by name
      if (a.isOwned && !b.isOwned) return -1;
      if (!a.isOwned && b.isOwned) return 1;
      
      const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
      const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity];
      if (rarityDiff !== 0) return rarityDiff;
      
      return a.name.localeCompare(b.name);
    });
  };

  const renderStatsOverview = () => {
    if (!stats) return null;

    return (
      <Animated.View
        style={[
          styles.statsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#1F2937', '#374151']}
          style={styles.statsGradient}
        >
          <View style={styles.statsHeader}>
            <MaterialCommunityIcons name="school" size={32} color="#6366F1" />
            <View style={styles.statsHeaderText}>
              <Text style={styles.statsTitle}>Mój Gimnazjon</Text>
              <Text style={styles.statsSubtitle}>
                {stats.totalOwned}/{stats.totalAvailable} filozofów
              </Text>
            </View>
            <View style={styles.completionBadge}>
              <Text style={styles.completionPercentage}>
                {Math.round(stats.completionPercentage)}%
              </Text>
            </View>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={[
                  styles.progressFill,
                  { width: `${stats.completionPercentage}%` },
                ]}
              />
            </View>
          </View>
          
          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Ionicons name="trending-up" size={16} color="#10B981" />
              <Text style={styles.quickStatValue}>
                {stats.averageLevel.toFixed(1)}
              </Text>
              <Text style={styles.quickStatLabel}>Śr. poziom</Text>
            </View>
            
            {stats.strongestPhilosopher && (
              <View style={styles.quickStat}>
                <Ionicons name="flash" size={16} color="#F59E0B" />
                <Text style={styles.quickStatValue}>
                  {stats.strongestPhilosopher.owned?.level || 1}
                </Text>
                <Text style={styles.quickStatLabel}>Najsilniejszy</Text>
              </View>
            )}
            
            <View style={styles.quickStat}>
              <Ionicons name="star" size={16} color="#FCD34D" />
              <Text style={styles.quickStatValue}>
                {stats.rarityBreakdown.legendary.owned}
              </Text>
              <Text style={styles.quickStatLabel}>Legendarni</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderRarityFilter = () => (
    <View style={styles.filterContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === 'owned' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedFilter('owned')}
        >
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={[
            styles.filterText,
            selectedFilter === 'owned' && styles.filterTextActive,
          ]}>
            Posiadane
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setSelectedFilter('all')}
        >
          <Ionicons name="library" size={16} color="#6366F1" />
          <Text style={[
            styles.filterText,
            selectedFilter === 'all' && styles.filterTextActive,
          ]}>
            Wszystkie
          </Text>
        </TouchableOpacity>
        
        {(['legendary', 'epic', 'rare', 'common'] as Rarity[]).map((rarity) => (
          <TouchableOpacity
            key={rarity}
            style={[
              styles.filterButton,
              selectedFilter === rarity && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter(rarity)}
          >
            <LinearGradient
              colors={rarityGradients[rarity]}
              style={styles.filterRarityIcon}
            >
              <Ionicons name="diamond" size={10} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[
              styles.filterText,
              selectedFilter === rarity && styles.filterTextActive,
            ]}>
              {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPhilosopherCard = ({ item, index }: { item: PhilosopherCard; index: number }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, [selectedFilter]);

    const level = item.owned?.level || 1;
    const experience = item.owned?.experience || 0;
    const maxExp = level * 100;
    const expProgress = experience / maxExp;

    return (
      <Animated.View
        style={[
          styles.philosopherCard,
          {
            opacity: cardAnim,
            transform: [
              {
                scale: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PhilosopherDetail', { philosopherId: item.id })}
        >
          <LinearGradient
            colors={item.isOwned ? rarityGradients[item.rarity] : ['#374151', '#1F2937']}
            style={styles.cardGradient}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={schoolColors[item.school] || ['#6B7280', '#374151']}
                style={styles.schoolBadge}
              >
                <Text style={styles.schoolText}>{item.school}</Text>
              </LinearGradient>
              
              {item.isOwned && (
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>Lv.{level}</Text>
                </View>
              )}
            </View>
            
            {/* Philosopher Avatar Placeholder */}
            <View style={[
              styles.avatarContainer,
              !item.isOwned && styles.lockedAvatar,
            ]}>
              <Ionicons 
                name="person" 
                size={48} 
                color={item.isOwned ? "#FFFFFF" : "#6B7280"} 
              />
            </View>
            
            {/* Philosopher Info */}
            <View style={styles.cardInfo}>
              <Text style={[
                styles.philosopherName,
                !item.isOwned && styles.lockedText,
              ]}>
                {item.isOwned ? item.id : '???'}
              </Text>
              <Text style={[
                styles.philosopherEra,
                !item.isOwned && styles.lockedText,
              ]}>
                {item.isOwned ? item.era : 'Nieznana epoka'}
              </Text>
            </View>
            
            {/* Experience Bar for Owned Philosophers */}
            {item.isOwned && (
              <View style={styles.expContainer}>
                <View style={styles.expBar}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={[styles.expFill, { width: `${expProgress * 100}%` }]}
                  />
                </View>
                <Text style={styles.expText}>
                  {experience}/{maxExp} EXP
                </Text>
              </View>
            )}
            
            {/* Lock Overlay for Unowned */}
            {!item.isOwned && (
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={24} color="#6B7280" />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Ładowanie kolekcji...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredPhilosophers = getFilteredPhilosophers();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Overview */}
        {renderStatsOverview()}
        
        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actionContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('TeamBuilder' as any)}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.actionButtonGradient}
            >
              <MaterialCommunityIcons name="account-group" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Zbuduj Szkołę</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('GachaHistory' as any)}
          >
            <LinearGradient
              colors={['#F59E0B', '#F97316']}
              style={styles.actionButtonGradient}
            >
              <MaterialCommunityIcons name="history" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Historia Losowań</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Filter Tabs */}
        {renderRarityFilter()}
        
        {/* Philosophers Grid */}
        <View style={styles.gridContainer}>
          <FlatList
            data={filteredPhilosophers}
            renderItem={renderPhilosopherCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.gridContent}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  
  // Stats Overview
  statsContainer: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsGradient: {
    padding: 20,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  statsSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  completionBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completionPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickStat: {
    alignItems: 'center',
    gap: 4,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  
  // Action Buttons
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Filters
  filterContainer: {
    marginBottom: 20,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#374151',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
  },
  filterText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterRarityIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Philosophers Grid
  gridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  gridContent: {
    gap: 12,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  philosopherCard: {
    width: CARD_WIDTH,
    marginBottom: 12,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 16,
    minHeight: 200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  schoolBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  schoolText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  levelBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  lockedAvatar: {
    backgroundColor: 'rgba(107, 114, 128, 0.3)',
  },
  cardInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  philosopherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  philosopherEra: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  lockedText: {
    color: '#6B7280',
  },
  expContainer: {
    marginTop: 8,
  },
  expBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  expFill: {
    height: '100%',
    borderRadius: 2,
  },
  expText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
});