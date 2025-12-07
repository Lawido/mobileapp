// store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Profile, supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setUser: (user: User | null) => Promise<void>;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,
      isAdmin: false,
      
      setUser: async (user) => {
        console.log('✅ Setting user:', user?.email);
        
        if (user) {
          // Profile bilgisini çek
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            
            if (error) {
              console.error('❌ Profile fetch error:', error);
            }
            
            const isAdmin = profile?.role === 'admin';
            console.log('👤 User role:', profile?.role, '| isAdmin:', isAdmin);
            
            set({ 
              user, 
              profile,
              isAuthenticated: true, 
              isLoading: false,
              isAdmin
            });
          } catch (error) {
            console.error('❌ Error fetching profile:', error);
            set({ 
              user, 
              profile: null,
              isAuthenticated: true, 
              isLoading: false,
              isAdmin: false
            });
          }
        } else {
          set({ 
            user: null, 
            profile: null,
            isAuthenticated: false, 
            isLoading: false,
            isAdmin: false
          });
        }
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      logout: () => {
        console.log('🚪 Logging out');
        set({ 
          user: null, 
          profile: null,
          isAuthenticated: false,
          isAdmin: false
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin
      }),
    }
  )
);