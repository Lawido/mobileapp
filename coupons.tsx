import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';

// YOL AYARLAMASI: Dosyanın bulunduğu yere göre importları kontrol et
import { supabase } from '../../lib/supabase'; 
import { Header } from '../../components/Header';
import { COLORS, SPACING, FONT_SIZES, SHADOWS, BORDER_RADIUS } from '../../lib/constants';

interface Coupon {
  id: string;
  code: string;
  discount_amount: number;
  min_spend_amount: number; // Yeni alan
  description?: string;
  is_active: boolean;
}

export default function CouponsScreen() {
  const navigation = useNavigation();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true) 
        .order('discount_amount', { ascending: false }); // En yüksek indirim en üstte

      if (error) throw error;
      setCoupons(data || []);
    } catch (error: any) {
      console.error('Kupon hatası:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCoupon = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Başarılı', `"${code}" kupon kodu kopyalandı.`);
  };

  const renderCouponItem = ({ item }: { item: Coupon }) => (
    <View style={styles.couponWrapper}>
      <View style={styles.couponContainer}>
        {/* SOL TARAF: İndirim Bilgisi */}
        <View style={styles.leftSection}>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>₺</Text>
            <Text style={styles.amountText}>{item.discount_amount}</Text>
          </View>
          <Text style={styles.discountLabel}>İNDİRİM</Text>
          
          {/* Alt Limit Bilgisi */}
          <View style={styles.limitContainer}>
            <Ionicons name="information-circle-outline" size={12} color={COLORS.textLight} />
            <Text style={styles.limitText}>
              {item.min_spend_amount > 0 
                ? `${item.min_spend_amount} TL ve üzeri` 
                : 'Alt limit yok'}
            </Text>
          </View>
        </View>

        {/* ORTA: Kesik Çizgi */}
        <View style={styles.divider}>
          <View style={[styles.circleMask, styles.topMask]} />
          <View style={styles.dashedLine} />
          <View style={[styles.circleMask, styles.bottomMask]} />
        </View>

        {/* SAĞ TARAF: Kod ve Buton */}
        <View style={styles.rightSection}>
          <Text style={styles.descriptionText} numberOfLines={2}>
            {item.description || 'Sepette geçerli indirim.'}
          </Text>
          
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{item.code}</Text>
          </View>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => copyCoupon(item.code)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>KULLAN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Kuponlarım" showBack />
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.id}
          renderItem={renderCouponItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="ticket-outline" size={48} color={COLORS.textLight} />
              </View>
              <Text style={styles.emptyTitle}>Aktif Kupon Yok</Text>
              <Text style={styles.emptyText}>Şu an için tanımlanmış bir indirim kuponunuz bulunmuyor.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F5F5' // Biraz daha gri bir arka plan kuponları öne çıkarır
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  listContent: { 
    padding: SPACING.md,
    paddingBottom: 40
  },
  couponWrapper: {
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  couponContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 140,
    overflow: 'hidden',
  },
  
  // SOL TARAF
  leftSection: {
    flex: 1.2,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRightWidth: 0,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 4,
  },
  amountText: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  discountLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 2,
    marginBottom: 8,
  },
  limitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  limitText: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '600',
    marginLeft: 4,
  },

  // ORTA AYIRAÇ
  divider: {
    width: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  dashedLine: {
    width: 1,
    height: '80%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  circleMask: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F5F5F5', // Arka plan rengiyle aynı olmalı
    position: 'absolute',
    left: -10,
    zIndex: 10,
  },
  topMask: { top: -10 },
  bottomMask: { bottom: -10 },

  // SAĞ TARAF
  rightSection: {
    flex: 2,
    padding: SPACING.md,
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
  },
  descriptionText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  codeBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginVertical: 4,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 1,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // BOŞ DURUM
  emptyState: { 
    alignItems: 'center', 
    marginTop: 80, 
    paddingHorizontal: 40 
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    opacity: 0.5
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: { 
    fontSize: 14, 
    color: COLORS.textLight, 
    textAlign: 'center',
    lineHeight: 20,
  },
});