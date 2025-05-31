import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthState } from '@/hooks/useAuthState';
import { RootStackParamList, MainTabParamList } from './types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AuthScreen from '@/screens/auth/AuthScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import HomeScreen from '@/screens/main/HomeScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';
import PhilosopherDetailScreen from '@/screens/philosophers/PhilosopherDetailScreen';
import QuizScreen from '@/screens/philosophers/QuizScreen';
import GachaScreen from '@/screens/gacha/GachaScreen';
import GachaAnimationScreen from '@/screens/gacha/GachaAnimationScreen';
import LearnNavigator from './LearnNavigator';
import CollectionNavigator from './CollectionNavigator';
import DevMenu from '@/screens/DevMenu';
import LoadingScreen from '@/screens/auth/LoadingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366f1', 
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor: '#1f2937',
          paddingBottom: 4,
          height: 60,
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Nauka" 
        component={LearnNavigator}
        options={{
          tabBarLabel: 'Nauka',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Wyrocznia" 
        component={GachaScreen}
        options={{
          tabBarLabel: 'Wyrocznia',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dice-multiple-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Gimnazjon" 
        component={CollectionNavigator}
        options={{
          tabBarLabel: 'Gimnazjon',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profil" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => (
             <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
      
      {__DEV__ && ( //Tylko dev
      <Tab.Screen 
  name="DevMenu" 
  component={DevMenu}
  options={{
    tabBarLabel: 'Dev',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="construct-outline" color={color} size={size} />
    ),
  }}
/>
)}
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  const { user, loading } = useAuthState();

  if (loading) {
    // Splash screen
    return <LoadingScreen />;
  }
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {!user ? (
          // Auth Flow
          <Stack.Group>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </Stack.Group>
        ) : (
          // Main App Flow
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            
            {/* Modale*/}
            <Stack.Group 
              screenOptions={{ 
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            >
              <Stack.Screen 
                name="PhilosopherDetail" 
                component={PhilosopherDetailScreen}
                options={{
                  headerShown: true,
                  headerTitle: '',
                  headerTransparent: true,
                }}
              />
              <Stack.Screen 
                name="QuizScreen" 
                component={QuizScreen}
                options={{
                  headerShown: true,
                  headerTitle: 'Wyzwanie',
                  headerBackTitle: 'Wyjście',
                }}
              />
              <Stack.Screen 
                name="GachaAnimation" 
                component={GachaAnimationScreen}
                options={{
                  presentation: 'fullScreenModal',
                  animation: 'fade',
                }}
              />
            </Stack.Group>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}