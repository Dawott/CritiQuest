import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export function OfflineIndicator({ queueCount, onProcessQueue }) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!(state.isConnected && state.isInternetReachable));
    });
    return unsubscribe;
  }, []);

  if (!isOffline && queueCount === 0) return null;

  return (
    <View style={{ backgroundColor: '#F59E0B', padding: 8, flexDirection: 'row' }}>
      <Text style={{ color: 'white', flex: 1 }}>
        {isOffline ? 'Tryb Offline' : `${queueCount} quizów w trakcie`}
      </Text>
      {!isOffline && queueCount > 0 && (
        <TouchableOpacity onPress={onProcessQueue}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Wyślij teraz</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}