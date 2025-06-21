import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Animated,
  RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useAtom } from 'jotai';
import { currentUserAtom } from 'client/src/store/atoms';
import GachaService from 'server/src/services/gacha.service';
import DatabaseService from '@/services/firebase/database.service';
import { Rarity } from 'shared/types/database.types';
import AuthService from '@/services/firebase/auth.service';

interface GachaHistoryItem {
  philosopherId: string;
  philosopherName?: string;
  philosopherSchool?: string;
  timestamp: number;
  poolId: string;
  rarity: Rarity;
}

interface PullStats {
  totalPulls: number;
  rarityBreakdown: Record<Rarity, number>;
  uniquePhilosophers: number;
  lastLegendary?: GachaHistoryItem;
}

interface FilterState {
  poolId?: string;
  rarity?: Rarity;
  dateRange?: '7d' | '30d' | '90d' | 'all';
}

const rarityColors: Record<Rarity, string[]> = {
  common: ['#9CA3AF', '#6B7280'],
  rare: ['#60A5FA', '#3B82F6'],
  epic: ['#A78BFA', '#8B5CF6'],
  legendary: ['#FCD34D', '#F59E0B'],
};

const rarityIcons: Record<Rarity, string> = {
  common: 'ellipse',
  rare: 'diamond',
  epic: 'star',
  legendary: 'flash',
};

const getCurrentUserId = useCallback(() => {
  return AuthService.currentUser?.uid || null;
}, []);

export default function GachaHistoryScreen() {
  const navigation = useNavigation();
  const [user] = useAtom(currentUserAtom);
  
  const [history, setHistory] = useState<GachaHistoryItem[]>([]);
  const [stats, setStats] = useState<PullStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ dateRange: 'all' });
  
  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadHistoryData();
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [filters]);

  

  const loadHistoryData = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Load history with filters
      const historyData = await GachaService.getUserHistory(userId, 100);
      const statsData = await GachaService.getUserPullStats(userId);

      const enrichedHistory = await Promise.all(
  historyData.map(async (pull) => {
    const philosopher = await DatabaseService.getPhilosopher(pull.philosopherId);
    return {
      ...pull,
      philosopherName: philosopher?.name || 'Unknown Philosopher',
      philosopherSchool: philosopher?.school || 'Unknown School'
    };
  })
);

let filteredHistory = enrichedHistory;
      
      // Apply client-side filters
      //let filteredHistory = historyData;
      
      if (filters.rarity) {
        filteredHistory = filteredHistory.filter(item => item.rarity === filters.rarity);
      }
      
      if (filters.poolId) {
        filteredHistory = filteredHistory.filter(item => item.poolId === filters.poolId);
      }
      
      if (filters.dateRange && filters.dateRange !== 'all') {
        const daysBack = {
          '7d': 7,
          '30d': 30,
          '90d': 90,
        }[filters.dateRange];
        
        const cutoffDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
        filteredHistory = filteredHistory.filter(item => item.timestamp >= cutoffDate);
      }
      
      setHistory(filteredHistory);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading gacha history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistoryData();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Dzisiaj';
    if (diffDays === 2) return 'Wczoraj';
    if (diffDays <= 7) return `${diffDays} dni temu`;
    
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Statystyki Losowań</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="counter" size={24} color="#6366F1" />
            <Text style={styles.statValue}>{stats.totalPulls}</Text>
            <Text style={styles.statLabel}>Łącznie</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="account-group" size={24} color="#8B5CF6" />
            <Text style={styles.statValue}>{stats.uniquePhilosophers}</Text>
            <Text style={styles.statLabel}>Unikalnych</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>{stats.rarityBreakdown.legendary}</Text>
            <Text style={styles.statLabel}>Legendarnych</Text>
          </View>
        </View>
        
        {/* Rarity Breakdown */}
        <View style={styles.rarityBreakdown}>
          <Text style={styles.rarityTitle}>Rozkład rzadkości</Text>
          {Object.entries(stats.rarityBreakdown).map(([rarity, count]) => {
            const percentage = stats.totalPulls > 0 ? (count / stats.totalPulls * 100).toFixed(1) : '0';
            
            return (
              <View key={rarity} style={styles.rarityRow}>
                <View style={styles.rarityInfo}>
                  <LinearGradient
                    colors={rarityColors[rarity as Rarity]}
                    style={styles.rarityIcon}
                  >
                    <Ionicons 
                      name={rarityIcons[rarity as Rarity] as any} 
                      size={12} 
                      color="#FFFFFF" 
                    />
                  </LinearGradient>
                  <Text style={styles.rarityName}>
                    {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                  </Text>
                </View>
                <View style={styles.rarityStats}>
                  <Text style={styles.rarityCount}>{count}</Text>
                  <Text style={styles.rarityPercentage}>({percentage}%)</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtry</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#F3F4F6" />
            </TouchableOpacity>
          </View>
          
          {/* Date Range Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Okres</Text>
            <View style={styles.filterOptions}>
              {[
                { key: 'all', label: 'Wszystko' },
                { key: '7d', label: 'Ostatnie 7 dni' },
                { key: '30d', label: 'Ostatnie 30 dni' },
                { key: '90d', label: 'Ostatnie 90 dni' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterOption,
                    filters.dateRange === option.key && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, dateRange: option.key as any }))}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.dateRange === option.key && styles.filterOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Rarity Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Rzadkość</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  !filters.rarity && styles.filterOptionActive,
                ]}
                onPress={() => setFilters(prev => ({ ...prev, rarity: undefined }))}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    !filters.rarity && styles.filterOptionTextActive,
                  ]}
                >
                  Wszystkie
                </Text>
              </TouchableOpacity>
              {(['common', 'rare', 'epic', 'legendary'] as Rarity[]).map((rarity) => (
                <TouchableOpacity
                  key={rarity}
                  style={[
                    styles.filterOption,
                    filters.rarity === rarity && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, rarity }))}
                >
                  <LinearGradient
                    colors={rarityColors[rarity]}
                    style={styles.filterRarityIcon}
                  >
                    <Ionicons 
                      name={rarityIcons[rarity] as any} 
                      size={10} 
                      color="#FFFFFF" 
                    />
                  </LinearGradient>
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.rarity === rarity && styles.filterOptionTextActive,
                    ]}
                  >
                    {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyButtonText}>Zastosuj filtry</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderHistoryItem = ({ item, index }: { item: GachaHistoryItem; index: number }) => {
    const itemAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(itemAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.historyItem,
          {
            opacity: itemAnim,
            transform: [
              {
                translateY: itemAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={rarityColors[item.rarity]}
          style={styles.historyItemGradient}
        >
          <View style={styles.historyItemContent}>
            <View style={styles.historyItemLeft}>
              <View style={styles.rarityIconContainer}>
                <Ionicons 
                  name={rarityIcons[item.rarity] as any} 
                  size={16} 
                  color="#FFFFFF" 
                />
              </View>
              <View style={styles.philosopherInfo}>
                <Text style={styles.philosopherName}>{item.philosopherName}</Text>
                <Text style={styles.philosopherSchool}>{item.philosopherSchool}</Text>
              </View>
            </View>
            
            <View style={styles.historyItemRight}>
              <Text style={styles.pullTime}>{formatTime(item.timestamp)}</Text>
              <Text style={styles.pullDate}>{formatDate(item.timestamp)}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#F3F4F6" />
          </TouchableOpacity>
          <Text style={styles.title}>Historia Losowań</Text>
          <TouchableOpacity onPress={() => setShowFilters(true)}>
            <MaterialCommunityIcons name="filter" size={28} color="#F3F4F6" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Ładowanie historii...</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            renderItem={renderHistoryItem}
            keyExtractor={(item, index) => `${item.philosopherId}-${item.timestamp}-${index}`}
            ListHeaderComponent={renderStatsCard()}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="search" size={64} color="#6B7280" />
                <Text style={styles.emptyTitle}>Brak wyników</Text>
                <Text style={styles.emptySubtitle}>
                  Spróbuj zmienić filtry lub wykonaj pierwsze losowanie
                </Text>
              </View>
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#6366F1"
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </Animated.View>

      {renderFilterModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  
  // Stats Section
  statsContainer: {
    backgroundColor: '#1F2937',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#374151',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F3F4F6',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  
  // Rarity Breakdown
  rarityBreakdown: {
    marginTop: 16,
  },
  rarityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 12,
  },
  rarityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rarityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rarityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rarityName: {
    fontSize: 14,
    color: '#F3F4F6',
    fontWeight: '500',
  },
  rarityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rarityCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  rarityPercentage: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  
  // History Items
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyItemGradient: {
    padding: 1,
    borderRadius: 12,
  },
  historyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 11,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rarityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  philosopherInfo: {
    flex: 1,
  },
  philosopherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 2,
  },
  philosopherSchool: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  pullTime: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F3F4F6',
  },
  pullDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  
  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 12,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  filterOptionActive: {
    backgroundColor: '#6366F1',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  filterRarityIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButton: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Loading & Empty States
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});