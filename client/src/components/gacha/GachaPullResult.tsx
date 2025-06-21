import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Philosopher, Rarity } from '../../../../shared/types/database.types';

interface GachaPullResultProps {
  philosopher: Philosopher;
  isNew: boolean;
  isDuplicate: boolean;
  onComplete?: () => void;
}

const { width } = Dimensions.get('window');

const rarityConfigs: Record<Rarity, {
  gradient: string[];
  glow: string;
  particleColor: string;
}> = {
  common: {
    gradient: ['#9CA3AF', '#6B7280'],
    glow: 'rgba(156, 163, 175, 0.3)',
    particleColor: '#9CA3AF',
  },
  rare: {
    gradient: ['#60A5FA', '#3B82F6'],
    glow: 'rgba(96, 165, 250, 0.4)',
    particleColor: '#60A5FA',
  },
  epic: {
    gradient: ['#A78BFA', '#8B5CF6'],
    glow: 'rgba(167, 139, 250, 0.5)',
    particleColor: '#A78BFA',
  },
  legendary: {
    gradient: ['#FCD34D', '#F59E0B'],
    glow: 'rgba(252, 211, 77, 0.6)',
    particleColor: '#FCD34D',
  },
};

export const GachaPullResult: React.FC<GachaPullResultProps> = ({
  philosopher,
  isNew,
  isDuplicate,
  onComplete,
}) => {
  const config = rarityConfigs[philosopher.rarity];

  return (
   <View style={styles.container}>
      <LinearGradient
        colors={config.gradient}
        style={[
          styles.cardGradient,
          { shadowColor: config.glow },
        ]}
       start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        >

        {/* Rarity Badge */}
        <View style={styles.rarityBadge}>
          <Text style={styles.rarityText}>
            {philosopher.rarity.toUpperCase()}
          </Text>
        </View>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: philosopher.imageUrl }}
            style={styles.philosopherImage}
          ></Image>
          </View>
          {/* Glow Effect */}
          <View 
            style={[
              styles.glowEffect,
              { backgroundColor: config.glow }
            ]}>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.philosopherName}>{philosopher.name}</Text>
          <Text style={styles.philosopherSchool}>{philosopher.school}</Text>
          <Text style={styles.philosopherEra}>{philosopher.era}</Text>
        </View>

        {/* Status Badge */}
        {isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newText}>NOWY FILOZOF!</Text>
          </View>
        )}
        
        {isDuplicate && (
          <View style={styles.duplicateBadge}>
            <Text style={styles.duplicateText}>+1 DUPLIKAT</Text>
            <Text style={styles.duplicateBonus}>+50 XP dla filozofa</Text>
          </View>
        )}

        {/* Special Ability */}
        <View style={styles.abilityContainer}>
          <Text style={styles.abilityTitle}>Zdolność Specjalna:</Text>
          <Text style={styles.abilityName}>{philosopher.specialAbility.name}</Text>
          <Text style={styles.abilityDescription}>
            {philosopher.specialAbility.description}
          </Text>
        </View>

        {/* Cytat */}
        {philosopher.quotes.length > 0 && (
          <View style={styles.quoteContainer}>
            <Text style={styles.quote}>"{philosopher.quotes[0]}"</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  cardGradient: {
    width: width - 40,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  rarityBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rarityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  philosopherImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  glowEffect: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 110,
    opacity: 0.6,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  philosopherName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  philosopherSchool: {
    fontSize: 18,
    color: '#F3F4F6',
    marginBottom: 4,
  },
  philosopherEra: {
    fontSize: 16,
    color: '#E5E7EB',
    opacity: 0.9,
  },
  newBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
  },
  newText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  duplicateBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  duplicateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  duplicateBonus: {
    fontSize: 12,
    color: '#FEF3C7',
    marginTop: 2,
  },
  abilityContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  abilityTitle: {
    fontSize: 12,
    color: '#D1D5DB',
    marginBottom: 4,
  },
  abilityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  abilityDescription: {
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 20,
  },
  quoteContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  quote: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 20,
  },
});