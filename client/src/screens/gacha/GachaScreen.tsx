import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import { useAtom } from 'jotai';
import { currentUserAtom } from 'client/src/store/atoms';
import { useNavigation } from '@/hooks/useNavigation';
import GachaService, { PullResult } from 'server/src/services/gacha.service';
import DatabaseService from '@/services/firebase/database.service';
import { GachaPullAnimation } from 'client/src/components/gacha/GachaPullAnimation';
import { Philosopher } from 'shared/types/database.types';

const { width, height } = Dimensions.get('window');

interface BannerInfo {
  id: string;
  name: string;
  featuredPhilosopher?: Philosopher;
  endDate: Date;
  rateUp: number;
}

export default function GachaScreen() {
  const navigation = useNavigation();
  const [user] = useAtom(currentUserAtom);
  const [tickets, setTickets] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pullResults, setPullResults] = useState<PullResult[]>([]);
  const [showAnimation, setShowAnimation] = useState(false);
  const [pityCounter, setPityCounter] = useState(0);
  const [pullHistory, setPullHistory] = useState<any[]>([]);
  const [currentBanner, setCurrentBanner] = useState<BannerInfo | null>(null);

  // Animacje
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ticketPulseAnim = useRef(new Animated.Value(1)).current;
  const bannerShineAnim = useRef(new Animated.Value(0)).current;

  const userId = user?.profile?.email || '';

  useEffect(() => {
    loadUserData();
    startAnimations();
  }, [user]);

  const startAnimations = () => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Ticket pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(ticketPulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(ticketPulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Banner shine
    Animated.loop(
      Animated.sequence([
        Animated.timing(bannerShineAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(bannerShineAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadUserData = async () => {
    if (!user || !userId) return;
    
    try {
      // Load tickets
      setTickets(user.stats.gachaTickets || 0);
      
      // Load pull
      const history = await DatabaseService.getUserGachaHistory(userId, 10);
      setPullHistory(history);
      
      // Oblicz Pity
      const recentPulls = history.filter(h => h.poolId === 'standard');
      let pity = 0;
      for (const pull of recentPulls) {
        if (pull.rarity === 'epic' || pull.rarity === 'legendary') {
          break;
        }
        pity++;
      }
      setPityCounter(pity);
      
      // Mock banner 
      setCurrentBanner({
        id: 'philosophy-masters-1',
        name: 'Mistrzowie Filozofii',
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        rateUp: 2,
      });
    } catch (error) {
      console.error('Error loading gacha data:', error);
    }
  };

  const handleSinglePull = async () => {
    if (!user || !userId || tickets < 1) {
      Alert.alert(
        'Brak biletów',
        'Potrzebujesz przynajmniej 1 biletu do losowania.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      const result = await GachaService.pullSingle(userId);
      setPullResults([result]);
      setShowAnimation(true);
      setTickets(prev => prev - 1);
      
      // Update pity counter
      if (result.philosopher.rarity === 'epic' || result.philosopher.rarity === 'legendary') {
        setPityCounter(0);
      } else {
        setPityCounter(prev => prev + 1);
      }
    } catch (error: any) {
      Alert.alert('Błąd', error.message || 'Nie udało się wykonać losowania.');
    } finally {
      setLoading(false);
    }
  };

  const handleMultiPull = async () => {
    if (!user || !userId || tickets < 9) {
      Alert.alert(
        'Brak biletów',
        'Potrzebujesz przynajmniej 9 biletów do 10x losowania.',
        [
          { text: 'OK' },
          { 
            text: 'Kup bilety',
            onPress: () => navigation.navigate('Shop' as any)
          }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const results = await GachaService.pullMulti(userId);
      setPullResults(results);
      setShowAnimation(true);
      setTickets(prev => prev - 9);
      
      // Update pity based on best pull
      const hasHighRarity = results.some(r => 
        r.philosopher.rarity === 'epic' || r.philosopher.rarity === 'legendary'
      );
      if (hasHighRarity) {
        setPityCounter(0);
      } else {
        setPityCounter(prev => prev + 10);
      }
    } catch (error: any) {
      Alert.alert('Błąd', error.message || 'Nie udało się wykonać losowania.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setPullResults([]);
    loadUserData(); // Refresh data
  };

  const formatTimeRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  };

  const getRarityBorderStyle = (rarity: string) => {
  const rarityMap: Record<string, any> = {
    common: styles.commonBorder,
    rare: styles.rareBorder,
    epic: styles.epicBorder,
    legendary: styles.legendaryBorder,
  };
  return rarityMap[rarity] || styles.commonBorder; // fallback
};

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#F3F4F6" />
          </TouchableOpacity>
          <Text style={styles.title}>Gacha</Text>
          <TouchableOpacity onPress={() => navigation.navigate('GachaHistory' as any)}>
            <MaterialCommunityIcons name="history" size={28} color="#F3F4F6" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Ticket Display */}
          <Animated.View 
            style={[
              styles.ticketContainer,
              { transform: [{ scale: ticketPulseAnim }] }
            ]}
          >
            <LinearGradient
              colors={['#F59E0B', '#F97316']}
              style={styles.ticketGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="ticket-percent" size={32} color="#FFFFFF" />
              <Text style={styles.ticketCount}>{tickets}</Text>
              <Text style={styles.ticketLabel}>Bilety</Text>
              <TouchableOpacity 
                style={styles.addTicketButton}
                onPress={() => navigation.navigate('Shop' as any)}
              >
                <Ionicons name="add-circle" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

          {/* Current Banner */}
          {currentBanner && (
            <View style={styles.bannerContainer}>
              <Animated.View
                style={[
                  styles.bannerShine,
                  {
                    opacity: bannerShineAnim,
                    transform: [
                      {
                        translateX: bannerShineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-width, width],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.bannerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.bannerContent}>
                  <Text style={styles.bannerTitle}>{currentBanner.name}</Text>
                  <Text style={styles.bannerSubtitle}>
                    Rate Up x{currentBanner.rateUp}
                  </Text>
                  <View style={styles.bannerTimer}>
                    <Ionicons name="time-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.bannerTimeLeft}>
                      Kończy się za: {formatTimeRemaining(currentBanner.endDate)}
                    </Text>
                  </View>
                </View>
                <LottieView
                  source={require('@/assets/animations/stars.json')}
                  autoPlay
                  loop
                  style={styles.bannerAnimation}
                />
              </LinearGradient>
            </View>
          )}

          {/* Pity Counter */}
          <View style={styles.pityContainer}>
            <View style={styles.pityHeader}>
              <Text style={styles.pityTitle}>System Gwarancji</Text>
              <TouchableOpacity>
                <Ionicons name="information-circle-outline" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <View style={styles.pityProgress}>
              <View style={styles.pityBar}>
                <View 
                  style={[
                    styles.pityFill,
                    { width: `${Math.min(pityCounter * 10, 100)}%` }
                  ]}
                />
              </View>
              <Text style={styles.pityText}>
                {pityCounter}/10 do gwarantowanej rzadkości
              </Text>
            </View>
          </View>

          {/* Pull Buttons */}
          <View style={styles.pullButtonsContainer}>
            <TouchableOpacity
              style={styles.pullButton}
              onPress={handleSinglePull}
              disabled={loading || tickets < 1}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={tickets >= 1 ? ['#3B82F6', '#2563EB'] : ['#4B5563', '#374151']}
                style={styles.pullButtonGradient}
              >
                <MaterialCommunityIcons 
                  name="dice-6" 
                  size={24} 
                  color="#FFFFFF" 
                />
                <Text style={styles.pullButtonText}>Pojedynczy</Text>
                <View style={styles.pullCost}>
                  <MaterialCommunityIcons name="ticket-percent" size={16} color="#FFFFFF" />
                  <Text style={styles.pullCostText}>1</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pullButton}
              onPress={handleMultiPull}
              disabled={loading || tickets < 9}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={tickets >= 9 ? ['#8B5CF6', '#7C3AED'] : ['#4B5563', '#374151']}
                style={styles.pullButtonGradient}
              >
                <MaterialCommunityIcons 
                  name="dice-multiple" 
                  size={24} 
                  color="#FFFFFF" 
                />
                <Text style={styles.pullButtonText}>10x Pull</Text>
                <View style={styles.pullCost}>
                  <MaterialCommunityIcons name="ticket-percent" size={16} color="#FFFFFF" />
                  <Text style={styles.pullCostText}>9</Text>
                </View>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-10%</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Recent Pulls */}
          {pullHistory.slice(0, 5).map((pull, index) => (
  <View
    key={index}
    style={[
      styles.historyItem,
      getRarityBorderStyle(pull.rarity)
    ]}
  >
    <Text style={styles.historyPhilosopher}>
      {pull.philosopherName || '???'}
    </Text>
    <Text style={styles.historyRarity}>{pull.rarity}</Text>
  </View>
))}
        </ScrollView>

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Losowanie...</Text>
          </View>
        )}
      </Animated.View>

      {/* Pull Animation Modal */}
      <GachaPullAnimation
        isVisible={showAnimation}
        pullResults={pullResults}
        onComplete={handleAnimationComplete}
        onSkip={() => setShowAnimation(false)}
      />
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
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  ticketContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  ticketGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  ticketCount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: 12,
  },
  ticketLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  addTicketButton: {
    marginLeft: 16,
  },
  bannerContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    height: 180,
  },
  bannerShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
  bannerGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  bannerContent: {
    zIndex: 2,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  bannerTimer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerTimeLeft: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 6,
  },
  bannerAnimation: {
    position: 'absolute',
    right: -50,
    top: -50,
    width: 200,
    height: 200,
    opacity: 0.3,
  },
  pityContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
  },
  pityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  pityProgress: {
    gap: 8,
  },
  pityBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  pityFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  pityText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  pullButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  pullButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  pullButtonGradient: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  pullButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pullCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pullCostText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historyContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 12,
  },
  historyItem: {
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    minWidth: 100,
    alignItems: 'center',
  },
  historyPhilosopher: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 4,
  },
  historyRarity: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  commonBorder: {
    borderColor: '#9CA3AF',
  },
  rareBorder: {
    borderColor: '#60A5FA',
  },
  epicBorder: {
    borderColor: '#A78BFA',
  },
  legendaryBorder: {
    borderColor: '#FCD34D',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#F3F4F6',
    marginTop: 12,
  },
});