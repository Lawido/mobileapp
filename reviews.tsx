import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../lib/constants';
import { getReviews, Review } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';

export default function ReviewsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const productId = params.productId as string;
  const productName = params.productName as string;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [ratingStats, setRatingStats] = useState({ 
    average: 0, 
    count: 0, 
    distribution: [0, 0, 0, 0, 0] 
  });

  useEffect(() => {
    if (productId) {
      fetchReviews();
    } else {
      setLoading(false);
    }
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const data = await getReviews(productId);
      setReviews(data);
      
      if (data.length > 0) {
        const total = data.reduce((sum, r) => sum + r.rating, 0);
        const avg = total / data.length;
        
        const dist = [0, 0, 0, 0, 0];
        data.forEach(r => {
          const starIndex = 5 - Math.floor(r.rating);
          if (starIndex >= 0 && starIndex < 5) {
            dist[starIndex]++;
          }
        });
        
        setRatingStats({
          average: parseFloat(avg.toFixed(1)),
          count: data.length,
          distribution: dist
        });
      }
    } catch (error) {
      console.error('Yorumlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Değerlendirmeler</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {reviews.length === 0 ? (
             <EmptyState 
                icon="chatbubble-outline" 
                title="Henüz Değerlendirme Yok" 
                description="Bu ürün için ilk değerlendirmeyi siz yapabilirsiniz." 
             />
        ) : (
            <>
                {/* Özet Kartı */}
                <View style={styles.summaryCard}>
                    <View style={styles.ratingBigContainer}>
                        <Text style={styles.ratingBigText}>{ratingStats.average}</Text>
                        <View style={styles.ratingStarsColumn}>
                            <View style={styles.starsRow}>
                                {[...Array(5)].map((_, i) => (
                                    <Ionicons 
                                        key={i} 
                                        name={i < Math.floor(ratingStats.average) ? "star" : "star-outline"} 
                                        size={14} 
                                        color="#FFD700" 
                                    />
                                ))}
                            </View>
                            <Text style={styles.ratingCountText}>{ratingStats.count} Değerlendirme</Text>
                        </View>
                    </View>
                    
                    {/* İlerleme Çubukları */}
                    <View style={styles.progressContainer}>
                        {[5, 4, 3, 2, 1].map((star, index) => {
                            const count = ratingStats.distribution[index];
                            const percentage = ratingStats.count > 0 ? (count / ratingStats.count) * 100 : 0;
                            return (
                                <View key={star} style={styles.progressRow}>
                                    <Text style={styles.starLabel}>{star}</Text>
                                    <Ionicons name="star" size={10} color={COLORS.textLight} style={{marginRight: 4}} />
                                    <View style={styles.progressBarBg}>
                                        <View 
                                            style={[
                                                styles.progressBarFill, 
                                                { width: `${percentage}%` }
                                            ]} 
                                        />
                                    </View>
                                    <Text style={styles.countLabel}>{count}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Yorumlar Listesi */}
                <View style={styles.reviewsList}>
                    {reviews.map((item) => (
                        <View key={item.id} style={styles.reviewItem}>
                            <View style={styles.reviewHeader}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {item.user_name ? item.user_name.charAt(0).toUpperCase() : 'U'}
                                    </Text>
                                </View>
                                <View style={styles.userInfo}>
                                    <Text style={styles.userName}>{item.user_name}</Text>
                                    {item.is_verified && (
                                        <View style={styles.verifiedBadge}>
                                            <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                                            <Text style={styles.verifiedText}>Ürünü Satın Aldı</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                            </View>
                            
                            <View style={styles.starRating}>
                                {[...Array(5)].map((_, i) => (
                                    <Ionicons 
                                        key={i} 
                                        name={i < item.rating ? "star" : "star-outline"} 
                                        size={12} 
                                        color="#FFD700" 
                                    />
                                ))}
                            </View>
                            
                            <Text style={styles.commentText}>{item.comment}</Text>
                        </View>
                    ))}
                </View>
            </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingTop: Platform.OS === 'android' ? SPACING.xl : SPACING.lg,
      paddingBottom: SPACING.md,
      backgroundColor: COLORS.background,
      ...SHADOWS.sm,
  },
  backButton: {
      padding: 8,
  },
  headerTitle: {
      fontSize: FONT_SIZES.lg,
      fontWeight: '700',
      color: COLORS.text,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  summaryCard: {
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  ratingBigContainer: {
    alignItems: 'center',
    paddingRight: SPACING.lg,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    marginRight: SPACING.lg,
  },
  ratingBigText: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 56,
  },
  ratingStarsColumn: {
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  ratingCountText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  progressContainer: {
    flex: 1,
    gap: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starLabel: {
    fontSize: 12,
    color: COLORS.text,
    width: 10,
    fontWeight: '600',
  },
  countLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    marginLeft: 6,
    width: 20,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: "#FFD700",
    borderRadius: 3,
  },
  reviewsList: {
    gap: SPACING.md,
  },
  reviewItem: {
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  starRating: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: SPACING.sm,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
});