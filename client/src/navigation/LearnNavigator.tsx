import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LearnStackParamList } from './types';
import LearnHomeScreen from 'client/src/screens/learn/LearnHomeScreen';
import LessonDetailScreen from 'client/src/screens/learn/LessonDetailScreen';
import StageSelectScreen from 'client/src/screens/learn/StageSelectScreen';
import ScenarioScreen from 'client/src/screens/learn/ScenarioScreen';

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