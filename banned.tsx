// app/banned.tsx

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button'; // Buton bileşeniniz
import { signOutUser } from '../lib/supabase'; // Çıkış fonksiyonu
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../lib/constants';

const { width } = Dimensions.get('window');

export default function BannedScreen() {
  
  const handleLogout = async () => {
    try {
      await signOutUser();
      // Çıkış yapınca RootLayout otomatik olarak Login ekranına atacak
    } catch (error) {
      console.error("Çıkış hatası", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* İKON */}
        <View style={styles.iconContainer}>
          <Ionicons name="ban" size={80} color={COLORS.error} />
        </View>
        
        {/* BAŞLIK */}
        <Text style={styles.title}>Erişim Engellendi</Text>
        
        {/* AÇIKLAMA */}
        <Text style={styles.description}>
          Hesabınız, kullanım koşullarını ihlal ettiği gerekçesiyle yönetici tarafından askıya alınmıştır.
        </Text>

        <Text style={styles.subDescription}>
          Bu bir hata olduğunu düşünüyorsanız, lütfen destek ekibiyle iletişime geçin.
        </Text>

        {/* İLETİŞİM KUTUSU */}
        <View style={styles.infoBox}>
          <Ionicons name="mail-outline" size={24} color={COLORS.text} />
          <Text style={styles.contactText}>destek@enxhjewelry.com</Text>
        </View>

        {/* ÇIKIŞ BUTONU */}
        <Button 
          title="Çıkış Yap" 
          onPress={handleLogout}
          variant="outline"
          style={styles.button}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: width * 0.9,
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.md, // Hafif gölge ekleyelim
  },
  iconContainer: {
    marginBottom: SPACING.lg,
    backgroundColor: '#FEE2E2', // Açık kırmızı arka plan
    padding: 25,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontWeight: '600',
    lineHeight: 22,
  },
  subDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: 12,
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '700',
  },
  button: {
    borderColor: COLORS.error,
    borderWidth: 1.5,
  },
});