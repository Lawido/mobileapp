// ==========================================
// store/favoritesStore.ts
// ==========================================
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Favorite } from '../lib/supabase';

interface FavoritesState {
  favorites: Favorite[];
  setFavorites: (favorites: Favorite[]) => void;
  addFavorite: (favorite: Favorite) => void;
  removeFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string, favorite?: Favorite) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      
      setFavorites: (favorites) => {
        console.log('💖 Setting favorites:', favorites.length);
        set({ favorites });
      },
      
      addFavorite: (favorite) => {
        console.log('➕ Adding favorite:', favorite.product_id);
        set((state) => ({ 
          favorites: [...state.favorites, favorite] 
        }));
      },
      
      removeFavorite: (productId) => {
        console.log('➖ Removing favorite:', productId);
        set((state) => ({
          favorites: state.favorites.filter((f) => f.product_id !== productId),
        }));
      },
      
      isFavorite: (productId) => {
        const { favorites } = get();
        const exists = favorites.some((f) => f.product_id === productId);
        return exists;
      },
      
      toggleFavorite: (productId, favorite) => {
        const { favorites } = get();
        const exists = favorites.some((f) => f.product_id === productId);
        
        if (exists) {
          set({
            favorites: favorites.filter((f) => f.product_id !== productId),
          });
        } else if (favorite) {
          set({
            favorites: [...favorites, favorite],
          });
        }
      },
    }),
    {
      name: 'favorites-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);