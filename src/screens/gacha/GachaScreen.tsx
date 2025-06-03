import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAtom } from 'jotai';
import { currentUserAtom } from '@/store/atoms';
import { useNavigation } from '@/hooks/useNavigation';
import GachaService, { PullResult } from '@/services/gacha.service';
import DatabaseService from '@/services/firebase/database.service';
import { PhilosopherCard } from '@/components/philosophers/PhilosopherCard';
import { Button } from '@/components/common/Button';

const { width, height } = Dimensions.get('window');

export default function GachaScreen() {
  const navigation = useNavigation();
  const [user] = useAtom(currentUserAtom);
  const [tickets, setTickets] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pullResults, setPullResults] = useState<PullResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const userId = user?.profile?.email || '';

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user || !userId) return;
    
    try {
      // Aktywne tickety
      setTickets(user.stats.gachaTickets || 0);
      
      // Statystyki pullów
      const userStats = await GachaService.getUserPullStats(userId);
      setStats(userStats);
    } catch (error) {
      console.error('Błąd podczas ładowania Gachy:', error);
    }
  };

  const handleSinglePull = async () => {
    if (!user || !userId || tickets < 1) {
      Alert.alert('Brak biletów', 'Potrzebujesz przynajmniej 1 biletu do losowania.');
      return;
    }

    setLoading(true);
    try {
      const result = await GachaService.pullSingle(userId);
      setPullResults([result]);
      setShowResults(true);
      setTickets(prev => prev - 1);
    } catch (error: any) {
      Alert.alert('Błąd', error.message || 'Nie udało się wykonać losowania.');
    } finally {
      setLoading(false);
    }
  };

  const handleMultiPull = async () => {
    if (!user || !userId || tickets < 9) {
      Alert.alert('Brak biletów', 'Potrzebujesz przynajmniej 9 biletów do 10x losowania.');
      return;
    }

    setLoading(true);
    try {
      const results = await GachaService.pullMulti(userId);
      setPullResults(results);
      setShowResults(true);
      setTickets(prev => prev - 9);
    } catch (error: any) {
      Alert.alert('Błąd', error.message || 'Nie udało się wykonać losowania.');
    } finally {
      setLoading(false);
    }
  };

  const renderResultsModal = () => {
    if (!showResults) return null;

    return (
      <View style={styles.resultsModal}>
        <LinearGradient
          colors={['rgba(17, 24, 39, 0.95)', 'rgba(31, 41, 55, 0.98)']}
          style={styles.resultsContainer}
        >
          <Text style={styles.resultsTitle}>Wyniki losowania</Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.resultsScroll}
          >
            {pullResults.map((result, index) => (
              <View key={index} style={styles.resultCard}>
                <PhilosopherCard
                  philosopher={result.philosopher}
                  isOwned={true}
                  showStats={false}
                />
                {result.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NOWY!</Text>
                  </View>
                )}
                {result.isDuplicate && (
                  <Text style={styles.duplicateText}>+1 Duplikat</Text>
                )}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowResults(false);
              setPullResults([]);
              loadUserData(); // Refresh
            }}
          >
            <Text style={styles.closeButtonText}>Zamknij</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Wyrocznia</Text>
          <Text style={styles.subtitle}>
            Zapytaj wyrocznię o nowych filozofów
          </Text>
        </View>

        {/* Tickety */}
        <View style={styles.ticketContainer}>
          <MaterialCommunityIcons name="ticket-percent" size={32} color="#FCD34D" />
          <Text style={styles.ticketCount}>{tickets}</Text>
          <Text style={styles.ticketLabel}>Biletów</Text>
        </View>

        {/* Pool Info */}
        <View style={styles.poolInfo}>
          <Text style={styles.poolTitle}>Standardowa Pula</Text>
          <View style={styles.ratesContainer}>
            <RateItem rarity="common" rate="60%" color="#9CA3AF" />
            <RateItem rarity="rare" rate="30%" color="#60A5FA" />
            <RateItem rarity="epic" rate="8%" color="#A78BFA" />
            <RateItem rarity="legendary" rate="2%" color="#FCD34D" />
          </View>
          <Text style={styles.guaranteeText}>
            Gwarantowany rzadki lub lepszy co 10 losowań
          </Text>
        </View>

        {/* Przyciski */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.pullButton, tickets < 1 && styles.disabledButton]}
            onPress={handleSinglePull}
            disabled={loading || tickets < 1}
          >
            <LinearGradient
              colors={tickets >= 1 ? ['#6366F1', '#8B5CF6'] : ['#4B5563', '#6B7280']}
              style={styles.buttonGradient}
            >
              <MaterialCommunityIcons name="dice-3" size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>Losuj x1</Text>
              <Text style={styles.costText}>1 bilet</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pullButton, tickets < 9 && styles.disabledButton]}
            onPress={handleMultiPull}
            disabled={loading || tickets < 9}
          >
            <LinearGradient
              colors={tickets >= 9 ? ['#10B981', '#059669'] : ['#4B5563', '#6B7280']}
              style={styles.buttonGradient}
            >
              <MaterialCommunityIcons name="dice-multiple" size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>Losuj x10</Text>
              <Text style={styles.costText}>9 biletów</Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-10%</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Staty */}
        {stats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Twoje statystyki</Text>
            <View style={styles.statsGrid}>
              <StatItem 
                icon="chart-line" 
                label="Łącznie losowań" 
                value={stats.totalPulls} 
              />
              <StatItem 
                icon="account-group" 
                label="Unikalni filozofowie" 
                value={stats.uniquePhilosophers} 
              />
              <StatItem 
                icon="star" 
                label="Legendarne" 
                value={stats.rarityBreakdown.legendary} 
                color="#FCD34D"
              />
              <StatItem 
                icon="diamond-stone" 
                label="Epickie" 
                value={stats.rarityBreakdown.epic} 
                color="#A78BFA"
              />
            </View>
          </View>
        )}

        {/* Historia */}
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={() => navigation.navigate('GachaHistory' as any)}
        >
          <Ionicons name="time-outline" size={20} color="#6366F1" />
          <Text style={styles.historyButtonText}>Zobacz historię losowań</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Pytam wyrocznię...</Text>
        </View>
      )}

      {/* Modal rezulattów */}
      {renderResultsModal()}
    </SafeAreaView>
  );
}

// Helper Components
function RateItem({ rarity, rate, color }: { rarity: string; rate: string; color: string }) {
  return (
    <View style={styles.rateItem}>
      <View style={[styles.rarityDot, { backgroundColor: color }]} />
      <Text style={styles.rarityLabel}>{rarity}</Text>
      <Text style={styles.rateValue}>{rate}</Text>
    </View>
  );
}

function StatItem({ 
  icon, 
  label, 
  value, 
  color = '#6366F1' 
}: { 
  icon: string; 
  label: string; 
  value: number;
  color?: string;
}) {
  return (
    <View style={styles.statItem}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F3F4F6',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  ticketContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F2937',
    marginHorizontal: 24,
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginBottom: 24,
  },
  ticketCount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FCD34D',
    marginHorizontal: 16,
  },
  ticketLabel: {
    fontSize: 18,
    color: '#D1D5DB',
  },
  poolInfo: {
    backgroundColor: '#1F2937',
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  poolTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 16,
    textAlign: 'center',
  },
  ratesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  rateItem: {
    alignItems: 'center',
  },
  rarityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  rarityLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  rateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  guaranteeText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  pullButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    position: 'relative',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  costText: {
    fontSize: 14,
    color: '#E5E7EB',
    marginTop: 4,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F3F4F6',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 24,
  },
  historyButtonText: {
    fontSize: 16,
    color: '#6366F1',
    marginLeft: 8,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#F3F4F6',
    marginTop: 16,
  },
  resultsModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
  },
  resultsContainer: {
    margin: 24,
    borderRadius: 16,
    padding: 24,
    maxHeight: height * 0.8,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F3F4F6',
    textAlign: 'center',
    marginBottom: 24,
  },
  resultsScroll: {
    paddingHorizontal: 8,
  },
  resultCard: {
    marginHorizontal: 8,
    alignItems: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  newBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  duplicateText: {
    fontSize: 14,
    color: '#F59E0B',
    marginTop: 8,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#374151',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    textAlign: 'center',
  },
});