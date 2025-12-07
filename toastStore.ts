// ==========================================
// store/toastStore.ts
// ==========================================
import { create } from 'zustand';

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'info',
  
  showToast: (message, type = 'info') => {
    console.log('🔔 Showing toast:', message, type);
    set({ visible: true, message, type });
    
    // 3 saniye sonra otomatik kapat
    setTimeout(() => {
      set({ visible: false });
    }, 3000);
  },
  
  hideToast: () => {
    console.log('❌ Hiding toast');
    set({ visible: false });
  },
}));