import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { useToastStore } from '../../store/toastStore';
import { COLORS, SPACING, FONT_SIZES } from '../../lib/constants';

export default function ForgotPasswordScreen() {
  const navigation: any = useNavigation(); // navigation tipini any olarak belirtelim
  const { showToast } = useToastStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      showToast('E-posta adresi gerekli', 'warning');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      showToast('Geçerli bir e-posta adresi girin', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'enxh://reset-password',
      });

      if (error) throw error;

      setSent(true);
      showToast('Şifre sıfırlama linki e-postanıza gönderildi', 'success');
    } catch (error: any) {
      console.error('Reset password error:', error);
      showToast('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="lock-closed" size={60} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Şifremi Unuttum</Text>
          <Text style={styles.subtitle}>
            {sent
              ? 'E-postanızı kontrol edin'
              : 'E-posta adresinizi girin, size şifre sıfırlama linki gönderelim'}
          </Text>
        </View>

        {!sent ? (
          <View style={styles.form}>
            <Input
              label="E-posta"
              placeholder="ornek@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <Button
              title="Şifre Sıfırlama Linki Gönder"
              onPress={handleResetPassword}
              loading={loading}
              fullWidth
            />

            <TouchableOpacity
              style={styles.loginButton}
              // @ts-ignore
              // ✅ DÜZELTME 1: login -> Login
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginButtonText}>
                Şifrenizi hatırladınız mı?{' '}
                <Text style={styles.loginButtonTextBold}>Giriş Yapın</Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.successContainer}>
            <Ionicons name="mail" size={80} color={COLORS.success} />
            <Text style={styles.successText}>
              Şifre sıfırlama linki {email} adresine gönderildi.
            </Text>
            <Text style={styles.successSubtext}>
              E-postanızı kontrol edin ve linke tıklayarak şifrenizi sıfırlayın.
            </Text>
            <Button
              title="Giriş Sayfasına Dön"
              // @ts-ignore
              // ✅ DÜZELTME 2: login -> Login
              onPress={() => navigation.navigate('Login')}
              fullWidth
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ... styles kısmı değişmedi ...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flexGrow: 1,
    padding: SPACING.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
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
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  loginButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.lg,
  },
  loginButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  loginButtonTextBold: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  successContainer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  successText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  successSubtext: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
});
