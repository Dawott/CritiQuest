import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { DimensionValue } from 'react-native';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  width?: DimensionValue;
  showPercentage?: boolean;
  showIcon?: boolean;
  animated?: boolean;
  duration?: number;
  style?: ViewStyle;
  trackColor?: string;
  progressColors?: string[];
  textColor?: string;
  borderRadius?: number;
  philosophical?: boolean; // Specjalny theme zależnie od szkoły
  milestone?: number; // Efekt specjalny przy milestonie
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress = 0,
  height = 6,
  width = '100%',
  showPercentage = false,
  showIcon = false,
  animated = true,
  duration = 800,
  style,
  trackColor = '#374151',
  progressColors = ['#6366F1', '#8B5CF6'],
  textColor = '#F3F4F6',
  borderRadius,
  philosophical = false,
  milestone,
}) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percentage = Math.round(clampedProgress * 100);
  const calculatedBorderRadius = borderRadius ?? height / 2;
  const trackStyle: ViewStyle = {
  height,
  width: width || '100%',
  backgroundColor: trackColor,
  borderRadius: calculatedBorderRadius,
};

  // Main progress animation
  useEffect(() => {
    if (animated) {
      Animated.timing(animatedProgress, {
        toValue: clampedProgress,
        duration,
        useNativeDriver: false,
      }).start();
    } else {
      animatedProgress.setValue(clampedProgress);
    }
  }, [clampedProgress, animated, duration]);

  // Milestone celebration effect
  useEffect(() => {
    if (milestone && clampedProgress >= milestone) {
      // Pulse effect
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow effect
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();

      // Sparkle effect for philosophical theme
      if (philosophical) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkleAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(sparkleAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 3 }
        ).start();
      }
    }
  }, [clampedProgress, milestone, philosophical]);

  // Get wisdom quote for philosophical theme
  const getWisdomQuote = (progress: number): string => {
    if (progress >= 1) return "Wiedza przez poświęcenie";
    if (progress >= 0.8) return "Doskonałość jest przyzwyczajeniem - Arystoteles";
    if (progress >= 0.6) return "Wiedza wywodzi się z doświadczenia";
    if (progress >= 0.4) return "Nauka nie wyczerpuje umysłu";
    if (progress >= 0.2) return "Droga zrozumienia trwa";
    return "Każdy mędrzec był kiedyś nowicjuszem";
  };

  const renderPhilosophicalElements = () => {
    if (!philosophical) return null;

    return (
      <>
        {/* Floating wisdom particles */}
        <Animated.View
          style={[
            styles.sparkle,
            {
              opacity: sparkleAnim,
              transform: [
                {
                  translateX: sparkleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 20],
                  }),
                },
                {
                  scale: sparkleAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.sparkleText}>✨</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.sparkle,
            styles.sparkle2,
            {
              opacity: sparkleAnim,
              transform: [
                {
                  translateX: sparkleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -15],
                  }),
                },
                {
                  scale: sparkleAnim.interpolate({
                    inputRange: [0, 0.3, 0.7, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.sparkleText}>🧠</Text>
        </Animated.View>
      </>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Wisdom quote for philosophical theme */}
      {philosophical && clampedProgress > 0 && (
        <Text style={[styles.wisdomText, { color: textColor }]}>
          {getWisdomQuote(clampedProgress)}
        </Text>
      )}

      {/* Progress bar container */}
      <Animated.View
        style={[
          styles.progressContainer,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: glowAnim,
              height: height + 4,
              borderRadius: calculatedBorderRadius + 2,
            },
          ]}
        />

        {/* Track */}
        <View
          style={[
            styles.track, trackStyle
          ]}
        >
          {/* Progress fill */}
          <Animated.View
            style={[
              styles.progressWrapper,
              {
                width: animatedProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
                height,
                borderRadius: calculatedBorderRadius,
              },
            ]}
          >
            <LinearGradient
              colors={progressColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                {
                  borderRadius: calculatedBorderRadius,
                },
              ]}
            />

            {/* Animated shimmer effect */}
            <Animated.View
              style={[
                styles.shimmer,
                {
                  borderRadius: calculatedBorderRadius,
                  opacity: animatedProgress.interpolate({
                    inputRange: [0, 0.1, 1],
                    outputRange: [0, 0.3, 0.6],
                  }),
                },
              ]}
            />
          </Animated.View>

          {/* Milestone markers */}
          {milestone && (
            <View
              style={[
                styles.milestoneMarker,
                {
                  left: `${milestone * 100}%`,
                  height: height + 4,
                  borderRadius: calculatedBorderRadius,
                },
              ]}
            />
          )}
        </View>

        {/* Philosophical elements */}
        {renderPhilosophicalElements()}
      </Animated.View>

      {/* Percentage and icon */}
      {(showPercentage || showIcon) && (
        <View style={styles.infoContainer}>
          {showIcon && clampedProgress > 0 && (
            <Ionicons
              name={
                philosophical
                  ? clampedProgress >= 1
                    ? "library"
                    : "bulb"
                  : clampedProgress >= 1
                  ? "checkmark-circle"
                  : "trending-up"
              }
              size={16}
              color={clampedProgress >= 1 ? "#10B981" : "#6366F1"}
              style={styles.icon}
            />
          )}
          {showPercentage && (
            <Text style={[styles.percentageText, { color: textColor }]}>
              {percentage}%
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

// Specialized variants for common use cases
export const LessonProgressBar: React.FC<Omit<ProgressBarProps, 'philosophical'>> = (props) => (
  <ProgressBar {...props} philosophical={true} showIcon={true} />
);

export const SimpleProgressBar: React.FC<Omit<ProgressBarProps, 'showPercentage' | 'showIcon'>> = (props) => (
  <ProgressBar {...props} showPercentage={false} showIcon={false} />
);

export const DetailedProgressBar: React.FC<Omit<ProgressBarProps, 'showPercentage' | 'showIcon'>> = (props) => (
  <ProgressBar {...props} showPercentage={true} showIcon={true} />
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  wisdomText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.8,
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
    width: '102%',
    backgroundColor: '#6366F1',
    opacity: 0,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  track: {
    overflow: 'hidden',
    position: 'relative',
  },
  progressWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
  progressFill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  milestoneMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    backgroundColor: '#F59E0B',
    zIndex: 2,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  sparkle: {
    position: 'absolute',
    top: -10,
    left: '20%',
    zIndex: 3,
  },
  sparkle2: {
    left: '70%',
    top: -12,
  },
  sparkleText: {
    fontSize: 12,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  icon: {
    marginRight: 4,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProgressBar;