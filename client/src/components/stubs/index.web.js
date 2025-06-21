// Web stubs for React Native components
import React from 'react';
import { View, Text } from 'react-native';

// Lottie stub
export const LottieView = ({ style, ...props }) => (
  <View style={[{ backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }, style]}>
    <Text>Animation Placeholder</Text>
  </View>
);

// Linear Gradient stub
export const LinearGradient = ({ children, style, ...props }) => (
  <View style={[{ backgroundColor: '#e0e0e0' }, style]}>
    {children}
  </View>
);

// Vector Icons stub
export const Icon = ({ name, size = 24, color = '#000', style, ...props }) => (
  <Text style={[{ fontSize: size, color }, style]}>
    {name || '□'}
  </Text>
);

// Gesture Handler stubs
export const GestureHandlerRootView = ({ children, ...props }) => (
  <View {...props}>{children}</View>
);

export const PanGestureHandler = ({ children, ...props }) => (
  <View {...props}>{children}</View>
);

export const TapGestureHandler = ({ children, ...props }) => (
  <View {...props}>{children}</View>
);

// Reanimated stubs
export const Animated = {
  View: View,
  Text: Text,
  ScrollView: View,
  createAnimatedComponent: (Component) => Component,
};

export default {
  LottieView,
  LinearGradient,
  Icon,
  GestureHandlerRootView,
  PanGestureHandler,
  TapGestureHandler,
  Animated,
};