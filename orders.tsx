import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { getUserOrders, createReturnRequest, Order } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../lib/constants';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function OrdersProfileScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      // @ts-ignore
      const data = await getUserOrders(user.id);
      setOrders(data || []);
    } catch (error) {
      console.error('Siparişler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (orderId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleReturnRequest = async (orderId: string) => {
    Alert.alert(
        'İade Talebi',
        'Bu sipariş için iade süreci başlatılacaktır. Onaylıyor musunuz?',
        [
            { text: 'Vazgeç', style: 'cancel' },
            { 
                text: 'İade Et', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        await createReturnRequest(orderId);
                        Alert.alert('Başarılı', 'İade talebiniz alındı. İade kodunuz SMS ile iletilecektir.');
                        loadOrders(); // Listeyi yenile
                    } catch (error) {
                        Alert.alert('Hata', 'İade talebi oluşturulamadı.');
                    }
                }
            }
        ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9F1C';
      case 'shipped': return '#4ECDC4';
      case 'delivered': return '#2ECC71';
      case 'return_requested': return '#FF6B6B';
      case 'cancelled': return '#E74C3C';
      default: return COLORS.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Hazırlanıyor';
      case 'shipped': return 'Kargoda';
      case 'delivered': return 'Teslim Edildi';
      case 'return_requested': return 'İade Talep Edildi';
      case 'cancelled': return 'İptal Edildi';
      default: return 'Bilinmiyor';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const renderTrackingPath = (status: string) => {
    if (status === 'cancelled' || status === 'return_requested') return null;
    const steps = ['pending', 'shipped', 'delivered'];
    const currentIndex = steps.indexOf(status);
    const progressWidth = currentIndex === 0 ? '0%' : currentIndex === 1 ? '50%' : '100%';

    return (
      <View style={styles.trackingContainer}>
        <View style={styles.trackingLineBase}>
             <View style={[styles.trackingLineActive, { width: progressWidth }]} />
        </View>
        <View style={styles.trackingIconsRow}>
            <View style={styles.trackPoint}>
                <View style={[styles.trackIcon, currentIndex >= 0 && styles.trackIconActive]}>
                    <Ionicons name="storefront" size={16} color={currentIndex >= 0 ? '#FFF' : COLORS.textLight} />
                </View>
                <Text style={styles.trackLabel}>Hazırlanıyor</Text>
            </View>
            <View style={styles.trackPoint}>
                <View style={[styles.trackIcon, currentIndex >= 1 && styles.trackIconActive]}>
                    <Ionicons name="car" size={16} color={currentIndex >= 1 ? '#FFF' : COLORS.textLight} />
                </View>
                <Text style={styles.trackLabel}>Kargoda</Text>
            </View>
            <View style={styles.trackPoint}>
                <View style={[styles.trackIcon, currentIndex >= 2 && styles.trackIconActive]}>
                    <Ionicons name="home" size={16} color={currentIndex >= 2 ? '#FFF' : COLORS.textLight} />
                </View>
                <Text style={styles.trackLabel}>Teslim</Text>
            </View>
        </View>
      </View>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
       <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Siparişlerim</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {orders.length === 0 ? (
          <EmptyState icon="receipt-outline" title="Siparişiniz Yok" description="Henüz bir sipariş vermediniz." />
        ) : (
          orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            return (
              <View key={order.id} style={styles.orderCard}>
                <TouchableOpacity style={styles.orderHeader} onPress={() => toggleExpand(order.id)} activeOpacity={0.8}>
                  <View style={styles.orderHeaderTop}>
                    <View style={styles.orderCodeContainer}>
                      <Ionicons name="cube-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.orderCode}>#{order.order_code}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{getStatusText(order.status)}</Text>
                    </View>
                  </View>
                  <View style={styles.orderHeaderBottom}>
                    <View>
                      <Text style={styles.orderDateLabel}>Tutar</Text>
                      <Text style={styles.orderTotal}>₺{order.total_amount.toFixed(2)}</Text>
                    </View>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={COLORS.textLight} />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.orderDetails}>
                    {renderTrackingPath(order.status)}
                    
                    <View style={styles.divider} />
                    
                    {order.order_items.map((item, index) => (
                      <View key={index} style={styles.productItem}>
                        <Image source={{ uri: item.product.images[0] }} style={styles.productImage} />
                        <View style={styles.productInfo}>
                          <Text style={styles.productName} numberOfLines={1}>{item.product.name}</Text>
                          <Text style={styles.productPrice}>x{item.quantity} • ₺{item.price.toFixed(2)}</Text>
                        </View>
                      </View>
                    ))}

                    {['delivered', 'shipped'].includes(order.status) && (
                        <>
                            <View style={styles.divider} />
                            <TouchableOpacity 
                                style={styles.returnButton} 
                                onPress={() => handleReturnRequest(order.id)}
                            >
                                <Ionicons name="return-up-back-outline" size={18} color={COLORS.textLight} />
                                <Text style={styles.returnButtonText}>İade Talebi Oluştur</Text>
                            </TouchableOpacity>
                        </>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingTop: 60, paddingBottom: SPACING.md, backgroundColor: COLORS.background, ...SHADOWS.sm, zIndex: 10 },
  backButton: { padding: 8 },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  orderCard: { backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md, ...SHADOWS.sm, overflow: 'hidden' },
  orderHeader: { padding: SPACING.md },
  orderHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  orderCodeContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderCode: { fontSize: FONT_SIZES.md, fontWeight: '700', color: COLORS.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderHeaderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderDateLabel: { fontSize: 10, color: COLORS.textLight, marginBottom: 2 },
  orderDate: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  orderTotalLabel: { fontSize: 10, color: COLORS.textLight, marginBottom: 2 },
  orderTotal: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  orderDetails: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, backgroundColor: COLORS.background },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  productItem: { flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'center' },
  productImage: { width: 40, height: 40, borderRadius: 4, backgroundColor: '#F0F0F0', marginRight: 10 },
  productInfo: { flex: 1, justifyContent: 'center' },
  productName: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  productPrice: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  trackingContainer: { marginVertical: SPACING.md, alignItems: 'center' },
  trackingLineBase: { width: '80%', height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, position: 'absolute', top: 14 },
  trackingLineActive: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  trackingIconsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '90%' },
  trackPoint: { alignItems: 'center' },
  trackIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', marginBottom: 4, borderWidth: 2, borderColor: COLORS.background },
  trackIconActive: { backgroundColor: COLORS.primary },
  trackLabel: { fontSize: 10, color: COLORS.textLight, fontWeight: '600' },
  returnButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, gap: 6, marginTop: 4 },
  returnButtonText: { fontSize: 13, color: COLORS.textLight, fontWeight: '600' },
});