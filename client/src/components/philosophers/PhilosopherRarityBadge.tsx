import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Rarity } from 'shared/types/database.types';

interface PhilosopherRarityBadgeProps {
  rarity: Rarity;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const PhilosopherRarityBadge: React.FC<PhilosopherRarityBadgeProps> = ({ 
  rarity, 
  size = 'medium',
  showText = true 
}) => {
  const rarityConfig = getRarityConfig(rarity);
  const sizeConfig = getSizeConfig(size);

  return (
    <LinearGradient
      colors={rarityConfig.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, sizeConfig.container]}
    >
      <View style={styles.content}>
        <Text style={[styles.stars, sizeConfig.stars]}>
          {rarityConfig.stars}
        </Text>
        {showText && (
          <Text style={[styles.text, sizeConfig.text, { color: rarityConfig.textColor }]}>
            {rarityConfig.label}
          </Text>
        )}
      </View>
    </LinearGradient>
  );
};

// Rarity configurations
const getRarityConfig = (rarity: Rarity) => {
  switch (rarity) {
    case 'common':
      return {
        gradient: ['#6B7280', '#9CA3AF'],
        textColor: '#FFFFFF',
        label: 'Common',
        stars: '⭐',
      };
    case 'rare':
      return {
        gradient: ['#3B82F6', '#60A5FA'],
        textColor: '#FFFFFF',
        label: 'Rare',
        stars: '⭐⭐',
      };
    case 'epic':
      return {
        gradient: ['#8B5CF6', '#A78BFA'],
        textColor: '#FFFFFF',
        label: 'Epic',
        stars: '⭐⭐⭐',
      };
    case 'legendary':
      return {
        gradient: ['#F59E0B', '#FCD34D'],
        textColor: '#92400E',
        label: 'Legendary',
        stars: '⭐⭐⭐⭐',
      };
    default:
      return {
        gradient: ['#6B7280', '#9CA3AF'],
        textColor: '#FFFFFF',
        label: 'Unknown',
        stars: '⭐',
      };
  }
};

// Size configurations
const getSizeConfig = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return {
        container: { paddingHorizontal: 6, paddingVertical: 2 },
        text: { fontSize: 10 },
        stars: { fontSize: 8 },
      };
    case 'large':
      return {
        container: { paddingHorizontal: 12, paddingVertical: 6 },
        text: { fontSize: 14 },
        stars: { fontSize: 12 },
      };
    default: // medium
      return {
        container: { paddingHorizontal: 8, paddingVertical: 3 },
        text: { fontSize: 12 },
        stars: { fontSize: 10 },
      };
  }
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  text: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stars: {
    lineHeight: 12,
  },
});