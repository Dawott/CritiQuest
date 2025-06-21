import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { height } = Dimensions.get('window');

export default function LoadingScreen() {
  return (
    <LinearGradient
      colors={['#111827', '#1F2937', '#374151']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Ionicons name="school" size={80} color="#6366F1" />
        </View>
        <Text style={styles.title}>CritiQuest</Text>
        <ActivityIndicator 
          size="large" 
          color="#6366F1" 
          style={styles.loader}
        />
        <Text style={styles.loadingText}>Ładowanie...</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#F3F4F6',
    marginBottom: 40,
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});