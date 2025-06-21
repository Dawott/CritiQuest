import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DatabaseService from '../../services/firebase/database.service';
import { Philosopher, Rarity } from '../../../../shared/types/database.types';

const { width } = Dimensions.get('window');

interface PhilosopherHelperProps {
  philosopherId: string;
  onHintRequest: () => void;
}

const rarityGradients: Record<Rarity, string[]> = {
  common: ['rgba(156, 163, 175, 0.1)', 'rgba(107, 114, 128, 0.1)'],
  rare: ['rgba(96, 165, 250, 0.1)', 'rgba(59, 130, 246, 0.1)'],
  epic: ['rgba(167, 139, 250, 0.1)', 'rgba(139, 92, 246, 0.1)'],
  legendary: ['rgba(252, 211, 77, 0.1)', 'rgba(245, 158, 11, 0.1)'],
};

const rarityColors: Record<Rarity, string> = {
  common: '#9CA3AF',
  rare: '#60A5FA', 
  epic: '#A78BFA',
  legendary: '#FCD34D',
};

export default function PhilosopherHelper({ 
  philosopherId, 
  onHintRequest 
}: PhilosopherHelperProps) {
  const [philosopher, setPhilosopher] = useState<Philosopher | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Animacje
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    loadPhilosopher();
    
    // Animacja wejścia
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
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

  const handleExpand = () => {
    setExpanded(!expanded);
    Animated.spring(expandAnim, {
      toValue: expanded ? 0 : 1,
      tension: 50,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const handleHintRequest = () => {
    if (hintUsed) return;
    
    setHintUsed(true);
    onHintRequest();
    
    // Sukces
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(pulseAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getPhilosopherEmoji = (school: string): string => {
    const schoolEmojis: Record<string, string> = {
      'sokratyzm': '💭',
      'platonizm': '🏛️',
      'arystotelizm': '📚',
      'stoicyzm': '⚖️',
      'epikureizm': '🌿',
      'cynizm': '🐕',
      'idealizm niemiecki': '🧠',
      'empiryzm': '🔬',
      'racjonalizm': '💡',
      'egzystencjalizm': '🎭',
      'utylitaryzm': '⚖️',
      'deontologia': '📜',
      'fenomenologia': '👁️',
    };
    
    return schoolEmojis[school.toLowerCase()] || '🏛️';
  };

  const getHintText = (philosopher: Philosopher): string => {
    const hintTemplates = [
      `Z perspektywy ${philosopher.school}: "${philosopher.quotes[0]}"`,
      `${philosopher.name} by powiedział: Rozważ to z punktu widzenia ${philosopher.school.toLowerCase()}.`,
      `Według ${philosopher.specialAbility.name}: ${philosopher.specialAbility.description}`,
      `Szkoła ${philosopher.school} uczy nas, że należy skupić się na podstawowych zasadach tej filozofii.`,
    ];
    
    return hintTemplates[Math.floor(Math.random() * hintTemplates.length)];
  };

  if (loading || !philosopher) {
    return (
      <Animated.View 
        style={[
          styles.container,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDot} />
          <Text style={styles.loadingText}>Przygotowuję pomocnika...</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }, { scale: pulseAnim }] }
      ]}
    >
      <TouchableOpacity 
        onPress={handleExpand}
        activeOpacity={0.8}
        style={styles.helperCard}
      >
        <LinearGradient
          colors={rarityGradients[philosopher.rarity]}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.philosopherInfo}>
              <View style={[styles.avatar, { borderColor: rarityColors[philosopher.rarity] }]}>
                <Text style={styles.avatarEmoji}>
                  {getPhilosopherEmoji(philosopher.school)}
                </Text>
              </View>
              
              <View style={styles.info}>
                <Text style={styles.helperLabel}>Twój pomocnik</Text>
                <Text style={styles.philosopherName}>{philosopher.name}</Text>
                <Text style={styles.schoolName}>{philosopher.school}</Text>
              </View>
            </View>
            
            <View style={styles.actions}>
              <View style={styles.bonusIndicator}>
                <MaterialCommunityIcons name="star" size={16} color="#FCD34D" />
                <Text style={styles.bonusText}>+20% XP</Text>
              </View>
              
              <Ionicons 
                name={expanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#94A3B8" 
              />
            </View>
          </View>

          {/* Expanded Content */}
          <Animated.View 
            style={[
              styles.expandedContent,
              {
                height: expandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 120],
                }),
                opacity: expandAnim,
              },
            ]}
          >
            <View style={styles.specialAbility}>
              <View style={styles.abilityHeader}>
                <Ionicons name="flash" size={16} color="#A78BFA" />
                <Text style={styles.abilityName}>{philosopher.specialAbility.name}</Text>
              </View>
              <Text style={styles.abilityDescription}>
                {philosopher.specialAbility.description}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.hintButton,
                hintUsed && styles.hintButtonDisabled,
              ]}
              onPress={handleHintRequest}
              disabled={hintUsed}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={hintUsed 
                  ? ['#4B5563', '#6B7280'] 
                  : ['#6366F1', '#8B5CF6']
                }
                style={styles.hintGradient}
              >
                <Ionicons 
                  name={hintUsed ? "checkmark" : "bulb"} 
                  size={16} 
                  color="#FFFFFF" 
                />
                <Text style={styles.hintButtonText}>
                  {hintUsed ? "Wskazówka użyta" : "Poproś o wskazówkę"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Quick Access Hint (po ukryciu) */}
          {!expanded && (
            <TouchableOpacity
              style={styles.quickHintButton}
              onPress={handleHintRequest}
              disabled={hintUsed}
            >
              <Ionicons 
                name="bulb-outline" 
                size={16} 
                color={hintUsed ? "#6B7280" : "#6366F1"} 
              />
              <Text style={[
                styles.quickHintText,
                hintUsed && styles.quickHintTextDisabled,
              ]}>
                Wskazówka
              </Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Cytat Latajacy */}
      {expanded && philosopher.quotes.length > 0 && (
        <Animated.View 
          style={[
            styles.wisdomBubble,
            {
              opacity: expandAnim,
              transform: [
                {
                  translateY: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.wisdomText}>
            "{philosopher.quotes[0]}"
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
    marginRight: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  helperCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  philosopherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  helperLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  philosopherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  schoolName: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  actions: {
    alignItems: 'flex-end',
  },
  bonusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(252, 211, 77, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  bonusText: {
    fontSize: 12,
    color: '#FCD34D',
    marginLeft: 4,
    fontWeight: '500',
  },
  expandedContent: {
    overflow: 'hidden',
    marginTop: 16,
  },
  specialAbility: {
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  abilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  abilityName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A78BFA',
    marginLeft: 6,
  },
  abilityDescription: {
    fontSize: 12,
    color: '#E0E7FF',
    lineHeight: 16,
  },
  hintButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  hintButtonDisabled: {
    opacity: 0.6,
  },
  hintGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  hintButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  quickHintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 6,
  },
  quickHintText: {
    fontSize: 12,
    color: '#6366F1',
    marginLeft: 4,
    fontWeight: '500',
  },
  quickHintTextDisabled: {
    color: '#6B7280',
  },
  wisdomBubble: {
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#A78BFA',
  },
  wisdomText: {
    fontSize: 13,
    color: '#E0E7FF',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});