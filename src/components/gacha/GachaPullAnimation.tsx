import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import { Philosopher, Rarity } from '@/types/database.types';
import { PullResult } from '@/services/gacha.service';

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
  animation: string;
}> = {
  common: {
    gradient: ['#9CA3AF', '#6B7280'],
    glow: 'rgba(156, 163, 175, 0.3)',
    particleColor: '#9CA3AF',
    animation: 'sparkle',
  },
  rare: {
    gradient: ['#60A5FA', '#3B82F6'],
    glow: 'rgba(96, 165, 250, 0.4)',
    particleColor: '#60A5FA',
    animation: 'shimmer',
  },
  epic: {
    gradient: ['#A78BFA', '#8B5CF6'],
    glow: 'rgba(167, 139, 250, 0.5)',
    particleColor: '#A78BFA',
    animation: 'burst',
  },
  legendary: {
    gradient: ['#FCD34D', '#F59E0B'],
    glow: 'rgba(252, 211, 77, 0.6)',
    particleColor: '#FCD34D',
    animation: 'explosion',
  },
};

export const GachaPullAnimation: React.FC<GachaPullAnimationProps> = ({
  isVisible,
  pullResults,
  onComplete,
  onSkip,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'pulling' | 'revealing' | 'result'>('pulling');
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const cardFlipAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const currentResult = pullResults[currentIndex];
  const rarityConfig = currentResult ? rarityConfigs[currentResult.philosopher.rarity] : rarityConfigs.common;

  useEffect(() => {
    if (isVisible && pullResults.length > 0) {
      startPullAnimation();
    }
  }, [isVisible]);

  const startPullAnimation = () => {
    setPhase('pulling');
    
    // Reset
    fadeAnim.setValue(0);
    scaleAnim.setValue(0);
    rotateAnim.setValue(0);
    glowAnim.setValue(0);
    cardFlipAnim.setValue(0);

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Pull
    Animated.sequence([
      // Spin up
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 360,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
      // Pause
      Animated.delay(500),
    ]).start(() => {
      startRevealAnimation();
    });
  };

  const startRevealAnimation = () => {
    setPhase('revealing');

    // Shake
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow 
    const glowIntensity = {
      common: 0.3,
      rare: 0.5,
      epic: 0.7,
      legendary: 1,
    }[currentResult.philosopher.rarity];

    Animated.timing(glowAnim, {
      toValue: glowIntensity,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      showResult();
    });
  };

  const showResult = () => {
    setPhase('result');

    // Card flip
    Animated.spring(cardFlipAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleNext = () => {
    if (currentIndex < pullResults.length - 1) {
      // Reset
      setCurrentIndex(currentIndex + 1);
      startPullAnimation();
    } else {
      onComplete();
    }
  };

  const interpolateRotation = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const cardScale = cardFlipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.2, 1],
  });

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onSkip}
    >
      <Animated.View 
        style={[
          styles.container,
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.backdrop} />

        {phase === 'pulling' && (
          <Animated.View
            style={[
              styles.pullContainer,
              {
                transform: [
                  { scale: scaleAnim },
                  { rotate: interpolateRotation },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.pullOrb}
            >
              <LottieView
                source={require('@/assets/animations/magic-orb.json')}
                autoPlay
                loop
                style={styles.orbAnimation}
              />
            </LinearGradient>
          </Animated.View>
        )}

        {phase === 'revealing' && (
          <Animated.View
            style={[
              styles.revealContainer,
              {
                opacity: glowAnim,
                transform: [
                  { translateX: shakeAnim },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.glowEffect,
                { backgroundColor: rarityConfig.glow },
              ]}
            />
            <LottieView
              source={require('@/assets/animations/sparkles.json')}
              autoPlay
              loop
              style={styles.sparkleAnimation}
              colorFilters={[{
                keypath: "**",
                color: rarityConfig.particleColor,
              }]}
            />
          </Animated.View>
        )}

        {phase === 'result' && currentResult && (
          <Animated.View
            style={[
              styles.resultContainer,
              {
                transform: [
                  { scale: cardScale },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.resultCard}
              onPress={handleNext}
              activeOpacity={0.9}
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
                        Duplikat +{currentResult.isDuplicate ? 1 : 0}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Continue Hint */}
                <View style={styles.continueHint}>
                  <Text style={styles.continueText}>
                    {currentIndex < pullResults.length - 1 
                      ? `Dotknij aby kontynuować (${currentIndex + 1}/${pullResults.length})`
                      : 'Dotknij aby zakończyć'
                    }
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Background Effects */}
            <LottieView
              source={require(`@/assets/animations/${rarityConfig.animation}.json`)}
              autoPlay
              loop={false}
              style={styles.backgroundEffect}
            />
          </Animated.View>
        )}

        {/* Skip Button */}
        {onSkip && phase === 'pulling' && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
          >
            <Text style={styles.skipText}>Pomiń</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  pullContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pullOrb: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  orbAnimation: {
    width: 200,
    height: 200,
  },
  revealContainer: {
    width: width * 0.8,
    height: height * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.5,
  },
  sparkleAnimation: {
    position: 'absolute',
    width: 400,
    height: 400,
  },
  resultContainer: {
    width: width * 0.85,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  backgroundEffect: {
    position: 'absolute',
    width: width,
    height: height,
    opacity: 0.6,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});