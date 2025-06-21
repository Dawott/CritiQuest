import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@/hooks/useNavigation';
import AuthService from '@/services/firebase/auth.service';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email jest wymagany';
    } else if (!AuthService.validateEmail(email)) {
      newErrors.email = 'Nieprawidłowy format email';
    }
    
    if (!password) {
      newErrors.password = 'Hasło jest wymagane';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setErrors({});
    
    try {
      await AuthService.login({ email, password });
      // Zmiana stanu uwierzytelnienia
    } catch (error: any) {
      Alert.alert(
        'Błąd logowania',
        error.message || 'Nie udało się zalogować. Spróbuj ponownie.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        'Resetowanie hasła',
        'Wprowadź adres email, aby zresetować hasło.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (!AuthService.validateEmail(email)) {
      Alert.alert(
        'Nieprawidłowy email',
        'Wprowadź prawidłowy adres email.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      await AuthService.resetPassword(email);
      Alert.alert(
        'Email wysłany',
        'Sprawdź swoją skrzynkę email, aby zresetować hasło.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Błąd',
        error.message || 'Nie udało się wysłać emaila.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <LinearGradient
      colors={['#111827', '#1F2937']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={28} color="#F3F4F6" />
              </TouchableOpacity>
              <View style={styles.titleContainer}>
                <Ionicons name="school" size={48} color="#6366F1" />
                <Text style={styles.title}>Witaj ponownie!</Text>
                <Text style={styles.subtitle}>
                  Zaloguj się, aby kontynuować naukę
                </Text>
              </View>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                  <Ionicons 
                    name="mail-outline" 
                    size={20} 
                    color={errors.email ? '#EF4444' : '#6B7280'} 
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="twoj@email.com"
                    placeholderTextColor="#6B7280"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Hasło</Text>
                <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={errors.password ? '#EF4444' : '#6B7280'} 
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#6B7280"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons 
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                      size={20} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>

              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotPassword}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>
                  Zapomniałeś hasła?
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.disabledButton]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={loading ? ['#4B5563', '#6B7280'] : ['#6366F1', '#8B5CF6']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Zaloguj się</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>LUB</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.registerLink}
                onPress={() => navigation.navigate('Register')}
                disabled={loading}
              >
                <Text style={styles.registerLinkText}>
                  Nie masz konta? <Text style={styles.registerLinkBold}>Zarejestruj się</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F3F4F6',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#F3F4F6',
    paddingVertical: 16,
    marginLeft: 12,
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#374151',
  },
  dividerText: {
    fontSize: 12,
    color: '#6B7280',
    marginHorizontal: 16,
  },
  registerLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  registerLinkText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  registerLinkBold: {
    color: '#6366F1',
    fontWeight: '600',
  },
});