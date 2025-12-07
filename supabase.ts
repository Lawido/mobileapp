import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Database } from './database.types'; // Eğer dosya adı farklıysa güncelleyin

// Varsayalım ki database.types dosyanız var
export interface Database {} // Eğer dosya yoksa burayı boş bırakın

const supabaseUrl = 'https://gdwwpoiuzghmhjfjbbgy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkd3dwb2l1emdobWhqZmpiYmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MTgzOTEsImV4cCI6MjA3OTk5NDM5MX0.KFEjKktLmfUckDXxlPkPFBPi6vkPnGR3aOCwyAC7pdk';

// ✅ KALICI SESSION İÇİN ASYNCSTORAGE
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-react-native',
    },
  },
});

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'customer' | 'admin' | 'banned';
  created_at: string;
  user_metadata?: {
    full_name?: string;
    role?: string;
  };
}

export interface Profile {
  id: string;
  full_name?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  birth_date?: string;
  role?: 'customer' | 'admin' | 'banned';
  created_at: string;
  updated_at: string;
}

export interface UserAddress {
  id?: string;
  user_id: string;
  full_name: string;
  phone?: string;
  city: string;
  address: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  image_url?: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  discount_price?: number;
  stock: number;
  category_id: string;
  image_url?: string;
  images: string[];
  is_featured: boolean;
  is_active: boolean;
  sku?: string;
  weight?: number;
  dimensions?: string;
  material?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  order_code: string;
  status: 'PAYMENT_PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURN_REQUESTED' | 'RETURN_APPROVED' | 'RETURNED';
  payment_method: 'credit_card' | 'bank_transfer' | 'cash_on_delivery';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  total_amount: number;
  shipping_address: any;
  tracking_number?: string;
  notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  order_items: OrderItem[];
  profiles?: {
    full_name: string;
    email: string;
    phone: string;
  };
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  discount_price?: number;
  product_snapshot?: any;
  created_at: string;
  product?: Product;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  order_id?: string;
  rating: number;
  comment?: string;
  is_verified: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export interface SiteSettings {
  site_name?: string;
  site_description?: string;
  contact_email?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  iban_number?: string;
  bank_name?: string;
  account_holder?: string;
  tax_office?: string;
  tax_number?: string;
  free_shipping_limit?: number; // Kodda kullanılan ad
  shipping_fee?: number;
  bank_transfer_discount?: number;
  maintenance_mode?: boolean;
  currency?: string;
  currency_symbol?: string;
  // Supabase'den gelen anahtar adları
  free_shipping_threshold?: number; 
}

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  usage_limit?: number;
  used_count: number;
  valid_from?: string;
  valid_until?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==========================================
// RESİM YÜKLEME (STORAGE) - YENİ EKLENDİ
// ==========================================

export const uploadProductImage = async (uri: string) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });

    // Dosya adı benzersiz olmalı
    const fileName = `product_${Date.now()}.jpg`;

    // 'products' bucket'ına yükle (Supabase Storage'da bu bucket olmalı ve public olmalı)
    const { data, error } = await supabase.storage
      .from('products') 
      .upload(fileName, arrayBuffer as ArrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error("Storage upload error:", error);
      throw error;
    }
    
    // Public URL'i al
    const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(fileName);
    return publicUrlData.publicUrl;

  } catch (error) {
    console.error("Resim yükleme hatası:", error);
    return null; 
  }
};

// ==========================================
// AUTH İŞLEMLERİ
// ==========================================

export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'customer',
      },
    },
  });

  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'enxh://reset-password',
  });

  if (error) throw error;
  return data;
};

// Admin tarafından şifre sıfırlama tetiklemesi (YENİ)
export const adminSendPasswordReset = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
  return true;
};

// ==========================================
// KULLANICI YÖNETİMİ
// ==========================================

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as Profile;
};

export const updateUserProfile = async (userId: string, profile: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(profile)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Admin Kullanıcı Listesi (YENİ)
export const getAllUsersAdmin = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles') 
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('getAllUsersAdmin hatası:', error);
    throw error;
  }
};

// Kullanıcı Yasaklama (Admin - YENİ)
export const adminBanUser = async (userId: string) => {
  // Profili güncelle - Rolü 'banned' yap
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'banned' })
    .eq('id', userId);

  if (error) throw error;
};

// ==========================================
// ADRES YÖNETİMİ
// ==========================================

export const getUserAddress = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Kayıt yok hatasını yoksay
  return data as UserAddress | null;
};

export const saveUserAddress = async (address: Omit<UserAddress, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('user_addresses')
    .upsert({ ...address, is_default: true })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ==========================================
// KATEGORİ İŞLEMLERİ
// ==========================================

export const getCategories = async () => {
  console.log('📞 Calling getCategories...');
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Categories error:', error);
    throw error;
  }
  return data as Category[];
};

export const addCategory = async (category: Partial<Category>) => {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCategory = async (id: string, category: Partial<Category>) => {
  const { data, error } = await supabase
    .from('categories')
    .update(category)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCategory = async (id: string) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ==========================================
// ÜRÜN İŞLEMLERİ
// ==========================================

// Müşteri tarafı (Sadece aktif ürünler)
export const getProducts = async (categoryId?: string | null) => {
  let query = supabase
    .from('products')
    .select('*')
    .eq('is_active', true);

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Products error:', error);
    throw error;
  }
  return data as Product[];
};

// Admin tarafı (Tüm ürünler - YENİ)
export const getAllProductsAdmin = async (categoryId?: string | null) => {
    let query = supabase
      .from('products')
      .select('*'); // is_active filtresi yok

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Products (Admin) error:', error);
      // RLS hatasını yakala ve fırlat
      if (error.code === '42501') {
          throw new Error("Erişim Reddedildi. Admin RLS politikasını kontrol edin.");
      }
      throw error;
    }
    
    return data as Product[];
};

export const getProductById = async (id: string) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Product;
};

export const addProduct = async (product: Partial<Product>) => {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProduct = async (id: string, product: Partial<Product>) => {
  const { data, error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getLowStockProducts = async (threshold: number = 10) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .lte('stock', threshold)
    .eq('is_active', true)
    .order('stock', { ascending: true });

  if (error) throw error;
  return data;
};

// ==========================================
// SEPET VE FAVORİ İŞLEMLERİ
// ==========================================

export const getCartItems = async (userId: string) => {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`*, product:products(*)`)
    .eq('user_id', userId);

  if (error) throw error;
  return data as CartItem[];
};

export const addToCart = async (userId: string, productId: string, quantity: number = 1) => {
  const { data: existing } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('cart_items')
      .insert({ user_id: userId, product_id: productId, quantity })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const updateCartItemQuantity = async (cartItemId: string, quantity: number) => {
  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', cartItemId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const removeFromCart = async (cartItemId: string) => {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', cartItemId);

  if (error) throw error;
};

export const clearCart = async (userId: string) => {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
};

export const getFavorites = async (userId: string) => {
  const { data, error } = await supabase
    .from('favorites')
    .select(`*, product:products(*)`)
    .eq('user_id', userId);

  if (error) throw error;
  return data as Favorite[];
};

export const addToFavorites = async (userId: string, productId: string) => {
  const { data, error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, product_id: productId })
    .select()
    .single();

  if (error) throw error;
  return data as Favorite;
};

export const removeFromFavorites = async (userId: string, productId: string) => {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);

  if (error) throw error;
};

// ==========================================
// SİPARİŞ YÖNETİMİ
// ==========================================

export const createOrder = async (
  userId: string,
  orderCode: string,
  totalAmount: number,
  shippingAddress: any,
  paymentMethod: string,
  items: CartItem[]
) => {
  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      order_code: orderCode,
      total_amount: totalAmount,
      subtotal: totalAmount,
      shipping_address: shippingAddress,
      payment_method: paymentMethod,
      status: 'PAYMENT_PENDING',
      payment_status: 'pending',
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Create order items
  const orderItems = items.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    price: item.product?.price || 0,
    discount_price: item.product?.discount_price,
    product_snapshot: item.product,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw itemsError;

  return order;
};

export const getUserOrders = async (userId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items(*, product:products(*))`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Order[];
};

export const getAllOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items(*, product:products(*))`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Order[];
};

export const createReturnRequest = async (orderId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ 
      status: 'RETURN_REQUESTED',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ==========================================
// ADMIN ORDER MANAGEMENT FUNCTIONS
// ==========================================

export async function getAllOrdersAdmin() {
  try {
    // 1️⃣ Önce siparişleri al
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id, user_id, order_code, status, total_amount, subtotal, 
        shipping_cost, discount_amount, created_at, updated_at,
        payment_status, payment_method, shipped_at, delivered_at, 
        tracking_number, shipping_address, notes, admin_notes,
        order_items (
          id, quantity, price, product_snapshot
        )
      `)
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;
    if (!orders || orders.length === 0) return [];

    // 2️⃣ Benzersiz user_id'leri topla
    const uniqueUserIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))];

    if (uniqueUserIds.length === 0) return orders;

    // 3️⃣ Profilleri ayrı sorguda çek
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', uniqueUserIds);

    if (profilesError) {
      console.warn('⚠️ Profiles yüklenemedi:', profilesError);
      return orders; // Profil hatası varsa sadece siparişleri döndür
    }

    // 4️⃣ Siparişlere profil bilgilerini manuel ekle
    const ordersWithProfiles = orders.map(order => ({
      ...order,
      profiles: profiles?.find(p => p.id === order.user_id) || null
    }));

    return ordersWithProfiles;

  } catch (error) {
    console.error('❌ getAllOrdersAdmin hatası:', error);
    throw error;
  }
}

export async function updateOrderStatus(
  orderId: string, 
  status: string, 
  trackingNumber?: string
) {
  const updateData: any = { 
    status,
    updated_at: new Date().toISOString() 
  };

  if (trackingNumber) {
    updateData.tracking_number = trackingNumber;
  }

  // Durum değişikliklerine göre timestamp ve tracking number ekle
  if (status === 'SHIPPED') {
    updateData.shipped_at = new Date().toISOString();
    if (trackingNumber && trackingNumber.trim()) {
      updateData.tracking_number = trackingNumber.trim();
    }
  }
  
  if (status === 'DELIVERED') {
    updateData.delivered_at = new Date().toISOString();
  }
  
  if (status === 'PROCESSING') {
    // Ödeme onaylandı olarak işaretle
    updateData.payment_status = 'paid';
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTrackingNumber(orderId: string, trackingNumber: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({ 
      tracking_number: trackingNumber.trim(),
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getReturnRequests() {
  try {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id, user_id, order_code, status, total_amount, created_at, 
        tracking_number, shipping_address,
        order_items (
          id, quantity, price, product_snapshot
        )
      `)
      .eq('status', 'RETURN_REQUESTED')
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;
    if (!orders || orders.length === 0) return [];

    const uniqueUserIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))];
    
    if (uniqueUserIds.length === 0) return orders;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .in('id', uniqueUserIds);

    return orders.map(order => ({
      ...order,
      profiles: profiles?.find(p => p.id === order.user_id) || null
    }));

  } catch (error) {
    console.error('❌ getReturnRequests hatası:', error);
    throw error;
  }
}

// ==========================================
// REVIEW FUNCTIONS
// ==========================================

export const getReviews = async (productId: string) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const reviewsWithUserNames = await Promise.all(
    data.map(async (review) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', review.user_id)
        .single();
      
      return {
        ...review,
        user_name: profile?.full_name || 'Kullanıcı',
      };
    })
  );

  return reviewsWithUserNames as Review[];
};

export const addReview = async (review: Partial<Review>) => {
  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ==========================================
// SITE SETTINGS FUNCTIONS (Admin Düzeltmesi)
// ==========================================

export const getSiteSettings = async () => {
  console.log('📞 Calling getSiteSettings...');
  
  const { data, error } = await supabase
    .from('site_settings')
    .select('*');

  if (error) {
    console.error('❌ Site settings error:', error);
    throw error;
  }

  const settings: any = {};
  data.forEach(setting => {
    settings[setting.key] = setting.value;
  });

  const finalSettings: SiteSettings = {
    // Değerleri doğru parse etme
    site_name: settings.site_name,
    site_description: settings.site_description,
    contact_email: settings.contact_email,
    contact_phone: settings.contact_phone,
    whatsapp_number: settings.whatsapp_number,
    iban_number: settings.iban_number,
    bank_name: settings.bank_name,
    account_holder: settings.account_holder,
    tax_office: settings.tax_office,
    tax_number: settings.tax_number,
    free_shipping_limit: parseFloat(settings.free_shipping_threshold || '0'),
    shipping_fee: parseFloat(settings.shipping_fee || '0'),
    bank_transfer_discount: parseFloat(settings.bank_transfer_discount || '0'),
    maintenance_mode: settings.maintenance_mode === 'true', 
    currency: settings.currency,
    currency_symbol: settings.currency_symbol,
    free_shipping_threshold: parseFloat(settings.free_shipping_threshold || '0'),
  };
  return finalSettings;
};

export const getSiteSettingsAdmin = async () => {
    return getSiteSettings(); 
};

export const updateSiteSettings = async (settings: Partial<SiteSettings>) => {
  const updates = Object.entries(settings).map(([key, value]) => {
    const stringValue = typeof value === 'boolean' ? String(value) : String(value);
    
    let dbKey = key;
    if (key === 'free_shipping_limit') dbKey = 'free_shipping_threshold'; 

    return {
      key: dbKey,
      value: stringValue,
    };
  });

  const { error } = await supabase
    .from('site_settings')
    .upsert(updates, { onConflict: 'key' }); 

  if (error) throw error;
};

// ==========================================
// ADMIN STATS FUNCTIONS
// ==========================================

export const getAdminStats = async () => {
  const [ordersCount, productsCount, usersCount, revenueData] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('total_amount').eq('payment_status', 'paid'), 
  ]);

  const totalRevenue = revenueData.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

  return {
    totalOrders: ordersCount.count || 0,
    totalProducts: productsCount.count || 0,
    totalUsers: usersCount.count || 0,
    totalRevenue,
  };
};