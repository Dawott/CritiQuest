import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verifyGachaSystem, migrateGachaData } from '../services/firebase/initializeGachaSystem';
import { getErrorMessage } from '../../../shared/utils/error.utils';

const GACHA_INIT_KEY = '@gacha_system_initialized';

export const useAppInitialization = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const isInitialized = await AsyncStorage.getItem(GACHA_INIT_KEY);
      
      if (!isInitialized) {
        console.log('First time setup - initializing gacha system...');
        const success = await migrateGachaData();
        
        if (success) {
          await AsyncStorage.setItem(GACHA_INIT_KEY, 'true');
          console.log('Gacha system initialized successfully');
        } else {
          throw new Error('Failed to initialize gacha system');
        }
      } else {
        // Verify system integrity
        const isValid = await verifyGachaSystem();
        if (!isValid) {
          console.log('Gacha system verification failed, reinitializing...');
          await migrateGachaData();
        }
      }
    } catch (error) {
      console.error('App initialization error:', error);
      setInitError(getErrorMessage(error));
      
      Alert.alert(
        'Błąd inicjalizacji',
        'Wystąpił problem z inicjalizacją systemu. Spróbuj ponownie.',
        [
          {
            text: 'Spróbuj ponownie',
            onPress: () => initializeApp(),
          },
        ]
      );
    } finally {
      setIsInitializing(false);
    }
  };

  return {
    isInitializing,
    initError,
    reinitialize: initializeApp,
  };
};
