import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { ProductCard } from '../../components/ProductCard';
import { SearchBar } from '../../components/SearchBar';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import {
  getProducts,
  getCategories,
  addToFavorites,
  removeFromFavorites,
  getReviews,
  Product,
  Category,
} from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { useToastStore } from '../../store/toastStore';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../lib/constants';

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = 200;

const STORIES = [
  { id: '1', title: 'Çok Satanlar', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80', color: '#FF9F1C' },
  { id: '2', title: 'Yeni Sezon', image: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=400&q=80', color: '#4ECDC4' },
  { id: '3', title: 'İndirim', image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400&q=80', color: '#FF6B6B' },
  { id: '4', title: 'Kolyeler', image: 'https://images.unsplash.com/photo-1599643478518-17488fbbcd75?w=400&q=80', color: '#FFE66D' },
  { id: '5', title: 'Yüzükler', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80', color: '#1A535C' },
  { id: '6', title: 'Hediye', image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80', color: '#2EC4B6' },
];

const BANNERS = [
  { id: '1', title: 'Işıltını Keşfet', subtitle: "%20'ye varan indirim", buttonText: 'İncele', icon: 'diamond-outline' as keyof typeof Ionicons.glyphMap, color: '#D4AF37', accentColor: '#FFF' },
  { id: '2', title: 'Zarafet Hediyesi', subtitle: 'Kargo Bedava', buttonText: 'Fırsat', icon: 'gift-outline' as keyof typeof Ionicons.glyphMap, color: COLORS.primary, accentColor: '#FFF' },
  { id: '3', title: 'Özel Tasarımlar', subtitle: 'El İşçiliği', buttonText: 'Keşfet', icon: 'star-outline' as keyof typeof Ionicons.glyphMap, color: '#A0785A', accentColor: '#FFF' },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuthStore();
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();
  const { showToast } = useToastStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, { rating: string, count: number }>>({});
  const [storyModalVisible, setStoryModalVisible] = useState(false);
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const autoScrollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // @ts-ignore
    if (route.params?.categoryId) {
      // @ts-ignore
      const catId = route.params.categoryId;
      setSelectedCategory(catId);
      loadData(catId);
      navigation.setParams({ categoryId: null });
    } else {
      loadData(selectedCategory);
    }
  }, [route.params]);

  useEffect(() => {
    startAutoScroll();
    return () => stopAutoScroll();
  }, []);

  const startAutoScroll = () => {
    if (autoScrollInterval.current) return;
    autoScrollInterval.current = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % BANNERS.length;
        scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
        return nextIndex;
      });
    }, 5000);
  };

  const stopAutoScroll = () => {
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / width);
    setActiveIndex(newIndex);
  };

  const loadData = async (categoryId: string | null = null) => {
    if (!refreshing) setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(categoryId),
        getCategories(),
      ]);
      
      setProducts(productsData);
      setCategories(categoriesData);
      setSelectedCategory(categoryId);
      fetchRatings(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Veriler yüklenirken hata oluştu', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRatings = async (productsList: Product[]) => {
    const newRatings: Record<string, { rating: string, count: number }> = {};
    await Promise.all(productsList.map(async (product) => {
        try {
          const reviews = await getReviews(product.id);
          if (reviews && reviews.length > 0) {
              const total = reviews.reduce((sum, r) => sum + r.rating, 0);
              const avg = (total / reviews.length).toFixed(1);
              newRatings[product.id] = { rating: avg, count: reviews.length };
          }
        } catch (error) {
          console.error('Error fetching reviews:', error);
        }
    }));
    setRatings(newRatings);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData(selectedCategory);
  };

  const handleCategoryPress = (categoryId: string) => {
    const newCategory = selectedCategory === categoryId ? null : categoryId;
    loadData(newCategory);
  };

  const handleStoryPress = (story: any) => {
    setSelectedStory(story);
    setStoryModalVisible(true);
  };

  const handleToggleFavorite = async (productId: string) => {
    if (!user) {
      // @ts-ignore
      // ✅ DÜZELTME 1: login -> Login
      navigation.navigate('Login');
      showToast('Favorilere eklemek için giriş yapın', 'info');
      return;
    }
    
    try {
      if (isFavorite(productId)) {
        await removeFromFavorites(user.id, productId);
        removeFavorite(productId);
        showToast('Favorilerden çıkarıldı', 'info');
      } else {
        const favorite = await addToFavorites(user.id, productId);
        addFavorite(favorite);
        showToast('Favorilere eklendi ❤️', 'success');
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
      showToast('Bir hata oluştu', 'error');
    }
  };

  if (loading && !refreshing) {
    return <LoadingSpinner />;
  }

  const getCategoryIcon = (name: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      'Yüzükler': 'ellipse-outline',
      'Kolyeler': 'prism-outline',
      'Küpeler': 'flower-outline',
      'Bilezikler': 'radio-button-on-outline',
      'Broşlar': 'star-outline',
    };
    return iconMap[name] || 'diamond-outline';
  };

  return (
    <View style={styles.container}>
      <Header title="Enxh Jewelry" showCart showSearch onSearchPress={() => setShowSearch(!showSearch)} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
        {showSearch && (
          <View style={styles.searchContainer}>
             <SearchBar value={searchQuery} onChangeText={(text) => { setSearchQuery(text); if (text === '') loadData(selectedCategory); }} onClear={() => { setSearchQuery(''); loadData(selectedCategory); }} />
          </View>
        )}

        {/* Stories */}
        <View style={styles.storiesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesContent}>
            {STORIES.map((story) => (
              <TouchableOpacity key={story.id} style={styles.storyItem} activeOpacity={0.8} onPress={() => handleStoryPress(story)}>
                <View style={[styles.storyRing, { borderColor: story.color }]}>
                  <View style={styles.storyImageContainer}>
                    <Image source={{ uri: story.image }} style={styles.storyImage} />
                  </View>
                </View>
                <Text style={styles.storyTitle} numberOfLines={1}>{story.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Banner Slider */}
        <View style={styles.bannerWrapper}>
          <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={handleScroll} onTouchStart={stopAutoScroll} onTouchEnd={startAutoScroll} scrollEventThrottle={16} style={styles.bannerScroll}>
            {BANNERS.map((banner) => (
              <View key={banner.id} style={styles.bannerContainer}>
                <View style={[styles.bannerCard, { backgroundColor: banner.color }]}>
                  <View style={styles.bannerContent}>
                    <Text style={[styles.bannerSubtitle, { color: banner.accentColor }]}>{banner.subtitle.toUpperCase()}</Text>
                    <Text style={[styles.bannerTitle, { color: banner.accentColor }]}>{banner.title}</Text>
                    <TouchableOpacity style={[styles.bannerButton, { backgroundColor: banner.accentColor }]}>
                      <Text style={[styles.bannerButtonText, { color: banner.color }]}>{banner.buttonText}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.bannerIconContainer}>
                    <Ionicons name={banner.icon} size={90} color="rgba(255,255,255,0.25)" />
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.paginationContainer}>
            {BANNERS.map((_, index) => (<View key={index} style={[styles.paginationDot, activeIndex === index ? styles.activeDot : null]} />))}
          </View>
        </View>

        {/* Kategoriler */}
        <View style={styles.sectionCategory}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Koleksiyonlar</Text>
            <TouchableOpacity onPress={() => handleCategoryPress('')}><Text style={styles.seeAllText}>Tümünü Gör</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
            {categories.map((category) => {
              const isSelected = selectedCategory === category.id;
              return (
                <TouchableOpacity key={category.id} style={[styles.categoryCard, isSelected && styles.selectedCategoryCard]} onPress={() => handleCategoryPress(category.id)} activeOpacity={0.8}>
                  <View style={[styles.categoryIconContainer, isSelected && styles.selectedCategoryIconContainer]}>
                    <Ionicons name={getCategoryIcon(category.name)} size={24} color={isSelected ? COLORS.primary : COLORS.textLight} />
                  </View>
                  <Text style={[styles.categoryName, isSelected && styles.selectedCategoryText]} numberOfLines={1}>{category.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Ürünler Grid */}
        <View style={[styles.section, styles.productsSection]}>
          <View style={styles.sectionHeader}>
             <Text style={styles.sectionTitle}>{searchQuery ? 'Arama Sonuçları' : selectedCategory ? 'Seçili Kategori' : 'Öne Çıkanlar'}</Text>
          </View>
         
          {products.length === 0 ? (
            <EmptyState icon="diamond-outline" title="Ürün Bulunamadı" description="Bu kriterlere uygun ürünümüz kalmamış olabilir." />
          ) : (
            <View style={styles.productGrid}>
              {products.map((product) => {
                const ratingData = ratings[product.id];
                return (
                  <View key={product.id} style={styles.productWrapper}>
                    <ProductCard
                      product={product}
                      // @ts-ignore
                      // ✅ DÜZELTME 2: product -> Product
                      onPress={() => navigation.navigate('Product', { id: product.id })}
                      onToggleFavorite={() => handleToggleFavorite(product.id)}
                      rating={ratingData}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Hikaye Modal */}
      <Modal visible={storyModalVisible} transparent={true} animationType="fade" onRequestClose={() => setStoryModalVisible(false)}>
        <View style={styles.storyModalContainer}>
            <StatusBar barStyle="light-content" backgroundColor="black" />
            <SafeAreaView style={styles.storySafeArea}>
              <TouchableOpacity style={styles.storyCloseButton} onPress={() => setStoryModalVisible(false)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Ionicons name="close" size={32} color="#FFF" />
              </TouchableOpacity>
              {selectedStory && (
                <View style={styles.storyContent}>
                   <View style={styles.storyProgressBar}>
                      <View style={[styles.storyProgressFill, { backgroundColor: selectedStory.color }]} />
                   </View>
                   <Image source={{ uri: selectedStory.image }} style={styles.storyFullImage} resizeMode="cover" />
                   <View style={styles.storyOverlay}>
                      <Text style={styles.storyFullTitle}>{selectedStory.title}</Text>
                      <TouchableOpacity style={[styles.storyActionButton, { backgroundColor: selectedStory.color }]} onPress={() => setStoryModalVisible(false)}>
                          <Text style={styles.storyActionText}>Ürünleri Gör</Text>
                          <Ionicons name="arrow-forward" size={16} color="#FFF" />
                      </TouchableOpacity>
                   </View>
                </View>
              )}
            </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

// ... styles kısmı değişmedi ...

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  scrollView: { flex: 1 },
  searchContainer: { paddingVertical: SPACING.sm },
  storiesContainer: { paddingVertical: SPACING.md, backgroundColor: COLORS.backgroundSecondary },
  storiesContent: { paddingHorizontal: SPACING.md, gap: SPACING.lg },
  storyItem: { alignItems: 'center', gap: 6, width: 70 },
  storyRing: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, alignItems: 'center', justifyContent: 'center', padding: 2 },
  storyImageContainer: { width: '100%', height: '100%', borderRadius: 34, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.backgroundSecondary },
  storyImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  storyTitle: { fontSize: 11, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  bannerWrapper: { height: BANNER_HEIGHT, marginBottom: SPACING.md, marginTop: SPACING.xs },
  bannerScroll: { height: BANNER_HEIGHT },
  bannerContainer: { width: width, paddingHorizontal: SPACING.md, height: BANNER_HEIGHT - 20 },
  bannerCard: { flex: 1, flexDirection: 'row', borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, alignItems: 'center', justifyContent: 'space-between', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, overflow: 'hidden' },
  bannerContent: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', zIndex: 2 },
  bannerIconContainer: { position: 'absolute', right: -10, bottom: -20, zIndex: 1, transform: [{ rotate: '-15deg' }] },
  bannerSubtitle: { fontSize: FONT_SIZES.xs, fontWeight: '700', letterSpacing: 1, marginBottom: 4, opacity: 0.9 },
  bannerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '800', marginBottom: SPACING.md, lineHeight: 28 },
  bannerButton: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: BORDER_RADIUS.full, ...SHADOWS.sm },
  bannerButtonText: { fontSize: FONT_SIZES.sm, fontWeight: '700' },
  paginationContainer: { position: 'absolute', bottom: 0, width: '100%', height: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  paginationDot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 4, backgroundColor: COLORS.textLight, opacity: 0.5 },
  activeDot: { width: 18, backgroundColor: COLORS.primary, opacity: 1 },
  section: { paddingVertical: SPACING.sm, marginBottom: SPACING.lg },
  sectionCategory: { paddingVertical: SPACING.xs, marginBottom: SPACING.md },
  productsSection: { paddingTop: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.text, letterSpacing: 0.5 },
  seeAllText: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.primary },
  categoryList: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  categoryCard: { flexDirection: 'row', alignItems: 'center', marginRight: SPACING.sm, backgroundColor: COLORS.textWhite, paddingVertical: 8, paddingHorizontal: 12, borderRadius: BORDER_RADIUS.lg, shadowColor: COLORS.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' },
  selectedCategoryCard: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryIconContainer: { marginRight: 6 },
  selectedCategoryIconContainer: {},
  categoryName: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.text },
  selectedCategoryText: { color: COLORS.textWhite },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: SPACING.md, rowGap: SPACING.lg },
  productWrapper: { width: '48%', position: 'relative' },
  storyModalContainer: { flex: 1, backgroundColor: '#000' },
  storySafeArea: { flex: 1 },
  storyCloseButton: { position: 'absolute', top: Platform.OS === 'android' ? 40 : 20, right: 20, zIndex: 20, padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },
  storyContent: { flex: 1, width: width, height: '100%', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  storyFullImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  storyOverlay: { position: 'absolute', bottom: 60, left: 20, right: 20, zIndex: 10 },
  storyFullTitle: { fontSize: 32, fontWeight: '800', color: '#FFF', textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 10, marginBottom: 20 },
  storyProgressBar: { position: 'absolute', top: 10, left: 10, right: 10, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, zIndex: 15 },
  storyProgressFill: { width: '100%', height: '100%', borderRadius: 2 },
  storyActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: BORDER_RADIUS.full, gap: 8 },
  storyActionText: { color: '#FFF', fontWeight: '700', fontSize: FONT_SIZES.md },
});