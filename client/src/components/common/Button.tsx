import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const isDisabled = disabled || loading;

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator color={variant === 'secondary' ? '#1F2937' : '#FFFFFF'} />;
    }
    
    return (
      <View style={styles.contentContainer}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={[
          styles.text,
          size === 'small' && styles.smallText,
          size === 'medium' && styles.mediumText,
          size === 'large' && styles.largeText,
          variant === 'outline' && styles.outlineText,
          variant === 'secondary' && styles.secondaryText,
          textStyle,
        ]}>
          {title}
        </Text>
      </View>
    );
  };

  if (variant === 'primary' && !isDisabled) {
    return (
      <TouchableOpacity
        style={[
          styles.button,
          isDisabled && styles.disabled,
          style,
        ]}
        onPress={onPress}
        activeOpacity={0.8}
        disabled={isDisabled}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={[
            styles.gradient,
            size === 'small' && styles.smallPadding,
            size === 'medium' && styles.mediumPadding,
            size === 'large' && styles.largePadding,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        style={[
          styles.button,
          styles.secondaryButton,
          size === 'small' && styles.smallPadding,
          size === 'medium' && styles.mediumPadding,
          size === 'large' && styles.largePadding,
          isDisabled && styles.disabled,
          style,
        ]}
        onPress={onPress}
        activeOpacity={0.8}
        disabled={isDisabled}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  // Outline variant
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles.outlineButton,
        size === 'small' && styles.smallPadding,
        size === 'medium' && styles.mediumPadding,
        size === 'large' && styles.largePadding,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isDisabled}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  secondaryButton: {
    backgroundColor: '#E5E7EB',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4B5563',
  },
  smallPadding: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mediumPadding: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  largePadding: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  disabled: {
    opacity: 0.6,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  outlineText: {
    color: '#D1D5DB',
  },
  secondaryText: {
    color: '#1F2937',
  },
});

export default Button;