// app/admin/dashboard.js

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  Dimensions,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';

import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
// ✅ YOL DÜZELTİLDİ
import { getAdminStats, getLowStockProducts, signOutUser } from '../../lib/supabase';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../lib/constants';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 3) / 2;

export default function AdminDashboard() {
  const navigation = useNavigation();

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    totalRevenue: 0,
  });

  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statsData, lowStockData] = await Promise.all([
        getAdminStats(),
        getLowStockProducts(),
      ]);
      setStats(statsData);
      setLowStock(lowStockData);
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Hata', 'Yönetici verileri yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
        loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const navigateTo = useCallback((screen: string) => {
    try {
      // @ts-ignore
      navigation.navigate(screen); 
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert("Navigasyon Hatası", `${screen} ekranı bulunamadı. Lütfen RootLayout dosyasındaki Admin Stack'i kontrol edin.`);
    }
  }, [navigation]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Oturumu Kapat',
      'Admin panel oturumunuzu kapatmak istediğinize emin misiniz? Ana sayfaya yönlendirileceksiniz.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutUser(); 
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 16, color: COLORS.textLight }}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable 
          onPress={handleLogout} 
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
        </Pressable>

        <Text style={styles.headerTitle}>Yönetici Paneli</Text>

        <View style={{ width: 40 }} />
      </View>

      {/* BODY */}
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >

        {/* STATS GRID */}
        <View style={styles.statsGrid}>
          {/* Siparişler */}
          <Pressable onPress={() => navigateTo('AdminOrders')} style={[styles.statCard, { backgroundColor: '#34D399' }]}>
            <Ionicons name="cart" size={28} color="#FFF" />
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>Toplam Sipariş</Text>
          </Pressable>

          {/* Gelir (Düzeltildi) */}
          <View style={[styles.statCard, { backgroundColor: '#FBBF24' }]}>
            <Ionicons name="cash" size={28} color="#FFF" />
            <Text style={styles.statValue}>₺{stats.totalRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</Text>
            <Text style={styles.statLabel}>Toplam Gelir</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
           {/* Ürünler */}
          <Pressable onPress={() => navigateTo('AdminProducts')} style={[styles.statCard, { backgroundColor: '#60A5FA' }]}>
            <Ionicons name="cube" size={28} color="#FFF" />
            <Text style={styles.statValue}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Aktif Ürün Sayısı</Text>
          </Pressable>

          {/* Kullanıcılar */}
          <Pressable onPress={() => navigateTo('AdminUsers')} style={[styles.statCard, { backgroundColor: '#F87171' }]}>
            <Ionicons name="people" size={28} color="#FFF" />
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Kayıtlı Kullanıcı</Text>
          </Pressable>
        </View>


        <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Hızlı İşlemler</Text>

        {/* HIZLI İŞLEMLER */}
        <View style={styles.actionsGrid}>
          
          {[
            { icon: "receipt-outline", label: "Siparişler", screen: "AdminOrders" },
            { icon: "cube-outline", label: "Ürünler", screen: "AdminProducts" },
            { icon: "grid-outline", label: "Kategoriler", screen: "AdminCategories" },
            { icon: "people-outline", label: "Kullanıcılar", screen: "AdminUsers" },
            { icon: "settings-outline", label: "Ayarlar", screen: "AdminSettings" },
          ].map((action, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.8 }, { width: CARD_WIDTH }]} 
              onPress={() => navigateTo(action.screen)}
            >
              <Ionicons name={action.icon as any} size={36} color={COLORS.primary} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {lowStock.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🔴 Düşük Stok Uyarısı</Text>

            <View style={styles.lowStockContainer}>
              {lowStock.slice(0, 5).map((product: any) => (
                <Pressable 
                  key={product.id}
                  style={({ pressed }) => [
                    styles.lowStockItem,
                    pressed && { backgroundColor: COLORS.backgroundSecondary }
                  ]}
                  onPress={() => navigateTo("AdminProducts")}
                >
                  <Text style={styles.lowStockName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <View style={styles.lowStockBadge}>
                    <Text style={styles.lowStockValue}>Stok: {product.stock}</Text>
                  </View>
                </Pressable>
              ))}
              <Pressable onPress={() => navigateTo("AdminProducts")} style={styles.viewAllLowStock}>
                 <Text style={styles.viewAllText}>Tümünü Gör ({lowStock.length})</Text>
                 <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </Pressable>
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'android' ? 10 : 0, 
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
  },
  backButton: {
    padding: 8,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  // STATS STYLES
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'space-between',
    minHeight: 120,
    ...SHADOWS.md,
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: '#FFF',
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: '#FFF',
    marginTop: SPACING.xs,
    opacity: 0.9,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  // ACTIONS STYLES
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  actionCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    ...SHADOWS.sm,
  },
  actionLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  // LOW STOCK STYLES
  lowStockContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
    marginBottom: SPACING.lg,
  },
  lowStockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '50',
  },
  lowStockName: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  lowStockBadge: {
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  lowStockValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.error,
  },
  viewAllLowStock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  viewAllText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  }
});