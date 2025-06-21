import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Philosopher, Rarity } from 'shared/types/database.types';
import { PullResult } from 'server/src/services/gacha.service';

const { width, height } = Dimensions.get('window');

interface GachaPullAnimationProps {
  isVisible: boolean;
  pullResults: PullResult[];
  onComplete: () => void;
  onSkip?: () => void;
}

const rarityConfigs: Record<Rarity, {
  gradient: string[];
  glow: string;
  particleColor: string;
  backgroundGradient: string[];
  sparkleColors: string[];
}> = {
  common: {
    gradient: ['#9CA3AF', '#6B7280'],
    glow: 'rgba(156, 163, 175, 0.4)',
    particleColor: '#9CA3AF',
    backgroundGradient: ['#1F2937', '#111827'],
    sparkleColors: ['#9CA3AF', '#D1D5DB'],
  },
  rare: {
    gradient: ['#60A5FA', '#3B82F6'],
    glow: 'rgba(96, 165, 250, 0.6)',
    particleColor: '#60A5FA',
    backgroundGradient: ['#1E40AF', '#1E293B'],
    sparkleColors: ['#60A5FA', '#93C5FD'],
  },
  epic: {
    gradient: ['#A78BFA', '#8B5CF6'],
    glow: 'rgba(167, 139, 250, 0.7)',
    particleColor: '#A78BFA',
    backgroundGradient: ['#7C3AED', '#4C1D95'],
    sparkleColors: ['#A78BFA', '#C4B5FD'],
  },
  legendary: {
    gradient: ['#FCD34D', '#F59E0B'],
    glow: 'rgba(252, 211, 77, 0.8)',
    particleColor: '#FCD34D',
    backgroundGradient: ['#D97706', '#78350F'],
    sparkleColors: ['#FCD34D', '#FEF3C7'],
  },
};

const AnimationPhase = {
  SUMMONING: 'summoning',
  REVEALING: 'revealing', 
  RESULT: 'result',
  COMPLETED: 'completed'
} as const;

type AnimationPhase = typeof AnimationPhase[keyof typeof AnimationPhase];

export const GachaPullAnimation: React.FC<GachaPullAnimationProps> = ({
  isVisible,
  pullResults,
  onComplete,
  onSkip,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<AnimationPhase>(AnimationPhase.SUMMONING);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const cardFlipAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const orbPulseAnim = useRef(new Animated.Value(1)).current;

  const currentResult = pullResults[currentIndex];
  const rarityConfig = currentResult ? rarityConfigs[currentResult.philosopher.rarity] : rarityConfigs.common;

  useEffect(() => {
    if (isVisible && pullResults.length > 0) {
      startAnimation();
    }
  }, [isVisible, pullResults]);

  useEffect(() => {
    if (phase === AnimationPhase.SUMMONING) {
      // Orb pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(orbPulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(orbPulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();

      // Auto-progress after 3 seconds
      const timer = setTimeout(() => {
        setPhase(AnimationPhase.REVEALING);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === AnimationPhase.REVEALING) {
      // Shake effect for dramatic reveal
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setPhase(AnimationPhase.RESULT);
      });

      // Card flip animation
      Animated.timing(cardFlipAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

      // Glow animation
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      // Sparkle animation
      Animated.loop(
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [phase]);

  const startAnimation = () => {
    setCurrentIndex(0);
    setPhase(AnimationPhase.SUMMONING);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleNext = () => {
    if (currentIndex < pullResults.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setPhase(AnimationPhase.SUMMONING);
      
      // Reset animations
      cardFlipAnim.setValue(0);
      glowAnim.setValue(0);
      sparkleAnim.setValue(0);
      shakeAnim.setValue(0);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setPhase(AnimationPhase.COMPLETED);
      onComplete();
    });
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      handleComplete();
    }
  };

  const renderSummoningPhase = () => {
    const rotateInterpolation = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View style={styles.summoningContainer}>
        <Animated.View
          style={[
            styles.orbContainer,
            {
              transform: [
                { scale: orbPulseAnim },
                { rotate: rotateInterpolation },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={rarityConfig.gradient}
            style={styles.orb}
          >
            <View style={[styles.orbGlow, { backgroundColor: rarityConfig.glow }]} />
            <Ionicons name="sparkles" size={60} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
        
        <Text style={styles.summoningText}>Wzywanie filozofa...</Text>
        
        {/* Particle effects could be added here with Rive */}
      </View>
    );
  };

  const renderRevealingPhase = () => {
    const shakeInterpolation = shakeAnim.interpolate({
      inputRange: [-10, 10],
      outputRange: [-10, 10],
    });

    return (
      <Animated.View
        style={[
          styles.revealContainer,
          {
            transform: [{ translateX: shakeInterpolation }],
          },
        ]}
      >
        <LinearGradient
          colors={rarityConfig.backgroundGradient}
          style={styles.revealBackground}
        >
          <View style={[styles.energyBurst, { backgroundColor: rarityConfig.glow }]} />
          <Text style={styles.revealText}>Filozoficzne przezrenie!</Text>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderResultPhase = () => {
    const cardRotation = cardFlipAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['180deg', '0deg'],
    });

    const glowOpacity = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.8],
    });

    return (
      <View style={styles.resultContainer}>
        {/* Background glow effect */}
        <Animated.View
          style={[
            styles.backgroundGlow,
            {
              backgroundColor: rarityConfig.glow,
              opacity: glowOpacity,
            },
          ]}
        />

        {/* Sparkle particles */}
        <Animated.View
          style={[
            styles.sparkleContainer,
            {
              opacity: sparkleAnim,
              transform: [
                {
                  rotate: sparkleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          {[...Array(8)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.sparkle,
                {
                  backgroundColor: rarityConfig.sparkleColors[i % 2],
                  transform: [
                    { rotate: `${i * 45}deg` },
                    { translateX: 80 },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* Main result card */}
        <Animated.View
          style={[
            styles.resultCard,
            {
              transform: [{ rotateY: cardRotation }],
            },
          ]}
        >
          <LinearGradient
            colors={rarityConfig.gradient}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Rarity Badge */}
            <View style={styles.rarityBadge}>
              <Text style={styles.rarityText}>
                {currentResult.philosopher.rarity.toUpperCase()}
              </Text>
            </View>

            {/* Philosopher Info */}
            <View style={styles.philosopherInfo}>
              <Text style={styles.philosopherName}>
                {currentResult.philosopher.name}
              </Text>
              <Text style={styles.philosopherSchool}>
                {currentResult.philosopher.school}
              </Text>
              <Text style={styles.philosopherEra}>
                {currentResult.philosopher.era}
              </Text>
            </View>

            {/* Status Badges */}
            <View style={styles.statusContainer}>
              {currentResult.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newText}>NOWY!</Text>
                </View>
              )}
              {currentResult.isDuplicate && (
                <View style={styles.duplicateBadge}>
                  <Text style={styles.duplicateText}>
                    Duplikat +{currentResult.isDuplicate || 1}
                  </Text>
                </View>
              )}
            </View>

            {/* Continue Hint */}
            <TouchableOpacity
              style={styles.continueHint}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.continueText}>
                {currentIndex < pullResults.length - 1 
                  ? `Dotknij dla następnego (${currentIndex + 1}/${pullResults.length})`
                  : 'Dotknij aby zakończyć'
                }
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    );
  };

  if (!isVisible || pullResults.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      animationType="none"
      transparent={true}
      onRequestClose={handleSkip}
    >
      <Pressable style={styles.overlay} onPress={phase === AnimationPhase.RESULT ? handleNext : undefined}>
        <LinearGradient
          colors={rarityConfig.backgroundGradient}
          style={styles.container}
        >
          {/* Skip Button */}
          {onSkip && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Pomiń</Text>
            </TouchableOpacity>
          )}

          {/* Animation Content */}
          <Animated.View
            style={[
              styles.animationContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {phase === AnimationPhase.SUMMONING && renderSummoningPhase()}
            {phase === AnimationPhase.REVEALING && renderRevealingPhase()}
            {phase === AnimationPhase.RESULT && renderResultPhase()}
          </Animated.View>
        </LinearGradient>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 10,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Summoning Phase
  summoningContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  orb: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  orbGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.6,
  },
  summoningText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Revealing Phase
  revealContainer: {
    width: width * 0.9,
    height: height * 0.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealBackground: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  energyBurst: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.7,
  },
  revealText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Result Phase
  resultContainer: {
    width: width * 0.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundGlow: {
    position: 'absolute',
    width: width,
    height: height,
    borderRadius: width / 2,
  },
  sparkleContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resultCard: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rarityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rarityText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  philosopherInfo: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  philosopherName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  philosopherSchool: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  philosopherEra: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  newBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  newText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  duplicateBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  duplicateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  continueHint: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  continueText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
});