import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { getCategories, getProducts, Category } from '../../lib/supabase';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../lib/constants';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.md * 3) / 2;

export default function CategoriesScreen() {
  const navigation = useNavigation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGender, setSelectedGender] = useState<'all' | 'women' | 'men'>('all');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCategories();
  };

  const getCategoryIcon = (name: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      'Yüzükler': 'ellipse',
      'Kolyeler': 'leaf',
      'Küpeler': 'headset',
      'Bilezikler': 'watch',
      'Broşlar': 'flower',
    };
    return iconMap[name] || 'diamond';
  };

  const handleCategoryPress = async (categoryId: string, categoryName: string) => {
    try {
      const products = await getProducts(categoryId);
      // Ana sayfaya kategoriye göre filtrelenmiş ürünler ile git
      // ✅ DÜZELTME 1: home -> Home
      // @ts-ignore
      navigation.navigate('Home', { categoryId, categoryName });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <Header title="Kategoriler" showCart />
      
      {/* Gender Filter */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, selectedGender === 'all' && styles.filterButtonActive]}
          onPress={() => setSelectedGender('all')}
        >
          <Text style={[styles.filterText, selectedGender === 'all' && styles.filterTextActive]}>
            Tümü
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, selectedGender === 'women' && styles.filterButtonActive]}
          onPress={() => setSelectedGender('women')}
        >
          <Ionicons
            name="woman"
            size={18}
            color={selectedGender === 'women' ? COLORS.textWhite : COLORS.text}
          />
          <Text style={[styles.filterText, selectedGender === 'women' && styles.filterTextActive]}>
            Kadın
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, selectedGender === 'men' && styles.filterButtonActive]}
          onPress={() => setSelectedGender('men')}
        >
          <Ionicons
            name="man"
            size={18}
            color={selectedGender === 'men' ? COLORS.textWhite : COLORS.text}
          />
          <Text style={[styles.filterText, selectedGender === 'men' && styles.filterTextActive]}>
            Erkek
          </Text>
        </TouchableOpacity>
      </View>

      {categories.length === 0 ? (
        <EmptyState
          icon="grid-outline"
          title="Henüz kategori yok"
          description="Yakında kategoriler eklenecek"
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
        >
          <View style={styles.grid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category.id, category.name)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryIconContainer}>
                  <Ionicons
                    name={getCategoryIcon(category.name)}
                    size={40}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
                <View style={styles.categoryArrow}>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={24} color={COLORS.primary} />
            <Text style={styles.infoBannerText}>
              Her kategoride özel tasarımlar sizi bekliyor
            </Text>
          </View>
        </ScrollView>
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundSecondary,
    gap: SPACING.xs,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterTextActive: {
    color: COLORS.textWhite,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    position: 'relative',
    ...SHADOWS.md,
  },
  categoryIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  categoryName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  categoryArrow: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
});
