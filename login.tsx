// app/(auth)/login.tsx

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { signIn } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

import {
  COLORS,
  SPACING,
  FONT_SIZES,
} from '../../lib/constants';

export default function LoginScreen() {
  const navigation: any = useNavigation();
  const { setUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  // --------------------------
  // FORM VALIDATION
  // --------------------------

  const validateForm = () => {
    const newErrors = { email: '', password: '' };
    let isValid = true;

    if (!email) {
      newErrors.email = 'E-posta gerekli';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Geçerli bir e-posta girin';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Şifre gerekli';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalı';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // --------------------------
  // LOGIN ACTION
  // --------------------------

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const { user } = await signIn(email, password);

      if (user) {
        // Kullanıcıyı global auth store'a kaydet
        setUser({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name,
          role: user.user_metadata?.role || 'customer',
          created_at: user.created_at,
        });

        // ✅ DÜZELTME 1: main -> Main (Ana sayfa/Tab Navigator)
        navigation.navigate('Main'); 
      }
    } catch (error: any) {
      console.log(error);
      Alert.alert(
        'Giriş Başarısız',
        error.message || 'E-posta veya şifre hatalı'
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------
  // UI RENDER
  // --------------------------

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="diamond" size={60} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Hoş Geldiniz</Text>
          <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="E-posta"
            placeholder="ornek@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label="Şifre"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />

          <TouchableOpacity
            style={styles.forgotPassword}
            // ✅ DÜZELTME 2: forgot-password -> ForgotPassword
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
          </TouchableOpacity>

          <Button
            title="Giriş Yap"
            onPress={handleLogin}
            loading={loading}
            fullWidth
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>veya</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            // ✅ DÜZELTME 3: register -> Register
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerText}>
              Hesabınız yok mu?{' '}
              <Text style={styles.registerBold}>Kayıt Olun</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --------------------------
// STYLES
// --------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginVertical: SPACING.sm,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: SPACING.sm,
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
  },
  registerText: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: FONT_SIZES.md,
  },
  registerBold: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});