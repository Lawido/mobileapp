import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  FlatList,
  StatusBar,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ProductCard } from '../../components/ProductCard';
import { getProductById, getProducts, addToCart, addToFavorites, removeFromFavorites, getReviews } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useToastStore } from '../../store/toastStore';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../lib/constants';

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = height * 0.55;

export default function ProductDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuthStore();
  // @ts-ignore
  const { addItem } = useCartStore();
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();
  const { showToast } = useToastStore();

  // @ts-ignore
  const productId = route.params?.id;
  const [product, setProduct] = useState<any>(null);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [zoomVisible, setZoomVisible] = useState(false);
  
  // Puanlama Durumu
  const [ratingInfo, setRatingInfo] = useState({ rating: "0.0", count: 0 });

  const sliderRef = useRef<FlatList>(null);
  const autoSlideInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    return () => {
      if (autoSlideInterval.current) {
        clearInterval(autoSlideInterval.current);
      }
    };
  }, [productId]);

  // Otomatik slider
  useEffect(() => {
    if (product && product.images && product.images.length > 1) {
      autoSlideInterval.current = setInterval(() => {
        if (sliderRef.current) {
            setSelectedImage((prev) => {
                const next = (prev + 1) % product.images.length;
                sliderRef.current?.scrollToIndex({
                    index: next,
                    animated: true,
                });
                return next;
            });
        }
      }, 4000);

      return () => {
          if (autoSlideInterval.current) clearInterval(autoSlideInterval.current);
      };
    }
  }, [product]);

  const loadData = async () => {
    setLoading(true);
    try {
      const productData = await getProductById(productId);
      
      // --- RESİM GÖSTERİM DÜZELTMESİ ---
      // Veritabanından 'images' dizisi boş gelebilir ama 'image_url' dolu olabilir.
      // Bu durumda 'image_url'i alıp bir diziye çevirerek slider'da görünmesini sağlıyoruz.
      let processedImages = productData.images || [];
      
      // Eğer images dizisi yoksa veya boşsa, ve ana resim varsa onu kullan
      if (!Array.isArray(processedImages) || processedImages.length === 0) {
          if (productData.image_url) {
              processedImages = [productData.image_url];
          }
      }
      
      // Ürün verisini güncellenmiş resim listesiyle set et
      setProduct({ ...productData, images: processedImages });
      // -----------------------------------
      
      // Benzer ürünleri getir
      const allProducts = await getProducts();
      const similar = allProducts.filter((p: any) => p.id !== productId).slice(0, 4);
      setSimilarProducts(similar);

      // Yorumları Getir ve Ortalamayı Hesapla
      const reviews = await getReviews(productId);
      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
        const avgRating = (totalRating / reviews.length).toFixed(1);
        setRatingInfo({ rating: avgRating, count: reviews.length });
      } else {
        setRatingInfo({ rating: "Yeni", count: 0 });
      }

    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Ürün yüklenemedi', 'error');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      showToast('Lütfen giriş yapın', 'warning');
      // @ts-ignore
      // ✅ DÜZELTME 1: login -> Login
      navigation.navigate('Login');
      return;
    }

    try {
      await addToCart(user.id, productId, quantity);
      showToast('Ürün sepete eklendi', 'success');
    } catch (error) {
      console.error('Add to cart error:', error);
      showToast('Ürün sepete eklenemedi', 'error');
    }
  };

  const handleToggleFavorite = async (targetId: string = productId) => {
    if (!user) {
      showToast('Lütfen giriş yapın', 'warning');
      // @ts-ignore
      // ✅ DÜZELTME 2: login -> Login
      navigation.navigate('Login');
      return;
    }

    try {
      if (isFavorite(targetId)) {
        await removeFromFavorites(user.id, targetId);
        removeFavorite(targetId);
        if (targetId === productId) showToast('Favorilerden çıkarıldı', 'info');
      } else {
        const favorite = await addToFavorites(user.id, targetId);
        addFavorite(favorite);
        if (targetId === productId) showToast('Favorilere eklendi', 'success');
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
    }
  };

  const handleProductPress = (id: string) => {
    // @ts-ignore
    // ✅ DÜZELTME 3: product -> Product (push kullanılıyor)
    navigation.push('Product', { id });
  };

  const handleReviewsPress = () => {
    // @ts-ignore
    // ✅ DÜZELTME 4: reviews -> Reviews
    navigation.navigate('Reviews', { productId: product.id, productName: product.name });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!product) {
    return null;
  }

  const displayPrice = product.discount_price || product.price;
  const hasDiscount = product.discount_price && product.discount_price < product.price;
  const discountRate = hasDiscount ? Math.round(((product.price - product.discount_price) / product.price) * 100) : 0;
  const isProductFavorite = isFavorite(productId);
  const numericRating = ratingInfo.rating === "Yeni" ? 0 : parseFloat(ratingInfo.rating);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <SafeAreaView style={styles.floatingHeader}>
        <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.iconButtonBlur}
            activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity 
            onPress={() => handleToggleFavorite(productId)} 
            style={styles.iconButtonBlur}
            activeOpacity={0.8}
        >
          <Ionicons
            name={isProductFavorite ? 'heart' : 'heart-outline'}
            size={24}
            color={isProductFavorite ? COLORS.error : COLORS.text}
          />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100 }}
        bounces={false}
      >
        {/* Image Slider */}
        <View style={styles.sliderContainer}>
          <FlatList
            ref={sliderRef}
            data={product.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setSelectedImage(index);
            }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                activeOpacity={1} 
                onPress={() => setZoomVisible(true)}
              >
                <Image
                    source={{ uri: item }}
                    style={styles.mainImage}
                    resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) => index.toString()}
          />
          
          {product.images && product.images.length > 1 && (
            <View style={styles.paginationWrapper}>
                <View style={styles.paginationContainer}>
                {product.images.map((_, index) => (
                    <View
                    key={index}
                    style={[
                        styles.paginationDot,
                        selectedImage === index && styles.paginationDotActive,
                    ]}
                    />
                ))}
                </View>
            </View>
          )}

          <View style={styles.zoomHintBadge}>
            <Ionicons name="expand" size={14} color="#FFF" />
          </View>
        </View>

        {/* Content Sheet */}
        <View style={styles.contentSheet}>
            <View style={styles.handleBar} />
            
            <View style={styles.titleRow}>
                <View style={{ flex: 1 }}>
                    {hasDiscount && (
                        <View style={styles.saleTag}>
                            <Text style={styles.saleTagText}>%{discountRate} İNDİRİM</Text>
                        </View>
                    )}
                    <Text style={styles.productName}>{product.name}</Text>
                    <TouchableOpacity style={styles.ratingContainer} onPress={handleReviewsPress}>
                        <View style={styles.starsRow}>
                             {[...Array(5)].map((_, i) => (
                                <Ionicons 
                                    key={i} 
                                    name={i < Math.floor(numericRating) ? "star" : "star-outline"} 
                                    size={16} 
                                    color={numericRating > 0 ? "#FFD700" : COLORS.textLight} 
                                />
                            ))}
                        </View>
                        <Text style={styles.ratingText}>
                            {ratingInfo.rating} ({ratingInfo.count} Değerlendirme)
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={COLORS.textLight} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Premium Features */}
            <View style={styles.premiumFeaturesContainer}>
                <View style={styles.premiumFeatureItem}>
                    <Ionicons name="diamond-outline" size={22} color={COLORS.text} />
                    <Text style={styles.premiumFeatureText}>%100 Orijinal</Text>
                </View>
                <View style={styles.featureDivider} />
                <View style={styles.premiumFeatureItem}>
                    <Ionicons name="time-outline" size={22} color={COLORS.text} />
                    <Text style={styles.premiumFeatureText}>Hızlı Kargo</Text>
                </View>
                <View style={styles.featureDivider} />
                <View style={styles.premiumFeatureItem}>
                    <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.text} />
                    <Text style={styles.premiumFeatureText}>Garantili</Text>
                </View>
            </View>

            {product.description && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ürün Detayı</Text>
                    <Text style={styles.description}>{product.description}</Text>
                </View>
            )}

            {/* Reviews Summary Button */}
            <TouchableOpacity style={styles.reviewSummaryCard} onPress={handleReviewsPress} activeOpacity={0.8}>
                <View>
                    <Text style={styles.reviewSummaryTitle}>Müşteri Değerlendirmeleri</Text>
                    <View style={styles.reviewSummaryStats}>
                        <Text style={styles.reviewSummaryScore}>{ratingInfo.rating}</Text>
                        <View style={styles.reviewSummaryStars}>
                            {[...Array(5)].map((_, i) => (
                                <Ionicons 
                                    key={i} 
                                    name={i < Math.floor(numericRating) ? "star" : "star-outline"} 
                                    size={14} 
                                    color={numericRating > 0 ? "#FFD700" : COLORS.textLight} 
                                />
                            ))}
                        </View>
                        <Text style={styles.reviewSummaryCount}>{ratingInfo.count} Yorum</Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward-circle" size={32} color={COLORS.primary} />
            </TouchableOpacity>

            {/* Quantity Selector */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Adet</Text>
                <View style={styles.quantityRow}>
                    <View style={styles.quantityControl}>
                        <TouchableOpacity
                            style={styles.qtyButton}
                            onPress={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                            <Ionicons name="remove" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{quantity}</Text>
                        <TouchableOpacity
                            style={styles.qtyButton}
                            onPress={() => {
                                if (quantity < product.stock) {
                                    setQuantity(quantity + 1);
                                } else {
                                    showToast('Stok miktarını aştınız', 'warning');
                                }
                            }}
                        >
                            <Ionicons name="add" size={20} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.stockInfo}>
                        <Text style={styles.stockText}>
                            {product.stock > 0 ? `Stokta ${product.stock} adet` : 'Stok tükendi'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Benzer Ürünler */}
            {similarProducts.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Benzer Ürünler</Text>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.similarProductsList}
                    >
                        {similarProducts.map((item) => (
                            <View key={item.id} style={styles.similarProductWrapper}>
                                <ProductCard
                                    product={item}
                                    onPress={() => handleProductPress(item.id)}
                                    onToggleFavorite={() => handleToggleFavorite(item.id)}
                                />
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceBlock}>
            <Text style={styles.totalLabel}>Toplam Tutar</Text>
            <View style={styles.priceRow}>
                <Text style={styles.finalPrice}>₺{(displayPrice * quantity).toFixed(2)}</Text>
                {hasDiscount && (
                    <Text style={styles.strikePrice}>₺{(product.price * quantity).toFixed(2)}</Text>
                )}
            </View>
        </View>
        <TouchableOpacity 
            style={[styles.addToCartBtn, product.stock === 0 && styles.disabledBtn]}
            onPress={handleAddToCart}
            disabled={product.stock === 0}
            activeOpacity={0.9}
        >
            <Ionicons name="bag-handle" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.addToCartText}>
                {product.stock === 0 ? 'Tükendi' : 'Sepete Ekle'}
            </Text>
        </TouchableOpacity>
      </View>

      {/* Zoom Modal */}
      <Modal visible={zoomVisible} transparent onRequestClose={() => setZoomVisible(false)} animationType="fade">
        <View style={styles.zoomModal}>
          <TouchableOpacity
            style={styles.zoomCloseButton}
            onPress={() => setZoomVisible(false)}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <ScrollView
            maximumZoomScale={3}
            minimumZoomScale={1}
            contentContainerStyle={{ flex: 1, justifyContent: 'center' }}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {product.images && product.images.length > 0 && (
                <Image
                source={{ uri: product.images[selectedImage] }}
                style={styles.zoomImage}
                resizeMode="contain"
                />
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ... styles kısmı değişmedi ...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'android' ? SPACING.xl : 0,
  },
  iconButtonBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.sm,
  },
  sliderContainer: {
    height: IMAGE_HEIGHT,
    width: width,
  },
  mainImage: {
    width: width,
    height: IMAGE_HEIGHT,
  },
  paginationWrapper: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#FFF',
    width: 16,
  },
  zoomHintBadge: {
    position: 'absolute',
    right: SPACING.md,
    bottom: 40,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentSheet: {
    marginTop: -30,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    minHeight: height * 0.6,
    ...SHADOWS.lg,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  titleRow: {
    marginBottom: SPACING.md,
  },
  saleTag: {
    backgroundColor: COLORS.error,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: SPACING.xs,
  },
  saleTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  productName: {
    fontSize: FONT_SIZES.xl + 2,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
    lineHeight: 30,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  // Premium Features
  premiumFeaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: SPACING.lg,
  },
  premiumFeatureItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  premiumFeatureText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  featureDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    lineHeight: 24,
    fontWeight: '400',
  },
  // Review Summary Card
  reviewSummaryCard: {
    backgroundColor: COLORS.backgroundSecondary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  reviewSummaryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  reviewSummaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewSummaryScore: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  reviewSummaryStars: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewSummaryCount: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  // Quantity
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  qtyText: {
    width: 40,
    textAlign: 'center',
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  stockInfo: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stockText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  // Similar Products
  similarProductsList: {
    paddingVertical: 4,
    gap: SPACING.md,
  },
  similarProductWrapper: {
    width: width * 0.42, 
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    ...SHADOWS.lg,
  },
  priceBlock: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  finalPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  strikePrice: {
    fontSize: 14,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
  },
  addToCartBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.md,
  },
  disabledBtn: {
    backgroundColor: COLORS.textLight,
  },
  addToCartText: {
    color: '#FFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  zoomModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  zoomCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  zoomImage: {
    width: width,
    height: height,
  },
});