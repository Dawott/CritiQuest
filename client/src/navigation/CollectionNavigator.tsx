import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CollectionStackParamList } from './types';
import CollectionHomeScreen from '../../../client/src/screens/collection/CollectionHomeScreen';
//import PhilosopherListScreen from '@/screens/collection/PhilosopherListScreen';
import TeamBuilderScreen from '../../../client/src/screens/collection/TeamBuilderScreen';

const CollectionStack = createNativeStackNavigator<CollectionStackParamList>();

export default function CollectionNavigator() {
  return (
    <CollectionStack.Navigator
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
      <CollectionStack.Screen 
        name="CollectionHome" 
        component={CollectionHomeScreen}
        options={{ title: 'Mój Gimnazjon' }}
      />
      {/*<CollectionStack.Screen 
        name="PhilosopherList" 
        component={PhilosopherListScreen}
        options={({ route }) => ({ 
          title: route.params?.filter === 'owned' ? 'Mój Gimnazjon' : 'Filozofowie'
        })}
      />*/}
      <CollectionStack.Screen 
        name="TeamBuilder" 
       component={TeamBuilderScreen}
        options={{ 
          title: 'Zbuduj Szkołę',
          presentation: 'modal',
        }}
      />
    </CollectionStack.Navigator>
  );
}