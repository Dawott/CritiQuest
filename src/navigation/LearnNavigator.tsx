import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LearnStackParamList } from './types';
import LearnHomeScreen from '@/screens/learn/LearnHomeScreen.tsx';
import LessonDetailScreen from '@/screens/learn/LessonDetailScreen.tsx';
import StageSelectScreen from '@/screens/learn/StageSelectScreen.tsx';
import ScenarioScreen from '@/screens/learn/ScenarioScreen';

const LearnStack = createNativeStackNavigator<LearnStackParamList>();

export default function LearnNavigator() {
  return (
    <LearnStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#111827',
        },
        headerTintColor: '#f3f4f6',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
        <LearnStack.Screen 
        name="LearnHome" 
        component={LearnHomeScreen}
        options={{ title: 'Ścieżka Wiedzy' }}
      />
      
      <LearnStack.Screen 
        name="StageSelect" 
        component={StageSelectScreen}
        options={({ route }) => ({ 
          title: route.params.stage 
        })}
      />
      <LearnStack.Screen 
        name="LessonDetail" 
        component={LessonDetailScreen}
        options={{ title: 'Lekcja' }}
      />
      <LearnStack.Screen 
        name="ScenarioScreen" 
        component={ScenarioScreen}
        options={{ 
          title: 'Scenariusz',
          presentation: 'card',
        }}
      />
    </LearnStack.Navigator>
  );
}