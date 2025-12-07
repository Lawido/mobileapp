import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Sepet Elemanı Tipi
export interface CartItem {
  id: string;
  product_id: string;
  title: string;
  price: number;
  image_url: string | null;
  quantity: number;
  stock_quantity: number; // Stok kontrolü için
}

interface CartState {
  items: CartItem[];
  totalAmount: number; // İndirimsiz Toplam
  finalAmount: number; // Ödenecek Tutar
  discountAmount: number; // İndirim Tutarı
  appliedCouponCode: string | null;

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  
  // Kupon İşlemleri
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  recalculateTotals: () => void;
  
  // Dışarıdan veri yükleme (Veri yükleme hatasını çözer)
  setItems: (items: CartItem[]) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalAmount: 0,
      finalAmount: 0,
      discountAmount: 0,
      appliedCouponCode: null,

      setItems: (items) => {
        set({ items });
        get().recalculateTotals();
      },

      addItem: (newItem) => {
        const { items } = get();
        const existingItem = items.find((item) => item.product_id === newItem.product_id);

        if (existingItem) {
          const updatedItems = items.map((item) =>
            item.product_id === newItem.product_id
              ? { ...item, quantity: item.quantity + newItem.quantity }
              : item
          );
          set({ items: updatedItems });
        } else {
          set({ items: [...items, newItem] });
        }
        get().recalculateTotals();
      },

      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        }));
        get().recalculateTotals();
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
        get().recalculateTotals();
      },

      clearCart: () => {
        set({ 
          items: [], 
          totalAmount: 0, 
          finalAmount: 0, 
          discountAmount: 0, 
          appliedCouponCode: null 
        });
      },

      applyCoupon: async (code) => {
        try {
          const { items } = get();
          
          if (items.length === 0) {
            return { success: false, message: 'Sepetiniz boş.' };
          }

          // Güncel sepet tutarı
          const currentTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

          // Veritabanından kuponu sorgula
          const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single();

          if (error || !data) {
            return { success: false, message: 'Geçersiz kupon kodu.' };
          }

          // --- ALT LİMİT KONTROLÜ ---
          if (data.min_spend_amount > 0 && currentTotal < data.min_spend_amount) {
            return { 
              success: false, 
              message: `Bu kupon ${data.min_spend_amount} TL ve üzeri alışverişlerde geçerlidir.` 
            };
          }

          set({ 
            discountAmount: Number(data.discount_amount), 
            appliedCouponCode: data.code 
          });
          
          get().recalculateTotals();
          return { success: true, message: 'Kupon uygulandı!' };

        } catch (err) {
          return { success: false, message: 'Hata oluştu.' };
        }
      },

      removeCoupon: () => {
        set({ discountAmount: 0, appliedCouponCode: null });
        get().recalculateTotals();
      },

      recalculateTotals: () => {
        const { items, discountAmount, appliedCouponCode } = get();
        
        // Stoğu biten ürünleri toplam fiyata dahil etmeyebiliriz (isteğe bağlı).
        // Şimdilik stok 0 olsa bile fiyata dahil ediyoruz ama ödemede engelleyeceğiz.
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Eğer kupon uygulanmışsa ama sepet tutarı altına düşmüşse kuponu kaldırabiliriz
        // Ancak şimdilik sadece indirimi toplam tutarla sınırlıyoruz.
        const validDiscount = Math.min(discountAmount, total);
        
        set({
          totalAmount: total,
          finalAmount: Math.max(0, total - validDiscount),
          discountAmount: validDiscount
        });
      }
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);