import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PhilosopherStats as PhilosopherStatsType } from '../../../../shared/types/database.types';

interface PhilosopherStatsProps {
  stats: PhilosopherStatsType;
  compact?: boolean;
}

export const PhilosopherStats: React.FC<PhilosopherStatsProps> = ({ stats, compact = false }) => {
  const statEntries = Object.entries(stats);
  
  if (compact) {
    // Compact view - show only top 3 stats
    const topStats = statEntries
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    
    return (
      <View style={styles.compactContainer}>
        {topStats.map(([key, value]) => (
          <View key={key} style={styles.compactStat}>
            <Text style={styles.compactStatName}>{getStatIcon(key)}</Text>
            <Text style={styles.compactStatValue}>{value}</Text>
          </View>
        ))}
      </View>
    );
  }

  // Full view
  return (
    <View style={styles.fullContainer}>
      {statEntries.map(([key, value]) => (
        <View key={key} style={styles.statRow}>
          <Text style={styles.statName}>{getStatDisplayName(key)}</Text>
          <View style={styles.statBarContainer}>
            <View style={styles.statBar}>
              <View 
                style={[styles.statBarFill, { width: `${value}%` }]}
              />
            </View>
            <Text style={styles.statValue}>{value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// Helper functions
const getStatIcon = (stat: string): string => {
  const icons: Record<string, string> = {
    logic: '🧠',
    wisdom: '📚',
    rhetoric: '🗣️',
    influence: '👑',
    originality: '💡',
    ethics: '⚖️',
    metaphysics: '🌌',
    epistemology: '🔍',
    aesthetics: '🎨',
    mind: '💭',
    language: '📝',
    science: '🔬',
    social: '👥'
  };
  return icons[stat] || '📊';
};

const getStatDisplayName = (stat: string): string => {
  const names: Record<string, string> = {
    logic: 'Logika',
    wisdom: 'Wiedza',
    rhetoric: 'Retoryka',
    influence: 'Wpływ',
    originality: 'Oryginalność',
    ethics: 'Etyka',
    metaphysics: 'Metafizyka',
    epistemology: 'Epistemologia',
    aesthetics: 'Estetyka',
    mind: 'Umysł',
    language: 'Język',
    science: 'Nauka',
    social: 'Społeczeństwo'
  };
  return names[stat] || stat.charAt(0).toUpperCase() + stat.slice(1);
};

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  compactStat: {
    alignItems: 'center',
  },
  compactStatName: {
    fontSize: 12,
  },
  compactStatValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FCD34D',
  },
  fullContainer: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statName: {
    fontSize: 14,
    color: '#E5E7EB',
    flex: 1,
  },
  statBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  statBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    marginRight: 8,
  },
  statBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  statValue: {
    fontSize: 12,
    color: '#F3F4F6',
    fontWeight: '600',
    width: 24,
    textAlign: 'right',
  },
});