import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../lib/constants';

// Splash Screen & Components
import { SplashScreen } from '../components/SplashScreen';
import { LoadingSpinner } from '../components/LoadingSpinner';

// TAB SCREENS
import HomeScreen from './(tabs)/index';
import CategoriesScreen from './(tabs)/categories';
import FavoritesScreen from './(tabs)/favorites';
import CartScreen from './(tabs)/cart';
import ProfileScreen from './(tabs)/profile';

// STANDART SAYFALAR
import OrdersScreen from './orders';

// AUTH SCREENS
import LoginScreen from './(auth)/login';
import RegisterScreen from './(auth)/register';
import ForgotPasswordScreen from './(auth)/forgot-password';

// PRODUCT SCREENS
import ProductDetailScreen from './product/detail';
import ReviewsScreen from './product/reviews';

// PROFILE SUB-SCREENS
import PersonalInfoScreen from './profile/personal-info';
import AddressScreen from './profile/address';
import HelpScreen from './profile/help';
import OrdersProfileScreen from './profile/orders';
import CouponsScreen from './profile/coupons';

// ADMIN SUB-SCREENS
import AdminDashboard from './admin/dashboard';
import AdminProductsScreen from './admin/products';
import AdminOrdersScreen from './admin/orders';
import AdminCategoriesScreen from './admin/categories';
import AdminSettingsScreen from './admin/settings';
import AdminUsersScreen from './admin/users'; // ✅ YENİ EKRAN

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 1. ADMIN STACK
function AdminStack() {
  return (
    <Stack.Navigator 
      initialRouteName="AdminDashboard"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="AdminProducts" component={AdminProductsScreen} />
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
      <Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
    </Stack.Navigator>
  );
}

// 2. TAB NAVIGATOR
function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'Home': iconName = focused ? 'home' : 'home-outline'; break;
            case 'Categories': iconName = focused ? 'grid' : 'grid-outline'; break;
            case 'Favorites': iconName = focused ? 'heart' : 'heart-outline'; break;
            case 'Cart': iconName = focused ? 'cart' : 'cart-outline'; break;
            case 'Profile': iconName = focused ? 'person' : 'person-outline'; break;
            default: iconName = 'home-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: { 
          backgroundColor: COLORS.background, 
          borderTopColor: COLORS.border, 
          paddingBottom: Platform.OS === 'ios' ? 10 : 5,
          height: Platform.OS === 'ios' ? 90 : 60 
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// 3. ROOT LAYOUT
export default function RootLayout() {
  const { user, isAdmin, setUser, setLoading } = useAuthStore();
  const [isSplashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      if (session?.user) {
        try {
          const { data: profileData } = await supabase.from('profiles').select('full_name, role').eq('id', session.user.id).single();
          const role = profileData?.role || session.user.user_metadata?.role || 'customer';
          setUser({ id: session.user.id, email: session.user.email!, full_name: profileData?.full_name, role: role, created_at: session.user.created_at });
        } catch (error) { setUser(null); }
      } else { setUser(null); }
      setLoading(false); 
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const { data: profileData } = await supabase.from('profiles').select('full_name, role').eq('id', session.user.id).single();
          const role = profileData?.role || session.user.user_metadata?.role || 'customer';
          setUser({ id: session.user.id, email: session.user.email!, full_name: profileData?.full_name, role: role, created_at: session.user.created_at });
        } catch (error) { setUser(null); }
      }
      setLoading(false);
      setSplashVisible(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isSplashVisible) return <SplashScreen onFinish={() => setSplashVisible(false)} />;
  
  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer independent={true}>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }}>
          {user && isAdmin ? (
            <Stack.Screen name="Admin" component={AdminStack} />
          ) : user ? (
            <>
              <Stack.Screen name="Main" component={TabNavigator} />
              <Stack.Screen name="Product" component={ProductDetailScreen} />
              <Stack.Screen name="Reviews" component={ReviewsScreen} />
              <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
              <Stack.Screen name="Address" component={AddressScreen} />
              <Stack.Screen name="Help" component={HelpScreen} />
              <Stack.Screen name="OrdersProfile" component={OrdersProfileScreen} />
              <Stack.Screen name="Coupons" component={CouponsScreen} />
              <Stack.Screen name="Orders" component={OrdersScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}