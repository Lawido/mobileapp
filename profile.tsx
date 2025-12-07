import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { PaymentMethodsModal } from '../../components/PaymentMethodsModal'; 
import { signOutUser } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../lib/constants';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  isDestructive?: boolean;
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();
  const { clearCart } = useCartStore();
  const { setFavorites, favorites } = useFavoritesStore();
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await signOutUser();
              logout();
              clearCart();
              setFavorites([]);
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const openPlayStore = () => {
    Linking.openURL('https://play.google.com/store/apps/dev?id=7207083520551891246').catch(err => console.error("Link açılamadı", err));
  };

  const accountItems: MenuItem[] = [
    {
      icon: 'person-outline',
      title: 'Kişisel Bilgiler',
      subtitle: 'Ad, soyad ve telefon',
      // @ts-ignore
      // ✅ DÜZELTME 1: profile/personal-info -> PersonalInfo
      onPress: () => navigation.navigate('PersonalInfo'),
    },
    {
      icon: 'location-outline',
      title: 'Kayıtlı Adreslerim',
      subtitle: 'Teslimat adresleri',
      // @ts-ignore
      // ✅ DÜZELTME 2: profile/address -> Address
      onPress: () => navigation.navigate('Address'),
    },
    {
      icon: 'card-outline',
      title: 'Ödeme Yöntemlerim',
      subtitle: 'Kartlar ve banka bilgileri',
      onPress: () => setPaymentModalVisible(true),
    },
  ];

  const appItems: MenuItem[] = [
    {
      icon: 'notifications-outline',
      title: 'Bildirim Ayarları',
      onPress: () => setNotificationsEnabled(!notificationsEnabled),
      showChevron: false,
    },
    {
      icon: 'help-circle-outline',
      title: 'Yardım ve Destek',
      // @ts-ignore
      // ✅ DÜZELTME 3: profile/help -> Help
      onPress: () => navigation.navigate('Help'),
    },
    {
      icon: 'information-circle-outline',
      title: 'Uygulama Hakkında',
      onPress: openPlayStore,
    },
  ];

  if (!user) {
    return (
      <View style={styles.container}>
        <Header title="Profilim" />
        <View style={styles.notLoggedInContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="person" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.notLoggedInTitle}>Hesabınıza Giriş Yapın</Text>
          <Text style={styles.notLoggedInDesc}>
            Siparişlerinizi takip etmek, favorilerinizi kaydetmek ve size özel kampanyalardan yararlanmak için giriş yapın.
          </Text>
          <View style={styles.authButtons}>
            <Button
              title="Giriş Yap"
              // @ts-ignore
              // ✅ DÜZELTME 4: login -> Login
              onPress={() => navigation.navigate('Login')}
              fullWidth
            />
            <Button
              title="Hesap Oluştur"
              // @ts-ignore
              // ✅ DÜZELTME 5: register -> Register
              onPress={() => navigation.navigate('Register')}
              variant="outline"
              fullWidth
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Profilim" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profil Kartı */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user.email ? user.email.charAt(0).toUpperCase() : 'K'}
            </Text>
            {user.role === 'admin' && (
              <View style={styles.adminBadgeIcon}>
                <Ionicons name="shield-checkmark" size={12} color="#FFF" />
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user.full_name || user.user_metadata?.full_name || 'Değerli Müşterimiz'}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        {/* Hızlı Erişim */}
        <View style={styles.quickAccessContainer}>
          {/* 1. SİPARİŞLER */}
          <TouchableOpacity 
            style={styles.quickAccessItem} 
            // @ts-ignore
            // ✅ DÜZELTME 6: orders -> Orders
            onPress={() => navigation.navigate('Orders')}
          >
            <View style={styles.quickAccessIcon}>
              <Ionicons name="cube-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.quickAccessText}>Siparişler</Text>
          </TouchableOpacity>
          
          {/* 2. FAVORİLER */}
          <TouchableOpacity 
            style={styles.quickAccessItem} 
            // @ts-ignore
            // ✅ DÜZELTME 7: favorites -> Favorites (TabBar içinde olmasına rağmen Stack olarak çağrılabilir)
            onPress={() => navigation.navigate('Favorites')} 
          >
            <View style={styles.quickAccessIcon}>
              <Ionicons name="heart-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.quickAccessText}>Favoriler</Text>
            {favorites.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{favorites.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 3. KUPONLAR */}
          <TouchableOpacity 
            style={styles.quickAccessItem} 
            // @ts-ignore
            // ✅ KUPONLAR ZATEN DÜZELTİLMİŞTİ
            onPress={() => navigation.navigate('Coupons')}
          >
            <View style={styles.quickAccessIcon}>
              <Ionicons name="ticket-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.quickAccessText}>Kuponlar</Text>
          </TouchableOpacity>
        </View>

        {/* Admin Paneli */}
        {user.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yönetici İşlemleri</Text>
            <TouchableOpacity
              style={styles.adminCard}
              // @ts-ignore
              // ✅ DÜZELTME 8: admin -> Admin (Stack'in adı)
              onPress={() => navigation.navigate('Admin', { screen: 'dashboard' })}
            >
              <View style={styles.adminCardContent}>
                <View style={styles.adminIconBg}>
                  <Ionicons name="settings" size={24} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.adminCardTitle}>Yönetim Paneli</Text>
                  <Text style={styles.adminCardSubtitle}>Ürün, sipariş ve kullanıcı yönetimi</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Hesap Ayarları (Kişisel Bilgiler, Adres ve Ödeme Yöntemleri) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Ayarları</Text>
          <View style={styles.menuGroup}>
            {accountItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  index === accountItems.length - 1 && styles.lastMenuItem
                ]}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuItemIconBg}>
                    <Ionicons name={item.icon} size={20} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    {item.subtitle && <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Uygulama Ayarları (Bildirim, Yardım, Hakkında) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uygulama</Text>
          <View style={styles.menuGroup}>
            {appItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  index === appItems.length - 1 && styles.lastMenuItem
                ]}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuItemIconBg}>
                    <Ionicons name={item.icon} size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                </View>
                {item.showChevron === false ? (
                  <Switch
                    trackColor={{ false: "#E0E0E0", true: COLORS.primary }}
                    thumbColor={"#FFF"}
                    ios_backgroundColor="#E0E0E0"
                    onValueChange={() => setNotificationsEnabled(!notificationsEnabled)}
                    value={notificationsEnabled}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Çıkış Yap */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loading}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={styles.logoutText}>{loading ? 'Çıkış Yapılıyor...' : 'Oturumu Kapat'}</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>Enxh Jewelry v1.0.0</Text>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Ödeme Yöntemleri Modal */}
      <PaymentMethodsModal 
        visible={paymentModalVisible} 
        onClose={() => setPaymentModalVisible(false)} 
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: -50,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  notLoggedInTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  notLoggedInDesc: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  authButtons: {
    width: '100%',
    gap: SPACING.md,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.background,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
    ...SHADOWS.sm,
    marginBottom: SPACING.md,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    position: 'relative',
    ...SHADOWS.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  adminBadgeIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.success,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  userName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  quickAccessContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  quickAccessItem: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
    width: '30%',
    position: 'relative',
  },
  quickAccessIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.backgroundSecondary,
  },
  quickAccessText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  section: {
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  menuGroup: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    backgroundColor: COLORS.backgroundSecondary,
  },
  menuItemTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.text,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.md,
  },
  adminCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  adminCardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: '#FFF',
  },
  adminCardSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  logoutContainer: {
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
  },
  logoutText: {
    color: COLORS.error,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
    marginLeft: SPACING.xs,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textLight,
    opacity: 0.5,
  },
});