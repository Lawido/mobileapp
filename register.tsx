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
import { signUp } from '../../lib/supabase';

import { COLORS, SPACING, FONT_SIZES } from '../../lib/constants';

export default function RegisterScreen() {
  const navigation: any = useNavigation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const validateForm = () => {
    const newErrors = {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    };

    let isValid = true;

    if (!fullName) {
      newErrors.fullName = 'Ad Soyad gerekli';
      isValid = false;
    }

    if (!email) {
      newErrors.email = 'E-posta gerekli';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Geçersiz e-posta';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Şifre gerekli';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalı';
      isValid = false;
    }

    if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // DOĞRU KULLANIM
      await signUp(
        email.trim(),
        password.trim(),
        fullName.trim()
      );

      Alert.alert(
        'Kayıt Başarılı',
        'Artık giriş yapabilirsiniz.',
        // ✅ DÜZELTME 1: login -> Login
        [{ text: 'Tamam', onPress: () => navigation.navigate('Login') }] 
      );
    } catch (error: any) {
      Alert.alert('Kayıt Başarısız', error.message || 'Bir hata oluştu');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.title}>Hesap Oluştur</Text>
          <Text style={styles.subtitle}>Yeni hesap oluşturun</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Ad Soyad"
            placeholder="Adınız Soyadınız"
            value={fullName}
            onChangeText={setFullName}
            error={errors.fullName}
          />

          <Input
            label="E-posta"
            placeholder="example@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label="Şifre"
            placeholder="••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />

          <Input
            label="Şifre Tekrar"
            placeholder="••••••"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
          />

          <Button
            title="Kayıt Ol"
            loading={loading}
            onPress={handleRegister}
            fullWidth
          />

          <TouchableOpacity
            style={styles.loginButton}
            // ✅ DÜZELTME 2: login -> Login
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>
              Zaten hesabınız var mı?{' '}
              <Text style={styles.loginButtonTextBold}>Giriş Yapın</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ... styles kısmı değişmedi ...

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight
  },
  form: { width: '100%' },
  loginButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.lg
  },
  loginButtonText: { fontSize: FONT_SIZES.md, color: COLORS.textLight },
  loginButtonTextBold: { color: COLORS.primary, fontWeight: '700' },
});
