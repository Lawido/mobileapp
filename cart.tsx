import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard'; 
import { router } from 'expo-router'; 

// --- IMPORTLAR ---
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useToastStore } from '../../store/toastStore';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONT_SIZES } from '../../lib/constants';

// --- SABİTLER ---
const STEPS = ['Sepet', 'Teslimat', 'Ödeme'];
const { width } = Dimensions.get('window');

// Kart Boyutları
const MINI_CARD_WIDTH = width * 0.35; 
const MINI_CARD_IMAGE_HEIGHT = MINI_CARD_WIDTH * 1.0;

export default function CartScreen() {
  const { user } = useAuthStore();
  
  // Store
  const { items, setItems, updateQuantity, removeItem, clearCart: clearStoreCart } = useCartStore();
  const { favorites, setFavorites, addFavorite, removeFavorite } = useFavoritesStore();
  const { showToast } = useToastStore();
  
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [couponProcessing, setCouponProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Data State
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]); 
  const [settings, setSettings] = useState<Record<string, string>>({});
  
  // Ödeme & Kupon
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'door'>('transfer');
  const [orderNumber, setOrderNumber] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, amount: number, min_spend: number} | null>(null);

  // Form
  const [form, setForm] = useState({
    fullName: user?.user_metadata?.full_name || '',
    phone: '',
    city: '',
    address: '',
    note: '',
  });

  // --- VERİ YÜKLEME ---
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadAllData();
      } else {
        setLoading(false);
      }
    }, [user])
  );

  const loadAllData = async () => {
    try {
      if (!user) return;

      // 1. Sepet Verisi
      const { data: cartData, error: cartError } = await supabase
        .from('cart_items') 
        .select('*, product:products(*)')
        .eq('user_id', user.id);

      if (cartError) console.error("Sepet yükleme hatası:", cartError);

      // 2. Favoriler
      const { data: favData } = await supabase
        .from('favorites')
        .select('*, product:products(*)')
        .eq('user_id', user.id);

      // 3. Önerilen Ürünler
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .limit(5);

      // 4. Aktif Kuponlar
      const { data: couponData } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .order('discount_amount', { ascending: false });

      // 5. Adres Bilgisi
      const { data: addressData } = await supabase
        .from('user_addresses') 
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(); 

      // State Güncellemeleri
      if (cartData) {
        const formattedItems = cartData.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          title: item.product?.name || 'Ürün Bulunamadı',
          price: item.product?.price || 0,
          image_url: item.product?.image_url,
          stock_quantity: item.product?.stock,
          product: item.product
        }));
        setItems(formattedItems);
      }

      if (favData) setFavorites(favData);
      if (productData) setSuggestedProducts(productData);
      if (couponData) setAvailableCoupons(couponData);

      // Adres Formunu Doldur
      if (addressData) {
        setForm(prev => ({
          ...prev,
          fullName: addressData.full_name || prev.fullName,
          phone: addressData.phone || '',
          city: addressData.city || '',
          address: addressData.address || '',
        }));
      }

      await fetchSettings();

    } catch (error) {
      console.error('Veri yükleme genel hatası:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('*');
      if (!error && data) {
        const settingsMap = data.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});
        setSettings(settingsMap);
      }
    } catch (e) { console.error(e); }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // --- HESAPLAMALAR ---
  const SHIPPING_FEE = parseFloat(settings.shipping_fee || '49.90');
  const FREE_SHIPPING_THRESHOLD = parseFloat(settings.free_shipping_threshold || '750');
  const COD_FEE = parseFloat(settings.cod_fee || '29.90');
  const TRANSFER_DISCOUNT_RATE = parseFloat(settings.bank_transfer_discount || '5');

  const validItems = items.filter(item => (item.product?.stock || 0) > 0);
  
  const grossTotal = validItems.reduce((acc, item) => {
    const price = Number(item.product?.price || 0);
    const qty = Number(item.quantity || 0);
    return acc + (price * qty);
  }, 0);

  const productDiscountTotal = validItems.reduce((acc, item) => {
    const originalPrice = Number(item.product?.price || 0);
    const salePrice = Number(item.product?.discount_price || originalPrice);
    const qty = Number(item.quantity || 0);
    
    if (item.product?.discount_price && salePrice < originalPrice) {
        return acc + ((originalPrice - salePrice) * qty);
    }
    return acc;
  }, 0);

  const productsSubTotal = grossTotal - productDiscountTotal;
  const isShippingFree = productsSubTotal >= FREE_SHIPPING_THRESHOLD;
  const shippingCost = isShippingFree ? 0 : SHIPPING_FEE;
  const couponDiscountAmount = appliedCoupon ? appliedCoupon.amount : 0;
  
  const subTotalBeforePayment = Math.max(0, productsSubTotal - couponDiscountAmount);
  
  let transferDiscountAmount = 0;
  if (paymentMethod === 'transfer' && currentStep === 3) {
    transferDiscountAmount = (subTotalBeforePayment * TRANSFER_DISCOUNT_RATE) / 100;
  }

  let doorFeeAmount = 0;
  if (paymentMethod === 'door' && currentStep === 3) {
    doorFeeAmount = COD_FEE;
  }

  const finalTotal = subTotalBeforePayment + shippingCost - transferDiscountAmount + doorFeeAmount;

  // --- AKSİYONLAR ---
  
  const handleToggleFavorite = async (targetId: string) => {
    if (!user) return;
    
    const isFav = favorites.some(f => f.product_id === targetId);

    try {
        if (isFav) {
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('user_id', user.id)
                .eq('product_id', targetId);
            
            if (error) throw error;
            removeFavorite(targetId); 
            if (showToast) showToast('Favorilerden çıkarıldı', 'info');
        } else {
            const { data, error } = await supabase
                .from('favorites')
                .insert({ user_id: user.id, product_id: targetId })
                .select('*, product:products(*)')
                .single();

            if (error) throw error;
            addFavorite(data); 
            if (showToast) showToast('Favorilere eklendi', 'success');
        }
    } catch (error) {
        console.error("Favori işlemi hatası:", error);
    }
  };

  const handleQuantity = async (id: string, quantity: number, stock: number) => {
    if (quantity <= 0) {
      Alert.alert("Sil", "Ürünü sepetten çıkarmak istiyor musunuz?", [
        { text: "İptal", style: "cancel" },
        { text: "Sil", style: "destructive", onPress: async () => { 
            await supabase.from('cart_items').delete().eq('id', id);
            removeItem(id); 
            if (showToast) showToast('Ürün silindi', 'info');
        }}
      ]);
      return;
    }
    
    if (stock !== undefined && quantity > stock) {
      Alert.alert('Stok Sınırı', `Bu üründen stoklarımızda sadece ${stock} adet kalmıştır.`);
      return;
    }

    await supabase.from('cart_items').update({ quantity }).eq('id', id);
    updateQuantity(id, quantity);
  };

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = codeToApply || couponCode;

    if (!code.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir kupon kodu giriniz.');
      return;
    }

    Keyboard.dismiss();
    setCouponProcessing(true);

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.trim())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        Alert.alert('Hata', 'Geçersiz veya süresi dolmuş kupon kodu.');
        setAppliedCoupon(null);
      } else {
        const discountVal = parseFloat(data.discount_amount);
        const minSpend = parseFloat(data.min_spend_amount || '0');

        if (minSpend > 0 && productsSubTotal < minSpend) {
           Alert.alert(
             'Yetersiz Tutar', 
             `Bu kuponu kullanabilmek için sepet tutarınız en az ${minSpend} TL olmalıdır.`
           );
           setAppliedCoupon(null);
           setCouponProcessing(false);
           return;
        }

        setAppliedCoupon({ code: data.code, amount: discountVal, min_spend: minSpend });
        setCouponCode(data.code); 
        if (showToast) showToast('Kupon Başarıyla Uygulandı', 'success');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Kupon sorgulanırken sorun oluştu.');
    } finally {
      setCouponProcessing(false);
    }
  };

  const removeCoupon = () => {
      setAppliedCoupon(null);
      setCouponCode('');
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (validItems.length === 0) return Alert.alert("Hata", "Sepetinizde uygun ürün bulunmuyor.");
      
      if (appliedCoupon && appliedCoupon.min_spend > 0 && productsSubTotal < appliedCoupon.min_spend) {
          Alert.alert('Uyarı', `Sepet tutarı düştüğü için "${appliedCoupon.code}" kuponu kaldırıldı.`);
          setAppliedCoupon(null);
          return;
      }

      setCurrentStep(2);

    } else if (currentStep === 2) {
      if (!form.fullName || !form.phone || !form.address || !form.city) {
        return Alert.alert("Eksik Bilgi", "Lütfen teslimat bilgilerini eksiksiz doldurun.");
      }

      setProcessing(true);
      try {
        const { error: insertError } = await supabase.from('user_addresses').insert({
            user_id: user?.id,
            full_name: form.fullName,
            phone: form.phone,
            city: form.city,
            address: form.address,
        });
        
        if (insertError) console.log("Adres insert hatası:", insertError.message);

        const newOrderNumber = Math.floor(100000 + Math.random() * 900000).toString();
        setOrderNumber(newOrderNumber);
        setCurrentStep(3);

      } catch (err) {
        console.error(err);
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else if (router.canGoBack()) router.back();
  };

  // --- KRİTİK DÜZELTME: İki Aşamalı Sipariş Oluşturma ve Durum Ataması ---
  const handleOrderComplete = async () => {
    if (validItems.length === 0) return;
    setProcessing(true);
    let newOrderId = null; 
    
    // DÜZELTME: Ödeme yöntemine göre başlangıç durumu ve ödeme durumu belirlenir
    let initialStatus = 'PROCESSING'; // Varsayılan: Kapıda Ödeme / Hazırlanıyor
    let paymentStatus = 'received'; 
    
    if (paymentMethod === 'transfer') {
        initialStatus = 'PAYMENT_PENDING'; // Havale EFT için: Ödeme Bekliyor
        paymentStatus = 'pending'; 
    } else if (paymentMethod === 'door') {
        initialStatus = 'PROCESSING'; // Kapıda Ödeme için: Hazırlanıyor
        paymentStatus = 'COD'; // Cash On Delivery
    }

    try {
      if (user) {
        const methodText = paymentMethod === 'door' ? 'Kapıda Ödeme' : 'Havale/EFT';
        
        // 1. AŞAMA: ANA SİPARİŞ OLUŞTURMA (orders tablosuna)
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: user.id,
                order_code: orderNumber, 
                total_amount: finalTotal,
                subtotal: productsSubTotal, 
                shipping_cost: shippingCost, 
                discount_amount: couponDiscountAmount + transferDiscountAmount, 
                status: initialStatus, // DİNAMİK DURUM ATAMASI
                payment_method: methodText,
                payment_status: paymentStatus, // DİNAMİK ÖDEME DURUMU
                shipping_address: form, 
                notes: form.note || null,
            })
            .select('id') 
            .single();

        if (orderError) throw orderError;
        if (!orderData) throw new Error("Sipariş ID'si alınamadı.");
        
        newOrderId = orderData.id;

        // 2. AŞAMA: SİPARİŞ ÜRÜNLERİNİ EKLEME (order_items tablosuna)
        
        const orderItemsPayload = validItems.map(item => ({
            order_id: newOrderId,
            product_id: item.product_id,
            quantity: item.quantity,
            price: Number(item.product?.price || 0), 
            discount_price: Number(item.product?.discount_price) > 0 ? Number(item.product?.discount_price) : null,
            product_snapshot: {
                id: item.product?.id,
                name: item.title,
                image_url: item.image_url,
                category: item.product?.category,
            }
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsPayload);

        if (itemsError) {
             await supabase.from('orders').update({ status: 'ERROR', admin_notes: 'Ürün eklenirken hata oluştu' }).eq('id', newOrderId);
             throw itemsError;
        }
        
        // 3. AŞAMA: SEPETİ TEMİZLEME
        await supabase.from('cart_items').delete().eq('user_id', user.id);
        clearStoreCart();

        Alert.alert(
            'Sipariş Başarılı! 🎉',
            `Sipariş Numaranız: #${orderNumber}\n\nSiparişiniz başarıyla alındı.`,
            [{ 
                text: 'Siparişlerime Git', 
                onPress: () => { 
                    setCurrentStep(1); 
                    safeNavigate('/orders');
                } 
            }]
        );
      }
    } catch (error: any) {
      console.error("Sipariş Tamamlama Hatası:", error);
      Alert.alert('Hata', `Sipariş oluşturulamadı: ${error.message || 'Bilinmeyen hata'}`);
      if (newOrderId) {
        Alert.alert("Kritik Hata", "Siparişiniz oluştu ancak ürün detayları kaydedilemedi. Lütfen yöneticinizle iletişime geçin.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = async (text: string, label: string = 'Bilgi') => {
    await Clipboard.setStringAsync(text);
    if (showToast) showToast(`${label} Kopyalandı`, 'info');
  };

  // --- GÜVENLİ NAVİGASYON ---
  const safeNavigate = (path: any) => {
    try {
      if (path && typeof path === 'string') {
        router.push(path);
      }
    } catch (e) {
      console.log("Navigasyon hatası (safeNavigate):", e);
    }
  };

  const handleStartShopping = () => {
    try {
        router.push('/categories'); 
    } catch (e) {
        console.error("Alışverişe başlama hatası:", e);
    }
  };
  
// DİĞER FONKSİYONLAR, STYLES VE RENDER KISIMLARI
// (Aşağıdaki kısım, uygulamanızın görünümü ve stiliyle ilgilidir.)

// --- UI BİLEŞENLERİ ---

  // YENİ STEPPER (DÜZ ÇİZGİ) - Sadece Adım 2 ve 3'te görünür
  const renderStepIndicator = () => {
      // 1. Adımda (Sepette) Gizle
      if (currentStep === 1) return null;

      // İlerleme Oranı
      const progressWidth = currentStep === 3 ? '100%' : '50%';

      return (
        <View style={styles.stepperContainer}>
            {/* Etiketler */}
            <View style={styles.stepperLabels}>
                {STEPS.map((step, index) => (
                    <Text 
                        key={step} 
                        style={[
                            styles.stepperLabel, 
                            (index + 1) <= currentStep && styles.activeStepperLabel,
                            // Hizalama: İlki sola, sonuncusu sağa, ortadakiler ortaya
                            index === 0 ? { textAlign: 'left' } : 
                            index === STEPS.length - 1 ? { textAlign: 'right' } : { textAlign: 'center' }
                        ]}
                    >
                        {step}
                    </Text>
                ))}
            </View>
            
            {/* Çizgi */}
            <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>
        </View>
      );
  };

  const HorizontalProductCard = ({ item }: { item: any }) => {
    const product = item.product || item;
    if (!product) return null;
    
    // Favori Durumu Kontrolü
    const isFav = favorites.some(f => f.product_id === product.id);
    
    const price = Number(product.price) || 0;
    const discountPrice = Number(product.discount_price);
    const hasDiscount = discountPrice > 0 && discountPrice < price;
    const displayPrice = hasDiscount ? discountPrice : price;

    return (
        <TouchableOpacity 
            style={styles.miniCard} 
            onPress={() => safeNavigate(`/product/${product.id}`)}
            activeOpacity={0.9}
        >
            <View style={styles.miniImageContainer}>
                <Image source={{ uri: product.image_url }} style={styles.miniCardImage} resizeMode="cover" />
                <TouchableOpacity 
                    style={styles.miniFavoriteBtn}
                    onPress={(e) => {
                        e.stopPropagation(); 
                        handleToggleFavorite(product.id);
                    }}
                >
                    <Ionicons 
                        name={isFav ? "heart" : "heart-outline"} 
                        size={18} 
                        color={isFav ? '#EA4335' : COLORS.text} 
                    /> 
                </TouchableOpacity>
            </View>
            <View style={styles.miniCardContent}>
                <Text style={styles.miniCardTitle} numberOfLines={2}>{product.name}</Text>
                <View style={styles.miniPriceContainer}>
                    <Text style={styles.miniCardPrice}>{displayPrice.toLocaleString('tr-TR')} ₺</Text>
                    {hasDiscount && <Text style={styles.miniOldPrice}>{price.toLocaleString('tr-TR')} ₺</Text>}
                </View>
            </View>
        </TouchableOpacity>
    );
  };

  const renderAvailableCoupons = () => {
      if (availableCoupons.length === 0) return null;

      return (
          <View style={{ marginBottom: 20 }}>
              <Text style={styles.sectionTitle}>Kuponlar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 5 }}>
                  {availableCoupons.map((c) => (
                      <View key={c.id} style={styles.couponPreviewCard}>
                          <View style={styles.couponLeftSection}>
                              <Text style={styles.couponAmountText}>{c.discount_amount}₺</Text>
                              <Text style={styles.couponLabelText}>İNDİRİM</Text>
                          </View>
                          <View style={styles.couponDivider}>
                            <View style={styles.dashedLine} />
                          </View>
                          <View style={styles.couponRightSection}>
                              <Text style={styles.couponCodeText}>{c.code}</Text>
                              <Text style={styles.couponDescText} numberOfLines={1}>{c.description || 'Sepette'}</Text>
                              <TouchableOpacity 
                                style={styles.couponUseButton}
                                onPress={() => handleApplyCoupon(c.code)}
                              >
                                  <Text style={styles.couponUseButtonText}>KULLAN</Text>
                              </TouchableOpacity>
                          </View>
                      </View>
                  ))}
              </ScrollView>
          </View>
      );
  };

  // --- KULLANICI GİRİŞ KONTROLÜ ---
  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="cart-outline" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyText}>Sepetinizi görmek için giriş yapmalısınız.</Text>
        <TouchableOpacity 
            style={styles.mainButton} 
            onPress={() => safeNavigate('/login')} 
        >
          <Text style={styles.mainButtonText}>Giriş Yap</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !refreshing) {
      return (
          <View style={[styles.container, styles.centerContent]}>
              <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
      );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Düzeltme: Geri tuşu sadece adım 2 ve 3'te görünür */}
        {currentStep > 1 ? (
            <TouchableOpacity onPress={handleBackStep} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
        ) : (
            <View style={styles.backButton} /> // Boş view ile hizalama korunur
        )}
        
        <Text style={styles.headerTitle}>
          {currentStep === 1 ? 'Sepetim' : currentStep === 2 ? 'Teslimat Bilgileri' : 'Ödeme'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* DÜZELTME: Progress Bar Stepper (Sadece adım 2 ve 3) */}
      {renderStepIndicator()}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          
          {/* --- ADIM 1: SEPET --- */}
          {currentStep === 1 && (
            <>
              {items.length === 0 ? (
                // Boş Sepet
                <>
                    <View style={styles.emptyContainer}>
                        <Ionicons name="cart-outline" size={64} color={COLORS.textLight} />
                        <Text style={styles.emptyText}>Sepetiniz boş.</Text>
                        <TouchableOpacity 
                            style={styles.mainButton} 
                            onPress={handleStartShopping} 
                        >
                            <Text style={styles.mainButtonText}>Alışverişe Başla</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* DÜZELTME: Favori Varsa Favorileri, Yoksa Önerileri Göster */}
                    {favorites.length > 0 ? (
                        <View style={[styles.horizontalSection, { marginTop: 40 }]}>
                            <Text style={styles.sectionTitle}>Favorileriniz</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 5}}>
                                {favorites.map(fav => <HorizontalProductCard key={fav.id} item={fav} />)}
                            </ScrollView>
                        </View>
                    ) : (
                        <View style={[styles.horizontalSection, { marginTop: 40 }]}>
                            <Text style={styles.sectionTitle}>Bunları da Beğenebilirsiniz</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 5}}>
                                {suggestedProducts.map(sug => <HorizontalProductCard key={sug.id} item={sug} />)}
                            </ScrollView>
                        </View>
                    )}
                </>
              ) : (
                // Dolu Sepet
                <>
                    {renderAvailableCoupons()}

                    {items.map(item => {
                        if (!item.product && !item.title) return null;
                        const stock = item.stock_quantity || item.product?.stock || 0;
                        const isOutOfStock = stock <= 0;
                        const originalPrice = Number(item.product?.price || item.price || 0);
                        const salePrice = Number(item.product?.discount_price || originalPrice);
                        const hasDiscount = item.product?.discount_price && salePrice < originalPrice;

                        return (
                        <TouchableOpacity 
                            key={item.id} 
                            style={[styles.cartItem, isOutOfStock && styles.outOfStockItem]}
                            activeOpacity={0.9}
                            onPress={() => safeNavigate(`/product/${item.product_id || item.product?.id}`)} 
                        >
                            <View style={styles.imageWrapper}>
                                <Image source={{ uri: item.product?.image_url || item.image_url }} style={[styles.cartImage, isOutOfStock && { opacity: 0.5 }]} />
                                {isOutOfStock && (
                                    <View style={styles.outOfStockBadge}>
                                        <Text style={styles.outOfStockText}>TÜKENDİ</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.cartContent}>
                                <View>
                                    <Text style={[styles.cartTitle, isOutOfStock && {color: COLORS.textLight}]} numberOfLines={1}>
                                        {item.product?.name || item.title}
                                    </Text>
                                    <Text style={styles.cartCategory}>{item.product?.category || ''}</Text>
                                </View>
                                
                                {!isOutOfStock ? (
                                    <View style={styles.cartFooter}>
                                        <View style={styles.qtyWrapper}>
                                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleQuantity(item.id, item.quantity - 1, stock)}} style={styles.qtyBtn}>
                                                <Ionicons name="remove" size={16} color={COLORS.text} />
                                            </TouchableOpacity>
                                            <Text style={styles.qtyText}>{item.quantity}</Text>
                                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleQuantity(item.id, item.quantity + 1, stock)}} style={styles.qtyBtn}>
                                                <Ionicons name="add" size={16} color={COLORS.text} />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            {hasDiscount && <Text style={styles.priceOldText}>{(originalPrice * item.quantity).toFixed(2)} ₺</Text>}
                                            <Text style={styles.priceText}>{(salePrice * item.quantity).toFixed(2)} ₺</Text>
                                            <TouchableOpacity style={{ marginTop: 4 }} onPress={(e) => { e.stopPropagation(); handleQuantity(item.id, 0, 0)}}>
                                                <Ionicons name="trash-outline" size={18} color={COLORS.textLight} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.cartFooter}>
                                        <Text style={{color: COLORS.red, fontSize: 12, fontStyle:'italic'}}>Ürün şu an temin edilemiyor.</Text>
                                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleQuantity(item.id, 0, 0)}} style={{padding: 5}}>
                                            <Ionicons name="trash-outline" size={20} color={COLORS.textLight} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    )})}

                    {favorites.length > 0 && (
                        <View style={styles.horizontalSection}>
                            <Text style={styles.sectionTitle}>Favorileriniz</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 5}}>
                                {favorites.map(fav => <HorizontalProductCard key={fav.id} item={fav} />)}
                            </ScrollView>
                        </View>
                    )}

                    {suggestedProducts.length > 0 && (
                        <View style={styles.horizontalSection}>
                            <Text style={styles.sectionTitle}>Bunları da Beğenebilirsiniz</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 5}}>
                                {suggestedProducts.map(sug => <HorizontalProductCard key={sug.id} item={sug} />)}
                            </ScrollView>
                        </View>
                    )}

                    <View style={styles.couponCard}>
                        <View style={styles.couponInputWrapper}>
                            <Ionicons name="ticket-outline" size={20} color={COLORS.primary} style={{marginRight: 8}} />
                            <TextInput 
                                style={styles.couponInput} 
                                placeholder="İndirim Kuponu Giriniz" 
                                value={couponCode}
                                onChangeText={setCouponCode}
                                editable={!appliedCoupon}
                                autoCapitalize="characters"
                            />
                        </View>
                        {appliedCoupon ? (
                            <TouchableOpacity style={styles.removeCouponBtn} onPress={removeCoupon} disabled={couponProcessing}>
                                <Text style={styles.btnTextDark}>Sil</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.applyCouponBtn} onPress={() => handleApplyCoupon()} disabled={couponProcessing}>
                                {couponProcessing ? <ActivityIndicator size="small" color={COLORS.text} /> : <Text style={styles.btnTextDark}>Uygula</Text>}
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.summaryCard}>
                      <Text style={styles.sectionTitleNoMargin}>Sipariş Özeti</Text>
                      
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Ürünler Toplamı</Text>
                        <Text style={styles.summaryValue}>{grossTotal.toFixed(2)} ₺</Text>
                      </View>

                      {productDiscountTotal > 0 && (
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: COLORS.green }]}>Ürün İndirimi</Text>
                            <Text style={[styles.summaryValue, { color: COLORS.green }]}>-{productDiscountTotal.toFixed(2)} ₺</Text>
                        </View>
                      )}
                      
                      {couponDiscountAmount > 0 && (
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: COLORS.green }]}>Kupon İndirimi</Text>
                            <Text style={[styles.summaryValue, { color: COLORS.green }]}>-{couponDiscountAmount.toFixed(2)} ₺</Text>
                        </View>
                      )}

                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Kargo</Text>
                        <Text style={[styles.summaryValue, isShippingFree && { color: COLORS.green }]}>
                            {isShippingFree ? 'Ücretsiz' : `${SHIPPING_FEE} ₺`}
                        </Text>
                      </View>

                      <View style={styles.divider} />
                      
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Genel Toplam</Text>
                        <Text style={styles.totalValue}>{finalTotal.toFixed(2)} ₺</Text>
                      </View>
                    </View>
                </>
              )}
            </>
          )}

          {/* --- ADIM 2: TESLİMAT --- */}
          {currentStep === 2 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Adres Bilgileri</Text>
              </View>
              <Text style={styles.label}>Ad Soyad</Text>
              <TextInput style={styles.input} placeholder="Örn: Ahmet Yılmaz" value={form.fullName} onChangeText={(t) => setForm({...form, fullName: t})} />
              <View style={styles.row}>
                <View style={[styles.col, { paddingRight: 5 }]}>
                  <Text style={styles.label}>Telefon</Text>
                  <TextInput style={styles.input} placeholder="555..." keyboardType="phone-pad" value={form.phone} onChangeText={(t) => setForm({...form, phone: t})} />
                </View>
                <View style={[styles.col, { paddingLeft: 5 }]}>
                  <Text style={styles.label}>Şehir</Text>
                  <TextInput style={styles.input} placeholder="İstanbul" value={form.city} onChangeText={(t) => setForm({...form, city: t})} />
                </View>
              </View>
              <Text style={styles.label}>Adres</Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="Mahalle, Cadde, No..." multiline value={form.address} onChangeText={(t) => setForm({...form, address: t})} />
              <Text style={styles.label}>Not (Opsiyonel)</Text>
              <TextInput style={styles.input} placeholder="Sipariş notu..." value={form.note} onChangeText={(t) => setForm({...form, note: t})} />
            </View>
          )}

          {/* --- ADIM 3: ÖDEME --- */}
          {currentStep === 3 && (
            <>
              {/* Sipariş No */}
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => copyToClipboard(orderNumber, 'Sipariş No')}
                style={[styles.card, { backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }]}
              >
                <Text style={[styles.cardTitle, { color: 'white', marginBottom: 5 }]}>Sipariş Numaranız</Text>
                <Text style={{ fontSize: 32, fontWeight: '800', color: 'white', letterSpacing: 2 }}>#{orderNumber}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 5 }}>
                  <Ionicons name="copy-outline" size={12} color="white" /> Dokunarak Kopyala
                </Text>
              </TouchableOpacity>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="card-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.cardTitle}>Ödeme Yöntemi</Text>
                </View>

                {/* Havale */}
                <TouchableOpacity style={[styles.paymentOption, paymentMethod === 'transfer' && styles.paymentActive]} onPress={() => setPaymentMethod('transfer')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="cash-outline" size={22} color={paymentMethod === 'transfer' ? COLORS.primary : COLORS.textLight} />
                    <Text style={[styles.paymentText, paymentMethod === 'transfer' && { color: COLORS.primary }]}>Havale / EFT</Text>
                  </View>
                  {paymentMethod === 'transfer' && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
                
                {paymentMethod === 'transfer' && (
                  <View style={styles.paymentInfoBox}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Banka:</Text>
                        <Text style={styles.infoValue}>{settings.bank_name || 'Banka Bilgisi Bekleniyor'}</Text>
                    </View>
                    <TouchableOpacity style={styles.copyRow} onPress={() => copyToClipboard(settings.iban_number || '')}>
                        <View>
                            <Text style={styles.infoLabel}>IBAN</Text>
                            <Text style={styles.ibanText}>{settings.iban_number || 'TR00 ...'}</Text>
                        </View>
                        <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.copyRow} onPress={() => copyToClipboard(settings.account_holder || '')}>
                         <View>
                            <Text style={styles.infoLabel}>Alıcı</Text>
                            <Text style={styles.infoValue}>{settings.account_holder || 'Firma Adı'}</Text>
                        </View>
                         <Ionicons name="copy-outline" size={16} color={COLORS.textLight} />
                    </TouchableOpacity>
                    {TRANSFER_DISCOUNT_RATE > 0 && <Text style={styles.discountBadge}>%{TRANSFER_DISCOUNT_RATE} Havale İndirimi</Text>}
                  </View>
                )}

                {/* Kapıda Ödeme */}
                <TouchableOpacity style={[styles.paymentOption, paymentMethod === 'door' && styles.paymentActive]} onPress={() => setPaymentMethod('door')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="home-outline" size={22} color={paymentMethod === 'door' ? COLORS.primary : COLORS.textLight} />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={[styles.paymentText, paymentMethod === 'door' && { color: COLORS.primary }]}>Kapıda Ödeme</Text>
                      <Text style={styles.paymentSubText}>+{COD_FEE} TL Hizmet Bedeli</Text>
                    </View>
                  </View>
                  {paymentMethod === 'door' && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.cardTitle}>Ödeme Özeti</Text>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Ürünler Toplamı</Text>
                  <Text style={styles.summaryValue}>{grossTotal.toFixed(2)} ₺</Text>
                </View>

                {productDiscountTotal > 0 && (
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: COLORS.green }]}>Ürün İndirimi</Text>
                        <Text style={[styles.summaryValue, { color: COLORS.green }]}>-{productDiscountTotal.toFixed(2)} ₺</Text>
                    </View>
                )}
                
                {couponDiscountAmount > 0 && (
                  <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: COLORS.green }]}>Kupon İndirimi</Text>
                      <Text style={[styles.summaryValue, { color: COLORS.green }]}>-{couponDiscountAmount.toFixed(2)} ₺</Text>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Kargo</Text>
                  <Text style={[styles.summaryValue, isShippingFree && { color: COLORS.green }]}>
                      {isShippingFree ? 'Ücretsiz' : `${SHIPPING_FEE} ₺`}
                  </Text>
                </View>

                {paymentMethod === 'transfer' && (
                  <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: COLORS.green }]}>Havale İndirimi</Text>
                      <Text style={[styles.summaryValue, { color: COLORS.green }]}>-{transferDiscountAmount.toFixed(2)} ₺</Text>
                  </View>
                )}

                {paymentMethod === 'door' && (
                  <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: COLORS.primary }]}>Kapıda Ödeme Bedeli</Text>
                      <Text style={[styles.summaryValue, { color: COLORS.primary }]}>+{COD_FEE} ₺</Text>
                  </View>
                )}

                <View style={styles.divider} />
                
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Genel Toplam</Text>
                  <Text style={styles.totalValue}>{finalTotal.toFixed(2)} ₺</Text>
                </View>
              </View>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer (DÜZELTİLEN KISIM: Z-INDEX ve BG) */}
      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerLabel}>Ödenecek Tutar</Text>
            <Text style={styles.footerTotal}>{finalTotal.toFixed(2)} ₺</Text>
          </View>
          <TouchableOpacity 
            style={[styles.checkoutBtn, processing && { opacity: 0.7 }]} 
            onPress={currentStep === 3 ? handleOrderComplete : handleNextStep}
            disabled={processing}
          >
            {processing ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Text style={styles.checkoutBtnText}>{currentStep === 3 ? 'Siparişi Tamamla' : 'Devam Et'}</Text>
                <Ionicons name={currentStep === 3 ? "checkmark-circle" : "chevron-forward"} size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  backButton: { padding: 5 },
  
  // YENİ STEPPER STİLİ (DÜZ ÇİZGİ ve TEXT)
  stepperContainer: {
    backgroundColor: COLORS.white,
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  stepperLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepperLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '600',
    flex: 1,
  },
  activeStepperLabel: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  
  scrollContent: { padding: 15, paddingBottom: 180 }, 

  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 10, fontSize: 16, color: COLORS.textLight, textAlign: 'center', marginBottom: 20 },
  mainButton: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
  mainButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  
  // Cart Item
  cartItem: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  outOfStockItem: { backgroundColor: '#f3f4f6', opacity: 0.8 },
  imageWrapper: { position: 'relative' },
  cartImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: COLORS.border },
  outOfStockBadge: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  outOfStockText: { color: COLORS.red, fontSize: 10, fontWeight: 'bold', borderWidth: 1, borderColor: COLORS.red, padding: 2, borderRadius: 4, transform: [{rotate: '-15deg'}] },
  
  cartContent: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  cartTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  cartCategory: { fontSize: 12, color: COLORS.textLight },
  cartFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  qtyWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 6 },
  qtyBtn: { padding: 5 },
  qtyText: { marginHorizontal: 10, fontWeight: '600' },
  priceText: { fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  priceOldText: { fontSize: 12, color: COLORS.textLight, textDecorationLine: 'line-through', marginBottom: 2 }, 
  
  // Coupon Input
  couponCard: { backgroundColor: COLORS.white, padding: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  couponInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, paddingHorizontal: 10, borderRadius: 8, marginRight: 10 },
  couponInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  applyCouponBtn: { backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 }, 
  removeCouponBtn: { backgroundColor: COLORS.accent, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
  btnTextDark: { color: COLORS.text, fontWeight: 'bold', fontSize: 12 },

  // Coupon Preview Cards
  couponPreviewCard: { 
    width: 180, 
    height: 60, 
    backgroundColor: COLORS.white, 
    borderRadius: 8, 
    marginRight: 10, 
    borderWidth: 1, 
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  couponLeftSection: {
    width: 60,
    backgroundColor: COLORS.primary, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponAmountText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  couponLabelText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 8,
    fontWeight: 'bold',
  },
  couponDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dashedLine: {
    width: 1,
    height: '80%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  couponRightSection: {
    flex: 1,
    padding: 8,
    justifyContent: 'space-between',
    backgroundColor: '#FFF'
  },
  couponCodeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  couponDescText: {
    fontSize: 9,
    color: COLORS.textLight,
  },
  couponUseButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#F3F4F6',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  couponUseButtonText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.text,
  },

  // Horizontal Sections
  horizontalSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 10, marginLeft: 5 },
  sectionTitleNoMargin: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },

  // Mini Card Styles
  miniCard: { 
    width: MINI_CARD_WIDTH, 
    backgroundColor: COLORS.background,
    borderRadius: 10, 
    marginRight: 15,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 10
  },
  miniImageContainer: { 
    width: '100%', 
    height: MINI_CARD_IMAGE_HEIGHT, 
    backgroundColor: "#F3F3F3",
    position: 'relative'
  },
  miniCardImage: { 
    width: '100%', 
    height: '100%' 
  },
  miniFavoriteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  miniCardContent: { 
    padding: 10 
  },
  miniCardTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.text, 
    marginBottom: 4,
    minHeight: 34 
  },
  miniPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  miniCardPrice: { 
    fontSize: 16,
    fontWeight: '800', 
    color: COLORS.primary 
  },
  miniOldPrice: {
    fontSize: 12,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
    marginLeft: 4
  },

  // Cards & Input
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: COLORS.text },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginBottom: 6 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 14, color: COLORS.text },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  col: { flex: 1 },
  
  // Payment
  paymentOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, backgroundColor: COLORS.white },
  paymentActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  paymentText: { marginLeft: 10, fontSize: 14, fontWeight: '600', color: COLORS.text },
  paymentSubText: { fontSize: 11, color: COLORS.textLight },
  paymentInfoBox: { padding: 12, backgroundColor: COLORS.background, borderRadius: 8, marginBottom: 15, marginLeft: 5, borderWidth: 1, borderColor: COLORS.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  copyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingVertical: 4 },
  infoLabel: { color: COLORS.textLight, fontSize: 12 },
  infoValue: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  ibanText: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 14, color: COLORS.primary, fontWeight: 'bold' },
  discountBadge: { fontSize: 12, color: COLORS.green, fontWeight: '600', marginTop: 8, textAlign: 'center', backgroundColor: '#dcfce7', padding: 5, borderRadius: 4 },
  
  // Summary
  summaryCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: COLORS.textLight },
  summaryValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.border, borderStyle: 'dashed', borderWidth: 1, marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  
  // Footer (DÜZELTİLEN KISIM: Z-INDEX ve BG)
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: '#FFFFFF', // Tam beyaz (transparent değil!)
    padding: 15, 
    paddingBottom: Platform.OS === 'ios' ? 30 : 15, 
    borderTopWidth: 1, 
    borderTopColor: '#E0E0E0', 
    flexDirection: 'row', 
    alignItems: 'center', 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: -5 }, // Gölge yukarı doğru
    shadowOpacity: 0.2, // Biraz daha belirgin
    shadowRadius: 5, 
    elevation: 20, // Android için yüksek elevation
    zIndex: 9999, // En üstte kalması için
  },
  footerLabel: { fontSize: 12, color: COLORS.textLight },
  footerTotal: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  checkoutBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, flex: 0.8 },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginRight: 5 },
});