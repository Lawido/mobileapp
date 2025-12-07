import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFavoritesStore } from "../store/favoritesStore";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../lib/constants";
import { Product } from "../lib/supabase";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - SPACING.md * 3) / 2;
const CARD_IMAGE_HEIGHT = CARD_WIDTH * 1.33;

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onToggleFavorite?: () => void;
  rating?: { rating: string; count: number } | null;
}

export const ProductCard = ({ product, onPress, onToggleFavorite, rating }: ProductCardProps) => {
  const { isFavorite } = useFavoritesStore();
  const isFav = isFavorite(product.id);
  
  const displayPrice = product.discount_price || product.price;
  const hasDiscount = product.discount_price && product.discount_price < product.price;

  return (
    <TouchableOpacity
      style={[styles.card, { width: CARD_WIDTH }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={[styles.imageContainer, { height: CARD_IMAGE_HEIGHT }]}>
        <Image
          source={{ uri: product.images?.[0] || product.image_url }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Favori Butonu */}
        <TouchableOpacity 
          style={styles.favoriteButton} 
          onPress={onToggleFavorite}
        >
          <Ionicons
            name={isFav ? "heart" : "heart-outline"}
            size={22}
            color={isFav ? COLORS.error : COLORS.text}
          />
        </TouchableOpacity>

        {/* İndirim Badge */}
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              %{Math.round(((product.price - product.discount_price!) / product.price) * 100)}
            </Text>
          </View>
        )}

        {/* Rating Overlay */}
        {rating && (
          <View style={styles.ratingOverlay}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.ratingScore}>{rating.rating}</Text>
            <Text style={styles.ratingCount}>({rating.count})</Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>₺{displayPrice.toFixed(2)}</Text>
          {hasDiscount && (
            <Text style={styles.oldPrice}>₺{product.price.toFixed(2)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
    overflow: "hidden",
  },
  imageContainer: { 
    width: "100%", 
    position: "relative", 
    backgroundColor: "#F3F3F3" 
  },
  image: { 
    width: "100%", 
    height: "100%" 
  },

  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.sm,
    zIndex: 10,
  },

  discountBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountText: { 
    color: "#FFF", 
    fontSize: 13, 
    fontWeight: "700" 
  },

  ratingOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    ...SHADOWS.sm,
    zIndex: 9,
  },
  ratingScore: { 
    fontSize: 12, 
    fontWeight: "700",
    color: COLORS.text,
  },
  ratingCount: { 
    fontSize: 10, 
    color: COLORS.textLight 
  },

  details: { 
    padding: SPACING.sm 
  },
  name: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
    minHeight: 34,
    marginBottom: 4,
  },
  priceContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6 
  },
  price: { 
    fontSize: FONT_SIZES.lg, 
    fontWeight: "800",
    color: COLORS.primary,
  },
  oldPrice: {
    fontSize: 13,
    textDecorationLine: "line-through",
    color: COLORS.textLight,
  },
});