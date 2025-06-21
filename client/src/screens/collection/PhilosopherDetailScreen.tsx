import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from 'client/src/navigation/types';
import DatabaseService from '@/services/firebase/database.service';
import { Philosopher, OwnedPhilosopher, Rarity } from 'shared/types/database.types';
import { useUser } from '@/hooks/useUser';
import AuthService from '@/services/firebase/auth.service';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 52) / 2;

type PhilosopherDetailRouteProp = RouteProp<RootStackParamList, 'PhilosopherDetail'>;

const rarityGradients: Record<Rarity, string[]> = {
  common: ['#9CA3AF', '#6B7280'],
  rare: ['#60A5FA', '#3B82F6'],
  epic: ['#A78BFA', '#8B5CF6'],
  legendary: ['#FCD34D', '#F59E0B'],
};

const rarityBackgrounds: Record<Rarity, string[]> = {
  common: ['#1F2937', '#111827'],
  rare: ['#1E3A8A', '#1E293B'],
  epic: ['#4C1D95', '#312E81'],
  legendary: ['#78350F', '#451A03'],
};

export default function PhilosopherDetailScreen() {
  const route = useRoute<PhilosopherDetailRouteProp>();
  const navigation = useNavigation();
  const { philosopherId } = route.params;
  
  const [philosopher, setPhilosopher] = useState<Philosopher | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuote, setShowQuote] = useState(false);
  
  const userId = AuthService.currentUser?.uid;
  const { user } = useUser(userId || '');
  
  const ownedPhilosopher = user?.philosopherCollection?.[philosopherId];
  const isOwned = !!ownedPhilosopher;

  useEffect(() => {
    loadPhilosopher();
  }, [philosopherId]);

  const loadPhilosopher = async () => {
    try {
      const data = await DatabaseService.getPhilosopher(philosopherId);
      setPhilosopher(data);
    } catch (error) {
      console.error('Błąd ładowania filozofa:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !philosopher) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const displayStats = isOwned && ownedPhilosopher ? ownedPhilosopher.stats : philosopher.baseStats;
  const level = ownedPhilosopher?.level || 1;
  const experience = ownedPhilosopher?.experience || 0;
  const experienceForNextLevel = level * 100;
  const expProgress = experience / experienceForNextLevel;
  const duplicates = ownedPhilosopher?.duplicates || 0;

  // Bonusy z duplikatów i leweli
  const statMultiplier = 1 + (level - 1) * 0.05 + duplicates * 0.1;

  const statCategories = [
    {
      title: 'Umysł',
      stats: [
        { name: 'Logika', key: 'logic', icon: 'brain', color: '#6366F1' },
        { name: 'Epistemologia', key: 'epistemology', icon: 'eye', color: '#8B5CF6' },
        { name: 'Metafizyka', key: 'metaphysics', icon: 'planet', color: '#A78BFA' },
      ],
    },
    {
      title: 'Duch',
      stats: [
        { name: 'Etyka', key: 'ethics', icon: 'heart', color: '#EF4444' },
        { name: 'Estetyka', key: 'aesthetics', icon: 'color-palette', color: '#F59E0B' },
        { name: 'Umysł', key: 'mind', icon: 'bulb', color: '#FCD34D' },
      ],
    },
    {
      title: 'Społeczeństwo',
      stats: [
        { name: 'Język', key: 'language', icon: 'chatbubbles', color: '#10B981' },
        { name: 'Nauka', key: 'science', icon: 'flask', color: '#14B8A6' },
        { name: 'Społeczne', key: 'social', icon: 'people', color: '#06B6D4' },
      ],
    },
  ];

  return (
    <LinearGradient
      colors={rarityBackgrounds[philosopher.rarity]}
      style={styles.container}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Zamknij */}
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={28} color="#F3F4F6" />
        </TouchableOpacity>

        {/* Sekcja z modelem */}
        <View style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={rarityGradients[philosopher.rarity]}
              style={styles.avatarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.avatarInner, !isOwned && styles.lockedAvatar]}>
                {/* Placeholder na animację */}
                <Text style={styles.avatarEmoji}>🏛️</Text>
                {!isOwned && (
                  <View style={styles.lockOverlay}>
                    <Ionicons name="lock-closed" size={48} color="#FFFFFF80" />
                  </View>
                )}
              </View>
              
              {/* Rarity Badge */}
              <View style={[styles.rarityBadge, styles[`${philosopher.rarity}Badge`]]}>
                <Text style={styles.rarityText}>
                  {philosopher.rarity.toUpperCase()}
                </Text>
              </View>
            </LinearGradient>

            {/* Level i Gwiazdki */}
            {isOwned && (
              <View style={styles.levelContainer}>
                <Text style={styles.levelText}>Poziom {level}</Text>
                <View style={styles.starsContainer}>
                  {[...Array(5)].map((_, i) => (
                    <Ionicons 
                      key={i}
                      name="star" 
                      size={16} 
                      color={i < duplicates ? '#FCD34D' : '#374151'} 
                    />
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Info */}
          <Text style={styles.philosopherName}>{philosopher.name}</Text>
          <Text style={styles.philosopherEra}>{philosopher.era}</Text>
          
          <View style={styles.schoolBadge}>
            <MaterialCommunityIcons name="school" size={16} color="#E0E7FF" />
            <Text style={styles.schoolText}>{philosopher.school}</Text>
          </View>

          {/* Experience Bar */}
          {isOwned && (
            <View style={styles.experienceSection}>
              <View style={styles.expHeader}>
                <Text style={styles.expLabel}>Doświadczenie</Text>
                <Text style={styles.expText}>{experience}/{experienceForNextLevel}</Text>
              </View>
              <View style={styles.expBar}>
                <View style={[styles.expFill, { width: `${expProgress * 100}%` }]} />
              </View>
            </View>
          )}
        </View>

        {/* Opic */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opis</Text>
          <Text style={styles.description}>{philosopher.description}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Statystyki</Text>
            {isOwned && (
              <View style={styles.statBonus}>
                <Text style={styles.statBonusText}>
                  +{Math.round((statMultiplier - 1) * 100)}% bonus
                </Text>
              </View>
            )}
          </View>

          {statCategories.map((category, index) => (
            <View key={index} style={styles.statCategory}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <View style={styles.statsGrid}>
                {category.stats.map((stat) => {
                  const baseValue = philosopher.baseStats[stat.key as keyof typeof philosopher.baseStats];
                  const currentValue = isOwned 
                    ? Math.round(baseValue * statMultiplier)
                    : baseValue;
                  
                  return (
                    <View key={stat.key} style={styles.statCard}>
                      <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                        <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                      </View>
                      <Text style={styles.statName}>{stat.name}</Text>
                      <Text style={[styles.statValue, !isOwned && styles.lockedStat]}>
                        {isOwned ? currentValue : '??'}
                      </Text>
                      <View style={styles.statBar}>
                        <View 
                          style={[
                            styles.statBarFill, 
                            { 
                              width: `${isOwned ? (currentValue / 100) * 100 : 0}%`,
                              backgroundColor: stat.color,
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Umiejętność Specjalna */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zdolność Specjalna</Text>
          <TouchableOpacity 
            style={[styles.abilityCard, !isOwned && styles.lockedAbility]}
            disabled={!isOwned}
          >
            <LinearGradient
              colors={isOwned ? ['#6366F120', '#8B5CF620'] : ['#37415120', '#37415120']}
              style={styles.abilityGradient}
            >
              <View style={styles.abilityHeader}>
                <Ionicons 
                  name="flash" 
                  size={24} 
                  color={isOwned ? '#FCD34D' : '#6B7280'} 
                />
                <Text style={[styles.abilityName, !isOwned && styles.lockedText]}>
                  {isOwned ? philosopher.specialAbility.name : '???'}
                </Text>
              </View>
              <Text style={[styles.abilityDescription, !isOwned && styles.lockedText]}>
                {isOwned ? philosopher.specialAbility.description : 'Odblokuj filozofa, aby poznać jego zdolność'}
              </Text>
              {isOwned && (
                <View style={styles.abilityEffect}>
                  <Text style={styles.abilityEffectLabel}>Efekt:</Text>
                  <Text style={styles.abilityEffectText}>{philosopher.specialAbility.effect}</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Cytaty */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cytaty</Text>
          <TouchableOpacity 
            style={styles.quoteCard}
            onPress={() => setShowQuote(!showQuote)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#8B5CF6" />
            <Text style={styles.quoteText}>
              {showQuote || isOwned 
                ? `"${philosopher.quotes[0]}"` 
                : 'Odblokuj filozofa, aby poznać jego mądrości'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Akcje */}
        {!isOwned && (
          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.unlockButton}>
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.unlockGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="dice-multiple" size={24} color="#FFFFFF" />
                <Text style={styles.unlockText}>Zdobądź w Wyroczni</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {isOwned && (
          <View style={styles.ownedInfo}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.ownedText}>W twojej kolekcji</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00000040',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 30,
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatarGradient: {
    width: 200,
    height: 200,
    borderRadius: 100,
    padding: 4,
    position: 'relative',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 96,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedAvatar: {
    opacity: 0.5,
  },
  avatarEmoji: {
    fontSize: 80,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00000060',
    borderRadius: 96,
  },
  rarityBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  commonBadge: {
    backgroundColor: '#6B7280',
  },
  rareBadge: {
    backgroundColor: '#3B82F6',
  },
  epicBadge: {
    backgroundColor: '#8B5CF6',
  },
  legendaryBadge: {
    backgroundColor: '#F59E0B',
  },
  rarityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  levelContainer: {
    position: 'absolute',
    bottom: -30,
    left: '50%',
    transform: [{ translateX: -60 }],
    alignItems: 'center',
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  philosopherName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F3F4F6',
    marginBottom: 8,
    textAlign: 'center',
  },
  philosopherEra: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 16,
  },
  schoolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF10',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  schoolText: {
    fontSize: 14,
    color: '#E0E7FF',
    marginLeft: 6,
    fontWeight: '500',
  },
  experienceSection: {
    width: '80%',
    marginTop: 10,
  },
  expHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  expLabel: {
    fontSize: 14,
    color: '#94A3B8',
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
  },
  expFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  statBonus: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statBonusText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: '#D1D5DB',
    lineHeight: 24,
    marginTop: 8,
  },
  statCategory: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94A3B8',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF10',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statName: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F3F4F6',
    marginBottom: 8,
  },
  lockedStat: {
    color: '#6B7280',
  },
  statBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  abilityCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  lockedAbility: {
    opacity: 0.6,
  },
  abilityGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFFFFF10',
  },
  abilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  abilityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginLeft: 12,
  },
  abilityDescription: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
    marginBottom: 12,
  },
  lockedText: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
  abilityEffect: {
    backgroundColor: '#FFFFFF10',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  abilityEffectLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginRight: 8,
  },
  abilityEffectText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
    flex: 1,
  },
  quoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF10',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  quoteText: {
    fontSize: 16,
    color: '#E0E7FF',
    lineHeight: 24,
    fontStyle: 'italic',
    marginLeft: 12,
    flex: 1,
  },
  actionSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  unlockButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  unlockGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  unlockText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ownedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  ownedText: {
    fontSize: 16,
    color: '#10B981',
    marginLeft: 8,
    fontWeight: '500',
  },
});