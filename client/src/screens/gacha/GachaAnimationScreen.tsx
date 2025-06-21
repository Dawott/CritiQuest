import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GachaPullResult } from 'client/src/components/gacha/GachaPullResult';

export default function GachaAnimationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { pullResults } = route.params as { pullResults: any[] };

  // Placeholder dla animacji
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Gacha Animation Screen</Text>
        <Text style={styles.subtitle}>Tutaj pojawi się odpowiednia animacja</Text>
        
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.skipText}>Powrót</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F3F4F6',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 32,
  },
  skipButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
  },
});