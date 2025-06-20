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

const { width } = Dimensions.get('window');
const SLOT_SIZE = (width - 80) / 4;
const CARD_WIDTH = (width - 60) / 3;

interface TeamPhilosopher extends Philosopher {
  id: string;
  owned: OwnedPhilosopher;
  level: number;
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

const getCurrentUserId = useCallback(() => {
  return AuthService.currentUser?.uid || null;
}, []);

export default function TeamBuilderScreen() {
  const navigation = useNavigation();
  const [user] = useAtom(currentUserAtom);
  
  const [ownedPhilosophers, setOwnedPhilosophers] = useState<TeamPhilosopher[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<(TeamPhilosopher | null)[]>([null, null, null, null]);
  const [loading, setLoading] = useState(true);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const teamPowerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadOwnedPhilosophers();
    
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

  useEffect(() => {
    // Animate team power calculation
    Animated.spring(teamPowerAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [selectedTeam]);

  const loadOwnedPhilosophers = async () => {
    const userId = getCurrentUserId();
    if (!userId || !user?.philosopherCollection) return;
    
    try {
      setLoading(true);
      
      const philosopherPromises = Object.entries(user.philosopherCollection).map(
        async ([philosopherId, ownedData]) => {
          const philosopher = await DatabaseService.getPhilosopher(philosopherId);
          if (philosopher) {
            return {
              id: philosopherId,
              ...philosopher,
              owned: ownedData,
              level: ownedData.level || 1,
            };
          }
          return null;
        }
      );
      
      const philosophers = (await Promise.all(philosopherPromises))
        .filter((p): p is TeamPhilosopher => p !== null)
        .sort((a, b) => b.level - a.level); // Sort by level descending
      
      setOwnedPhilosophers(philosophers);
    } catch (error) {
      console.error('Error loading philosophers:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToTeam = (philosopher: TeamPhilosopher) => {
    const emptySlotIndex = selectedTeam.findIndex(slot => slot === null);
    if (emptySlotIndex !== -1) {
      const newTeam = [...selectedTeam];
      newTeam[emptySlotIndex] = philosopher;
      setSelectedTeam(newTeam);
    }
  };

  const removeFromTeam = (index: number) => {
    const newTeam = [...selectedTeam];
    newTeam[index] = null;
    setSelectedTeam(newTeam);
  };

  const isPhilosopherInTeam = (philosopher: TeamPhilosopher) => {
    return selectedTeam.some(member => member?.id === philosopher.id);
  };

  const calculateTeamPower = () => {
    return selectedTeam.reduce((total, member) => {
      if (!member) return total;
      
      // Simple power calculation based on level and base stats
      const baseStats = member.baseStats;
      const statSum = Object.values(baseStats).reduce((sum, stat) => sum + stat, 0);
      const levelMultiplier = 1 + (member.level - 1) * 0.1;
      
      return total + Math.round(statSum * levelMultiplier);
    }, 0);
  };

  const getTeamSynergy = () => {
    const schools = selectedTeam
      .filter(member => member !== null)
      .map(member => member!.school);
    
    const uniqueSchools = new Set(schools);
    const teamSize = selectedTeam.filter(member => member !== null).length;
    
    if (teamSize === 0) return { bonus: 0, description: 'Brak drużyny' };
    if (uniqueSchools.size === 1 && teamSize >= 2) {
      return { bonus: 15, description: 'Jedność szkoły +15%' };
    }
    if (uniqueSchools.size === teamSize && teamSize >= 3) {
      return { bonus: 10, description: 'Różnorodność +10%' };
    }
    
    return { bonus: 0, description: 'Brak synergii' };
  };

  const renderTeamSlot = (index: number) => {
    const member = selectedTeam[index];
    const slotAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(slotAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        key={index}
        style={[
          styles.teamSlot,
          {
            opacity: slotAnim,
            transform: [
              {
                scale: slotAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.slotContainer}
          onPress={() => member && removeFromTeam(index)}
          activeOpacity={0.8}
        >
          {member ? (
            <LinearGradient
              colors={rarityGradients[member.rarity]}
              style={styles.slotGradient}
            >
              <View style={styles.slotContent}>
                <View style={styles.slotAvatar}>
                  <Ionicons name="person" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.slotName} numberOfLines={1}>
                  {member.name}
                </Text>
                <Text style={styles.slotLevel}>Lv.{member.level}</Text>
              </View>
              
              {/* Remove button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFromTeam(index)}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>
          ) : (
            <View style={styles.emptySlot}>
              <Ionicons name="add" size={32} color="#6B7280" />
              <Text style={styles.emptySlotText}>Slot {index + 1}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderTeamStats = () => {
    const teamPower = calculateTeamPower();
    const synergy = getTeamSynergy();
    const teamSize = selectedTeam.filter(member => member !== null).length;

    return (
      <Animated.View
        style={[
          styles.teamStatsContainer,
          {
            opacity: teamPowerAnim,
            transform: [
              {
                scale: teamPowerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#1F2937', '#374151']}
          style={styles.teamStatsGradient}
        >
          <View style={styles.teamStatsHeader}>
            <MaterialCommunityIcons name="chart-line" size={24} color="#6366F1" />
            <Text style={styles.teamStatsTitle}>Moc Drużyny</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{teamPower}</Text>
              <Text style={styles.statLabel}>Siła</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{teamSize}/4</Text>
              <Text style={styles.statLabel}>Członkowie</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: synergy.bonus > 0 ? '#10B981' : '#9CA3AF' }]}>
                +{synergy.bonus}%
              </Text>
              <Text style={styles.statLabel}>Synergia</Text>
            </View>
          </View>
          
          {synergy.bonus > 0 && (
            <View style={styles.synergyBonus}>
              <Ionicons name="flash" size={16} color="#10B981" />
              <Text style={styles.synergyText}>{synergy.description}</Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderPhilosopherCard = ({ item, index }: { item: TeamPhilosopher; index: number }) => {
    const isInTeam = isPhilosopherInTeam(item);
    const canAdd = !isInTeam && selectedTeam.filter(member => member !== null).length < 4;
    
    const cardAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.philosopherCard,
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.cardContainer, isInTeam && styles.cardSelected]}
          onPress={() => canAdd && addToTeam(item)}
          activeOpacity={canAdd ? 0.8 : 1}
          disabled={!canAdd}
        >
          <LinearGradient
            colors={isInTeam ? ['#10B981', '#059669'] : rarityGradients[item.rarity]}
            style={styles.cardGradient}
          >
            <View style={styles.cardHeader}>
              <LinearGradient
                colors={schoolColors[item.school] || ['#6B7280', '#374151']}
                style={styles.schoolBadge}
              >
                <Text style={styles.schoolText}>{item.school}</Text>
              </LinearGradient>
              
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>Lv.{item.level}</Text>
              </View>
            </View>
            
            <View style={styles.cardAvatar}>
              <Ionicons name="person" size={32} color="#FFFFFF" />
            </View>
            
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.cardEra} numberOfLines={1}>
                {item.era}
              </Text>
            </View>
            
            {isInTeam && (
              <View style={styles.selectedBadge}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            )}
            
            {!canAdd && !isInTeam && (
              <View style={styles.disabledOverlay}>
                <Text style={styles.disabledText}>Drużyna pełna</Text>
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
          <Text style={styles.loadingText}>Ładowanie filozofów...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#F3F4F6" />
          </TouchableOpacity>
          <Text style={styles.title}>Budowniczy Szkół</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Team Formation Section */}
          <View style={styles.teamSection}>
            <Text style={styles.sectionTitle}>Twoja Szkoła Filozoficzna</Text>
            <Text style={styles.sectionSubtitle}>
              Wybierz do 4 filozofów aby stworzyć potężną szkołę myśli
            </Text>
            
            <View style={styles.teamSlotsContainer}>
              {[0, 1, 2, 3].map(index => renderTeamSlot(index))}
            </View>
          </View>

          {/* Team Stats */}
          {renderTeamStats()}

          {/* Available Philosophers */}
          <View style={styles.availableSection}>
            <View style={styles.availableHeader}>
              <Text style={styles.sectionTitle}>Dostępni Filozofowie</Text>
              <Text style={styles.availableCount}>
                {ownedPhilosophers.length} posiadanych
              </Text>
            </View>
            
            {ownedPhilosophers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#6B7280" />
                <Text style={styles.emptyTitle}>Brak filozofów</Text>
                <Text style={styles.emptySubtitle}>
                  Użyj Wyroczni aby zdobyć pierwszych filozofów do swojej szkoły
                </Text>
              </View>
            ) : (
              <FlatList
                data={ownedPhilosophers}
                renderItem={renderPhilosopherCard}
                keyExtractor={(item) => item.id}
                numColumns={3}
                scrollEnabled={false}
                columnWrapperStyle={styles.cardRow}
                contentContainerStyle={styles.cardGrid}
              />
            )}
          </View>
        </ScrollView>
      </Animated.View>
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
  headerSpacer: {
    width: 28,
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
  
  // Team Section
  teamSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  teamSlotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  
  // Team Slots
  teamSlot: {
    width: SLOT_SIZE,
  },
  slotContainer: {
    height: SLOT_SIZE * 1.2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  slotGradient: {
    flex: 1,
    padding: 8,
    position: 'relative',
  },
  slotContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  slotLevel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: '#4B5563',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  emptySlotText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  
  // Team Stats
  teamStatsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  teamStatsGradient: {
    padding: 16,
  },
  teamStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  synergyBonus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  synergyText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
  },
  
  // Available Philosophers
  availableSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  availableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  availableCount: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  
  // Philosopher Cards
  cardGrid: {
    gap: 12,
  },
  cardRow: {
    justifyContent: 'space-between',
  },
  philosopherCard: {
    width: CARD_WIDTH,
    marginBottom: 12,
  },
  cardContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardSelected: {
    transform: [{ scale: 0.95 }],
  },
  cardGradient: {
    padding: 12,
    minHeight: 140,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  schoolBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  schoolText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  levelBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  cardInfo: {
    alignItems: 'center',
  },
  cardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  cardEra: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  disabledText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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