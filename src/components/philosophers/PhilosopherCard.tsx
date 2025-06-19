import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Philosopher, Rarity } from '@/types/database.types';
import { PhilosopherRarityBadge } from './PhilosopherRarityBadge.tsx';
//import { PhilosopherStats } from '@/types/database.types';
import { PhilosopherStatsSchema } from '@/utils/schemas';
import { PhilosopherStats } from './PhilosopherStats';

interface PhilosopherCardProps {
    philosopher: Philosopher;
    onPress?: () => void;
    showStats?: boolean;
    isOwned?: boolean;
    level?: number;
}

const rarityGradients: Record<Rarity, string[]> = {
    common: ['#9CA3AF', '#6B7280'],
    rare: ['#60A5FA', '#3b82F6'],
    epic: ['#A78BFA', '#8B5CF6'],
  legendary: ['#FCD34D', '#F59E0B'],
};

export const PhilosopherCard: React.FC<PhilosopherCardProps> = ({
    philosopher,
    onPress,
    showStats = false,
    isOwned = true,
    level = 1,
}) => {
    return (
        <TouchableOpacity
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.8}>
            <LinearGradient
            colors={rarityGradients[philosopher.rarity]}
            style={styles.gradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}>
                <View style={styles.imageContainer}>
                    <Image
                    source={{uri: philosopher.imageUrl}}
                    style={[styles.image, !isOwned && styles.grayscale]}/>
                    {!isOwned && (
                        <View style={styles.lockOverlay}>
                            <Text style={styles.lockIcon}>🔒</Text>
                            </View>                           
                    )}
                </View>
                <PhilosopherRarityBadge rarity={philosopher.rarity} />

                    <View style={styles.info}>
                        <Text style={styles.name}>{philosopher.name}</Text>
                        <Text style={styles.era}>{philosopher.school}</Text>
                        {isOwned && <Text style={styles.level}>Lv. {level}</Text>}
                    </View>

                    {showStats && isOwned && (
                        <PhilosopherStats stats={philosopher.baseStats} compact />
                    )}
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
    width: 160,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  gradient: {
    padding: 12,
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  grayscale: {
    opacity: 0.3,
  },
  lockOverlay: {
    position: 'absolute',
    top: '40%',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 32,
  },
  info: {
    marginTop: 12,
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  era: {
    fontSize: 12,
    color: '#E5E7EB',
    marginTop: 2,
  },
  level: {
    fontSize: 14,
    color: '#FCD34D',
    fontWeight: '600',
    marginTop: 4,
  },
});