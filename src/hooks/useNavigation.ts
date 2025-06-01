import { CompositeNavigationProp, useNavigation as useRNNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '@/navigation/types';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

/*export function useNavigation() {
  return useRNNavigation<NativeStackNavigationProp<RootStackParamList>>();
}*/

export function useTabNavigation() {
  return useRNNavigation<BottomTabNavigationProp<MainTabParamList>>();
}

// For stack navigation (modals, auth screens, etc.)
export function useStackNavigation() {
  return useRNNavigation<NativeStackNavigationProp<RootStackParamList>>();
}

// Combined navigation for tab screens that also need to open modals
export function useNavigation() {
  return useRNNavigation<
    CompositeNavigationProp<
      BottomTabNavigationProp<MainTabParamList>,
      NativeStackNavigationProp<RootStackParamList>
    >
  >();
}
