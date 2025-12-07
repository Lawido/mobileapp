import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { ProductCard } from '../../components/ProductCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { getFavorites, removeFromFavorites, addToFavorites, getProducts, Product } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { COLORS, SPACING, FONT_SIZES, SHADOWS, BORDER_RADIUS } from '../../lib/constants';

const { width } = Dimensions.get('window');

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { favorites, setFavorites, removeFavorite, addFavorite } = useFavoritesStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadFavorites();
      } else {
        setLoading(false);
        setFavorites([]);
      }
      loadSuggestions();
    }, [user])
  );

  const loadFavorites = async () => {
    if (!user) return;
    try {
      if (!refreshing && favorites.length === 0) setLoading(true);
      const data = await getFavorites(user.id);
      setFavorites(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const products = await getProducts();
      const shuffled = products.sort(() => 0.5 - Math.random());
      setSuggestedProducts(shuffled.slice(0, 5));
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFavorites();
    loadSuggestions();
  };

  // Favori Ekleme/Çıkarma
  const handleToggleFavorite = async (targetProductId: string) => {
    if (!user) {
        // @ts-ignore
        // ✅ DÜZELTME 1: login -> Login
        navigation.navigate('Login'); 
        return;
    }

    const isFav = favorites.some(f => f.product_id === targetProductId);

    try {
      if (isFav) {
        await removeFromFavorites(user.id, targetProductId);
        removeFavorite(targetProductId);
      } else {
        const newFav = await addToFavorites(user.id, targetProductId);
        if (newFav) {
            addFavorite(newFav);
        }
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
    }
  };

  // Ürün Detayına Git
  const handleProductPress = (productId: string) => {
    if (!productId) return;
    try {
        // @ts-ignore
        // ✅ DÜZELTME 2: product/[id] -> Product (URL yerine Stack/Screen adı)
        navigation.navigate('Product', { id: productId });
    } catch (e) {
        console.error("Navigasyon hatası:", e);
    }
  };

  // Footer: "Bunları da Beğenebilirsiniz"
  const renderFooter = () => {
    if (suggestedProducts.length === 0) return null;

    return (
      <View style={styles.suggestionsSection}>
        <View style={styles.suggestionsHeader}>
          <Ionicons name="sparkles-outline" size={20} color={COLORS.primary} />
          <Text style={styles.suggestionsTitle}>Bunları da Beğenebilirsiniz</Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsList}
        >
          {suggestedProducts.map((product) => (
            <View key={product.id} style={styles.suggestionCardWrapper}>
              <ProductCard
                product={product}
                onPress={() => handleProductPress(product.id)}
                onToggleFavorite={() => handleToggleFavorite(product.id)}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Header title="Favorilerim" showCart />
        <View style={styles.centerContent}>
          <EmptyState
            icon="heart-outline"
            title="Giriş Yapın"
            description="Favorilerinizi görmek ve yönetmek için lütfen giriş yapın."
          />
          <TouchableOpacity 
            style={styles.loginButton}
            // @ts-ignore
            // ✅ DÜZELTME 3: login -> Login
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading && !refreshing) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <Header title="Favorilerim" showCart />
      
      {favorites.length === 0 ? (
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
        >
          <View style={styles.centerContent}>
            <EmptyState
              icon="heart-dislike-outline"
              title="Listeniz Boş"
              description="Beğendiğiniz ürünleri kalp ikonuna dokunarak buraya ekleyebilirsiniz."
            />
            <TouchableOpacity 
              style={styles.browseButton}
              // @ts-ignore
              // ✅ DÜZELTME 4: categories -> Categories
              onPress={() => navigation.navigate('Categories')}
            >
              <Text style={styles.browseButtonText}>Ürünleri Keşfet</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingBottom: SPACING.xl }}>
             {renderFooter()}
          </View>
        </ScrollView>
      ) : (
        <>
          <View style={styles.headerInfo}>
            <Ionicons name="heart" size={16} color={COLORS.primary} />
            <Text style={styles.headerInfoText}>
              {favorites.length} ürün favorilerinizde
            </Text>
          </View>

          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.productWrapper}>
                {item.product && (
                  <ProductCard
                    product={item.product}
                    onPress={() => handleProductPress(item.product!.id)}
                    // Favori listesindeki kalbe basınca detay sayfasına gitmeden işlem yap
                    onToggleFavorite={(e: any) => {
                        handleToggleFavorite(item.product!.id);
                    }}
                  />
                )}
              </View>
            )}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
            ListFooterComponent={renderFooter}
          />
        </>
      )}
    </View>
  );
}

// ... styles kısmı değişmedi ...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    minHeight: 400, 
  },
  list: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  productWrapper: {
    width: '48%',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md + 4,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.backgroundSecondary,
  },
  headerInfoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    fontWeight: '600',
    marginLeft: SPACING.xs,
  },
  loginButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.sm,
  },
  loginButtonText: {
    color: COLORS.textWhite,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  browseButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
  },
  browseButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  suggestionsSection: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  suggestionsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  suggestionsList: {
    paddingHorizontal: SPACING.xs,
    paddingBottom: SPACING.md,
  },
  suggestionCardWrapper: {
    width: width * 0.42,
    marginRight: SPACING.md,
  },
});