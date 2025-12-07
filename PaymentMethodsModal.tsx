import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS, FONT_SIZES } from '../lib/constants';

interface PaymentMethodsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PaymentMethodsModal = ({ visible, onClose }: PaymentMethodsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [bankInfo, setBankInfo] = useState({
    bank_name: 'Yükleniyor...',
    account_holder: 'Yükleniyor...',
    iban_number: 'TR..'
  });

  useEffect(() => {
    let subscription: any;

    if (visible) {
      fetchBankSettings();

      // Gerçek zamanlı güncelleme dinleyicisi (site_settings tablosu için)
      const channel = supabase
        .channel('site_settings_changes')
        .on(
          'postgres_changes',
          {
            event: '*', 
            schema: 'public',
            table: 'site_settings', // Tablo adı düzeltildi
          },
          (payload) => {
            console.log('Değişiklik algılandı, veriler güncelleniyor...', payload);
            fetchBankSettings(false);
          }
        )
        .subscribe();

      subscription = channel;
    }

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [visible]);

  const fetchBankSettings = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // Tablo adı site_settings olarak güncellendi
      const { data, error } = await supabase
        .from('site_settings') 
        .select('*')
        .in('key', ['bank_name', 'account_holder', 'iban_number']);

      if (!error && data) {
        const settings: any = {};
        data.forEach(item => {
          settings[item.key] = item.value;
        });
        
        setBankInfo({
            bank_name: settings.bank_name || 'Banka Adı Girilmemiş',
            account_holder: settings.account_holder || 'Alıcı Girilmemiş',
            iban_number: settings.iban_number || 'TR..'
        });
      }
    } catch (err) {
      console.error('Banka bilgileri çekilemedi:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBankSettings(false);
    setRefreshing(false);
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Başarılı', `${label} kopyalandı.`);
  };

  const handleCreditCardPress = () => {
    Alert.alert('Bilgi', 'Kredi Kartı ile ödeme altyapımız çok yakında hizmetinizde olacaktır.');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Ödeme Yöntemleri</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            contentContainerStyle={styles.content} 
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
            }
          >
            
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <>
                    {/* 1. BANKA BİLGİLERİ */}
                    <View style={styles.infoCard}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="business-outline" size={24} color={COLORS.primary} />
                            <Text style={styles.cardTitle}>Banka Bilgileri (Havale/EFT)</Text>
                        </View>
                        
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Banka:</Text>
                            <Text style={styles.infoValue}>{bankInfo.bank_name}</Text>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.copyableRow}
                            onPress={() => copyToClipboard(bankInfo.account_holder, 'Alıcı ismi')}
                        >
                            <Text style={styles.infoLabel}>Alıcı:</Text>
                            <View style={styles.rowWithIcon}>
                                <Text style={styles.infoValue}>{bankInfo.account_holder}</Text>
                                <Ionicons name="copy-outline" size={16} color={COLORS.primary} style={{marginLeft:6}} />
                            </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.ibanBox}
                            onPress={() => copyToClipboard(bankInfo.iban_number, 'IBAN')}
                        >
                            <View>
                                <Text style={styles.ibanLabel}>IBAN</Text>
                                <Text style={styles.ibanText}>{bankInfo.iban_number}</Text>
                            </View>
                            <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                        
                        <View style={styles.noteBox}>
                            <Ionicons name="information-circle-outline" size={16} color={COLORS.textLight} />
                            <Text style={styles.noteText}>
                                Havale/EFT işlemlerinizde açıklama kısmına sipariş numaranızı yazmayı unutmayınız.
                            </Text>
                        </View>
                    </View>

                    {/* 2. KAPIDA ÖDEME */}
                    <View style={styles.infoCard}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconBg, { backgroundColor: '#FFF3E0' }]}>
                                <Ionicons name="home-outline" size={20} color="#E65100" />
                            </View>
                            <Text style={styles.cardTitle}>Kapıda Ödeme</Text>
                        </View>
                        <Text style={styles.descText}>
                            Siparişiniz adresinize ulaştığında kargo görevlisine <Text style={{fontWeight:'700'}}>nakit</Text> veya <Text style={{fontWeight:'700'}}>kredi kartı</Text> ile ödeme yapabilirsiniz.
                        </Text>
                    </View>

                    {/* 3. KREDİ KARTI */}
                    <TouchableOpacity 
                        style={styles.infoCard} 
                        onPress={handleCreditCardPress}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconBg, { backgroundColor: '#F3E5F5' }]}>
                                <Ionicons name="card-outline" size={20} color="#7B1FA2" />
                            </View>
                            <View style={{flex:1}}>
                                <Text style={styles.cardTitle}>Kredi / Banka Kartı</Text>
                            </View>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>Yakında</Text>
                            </View>
                        </View>
                        <Text style={styles.descText}>
                            Online kredi kartı ile güvenli ödeme altyapımız çok yakında hizmetinizde olacaktır.
                        </Text>
                    </TouchableOpacity>

                </>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#f3f4f6', // backgroundSecondary yerine manuel renk (tema uyumlu)
    borderRadius: 20,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: 60,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  infoCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  infoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 8 
  },
  copyableRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 8, 
    alignItems: 'center' 
  },
  rowWithIcon: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  infoLabel: { 
    color: COLORS.textLight, 
    fontSize: 14 
  },
  infoValue: { 
    color: COLORS.text, 
    fontSize: 14, 
    fontWeight: '600' 
  },
  ibanBox: { 
    backgroundColor: '#f9fafb', // Açık gri arka plan
    padding: SPACING.md, 
    borderRadius: BORDER_RADIUS.md, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginVertical: SPACING.sm, 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  ibanLabel: { 
    fontSize: 10, 
    color: COLORS.textLight, 
    fontWeight: '700' 
  },
  ibanText: { 
    fontSize: 15, 
    color: COLORS.primary, 
    fontWeight: '700', 
    letterSpacing: 0.5 
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  noteText: {
    fontSize: 12,
    color: COLORS.textLight,
    flex: 1,
    fontStyle: 'italic',
  },
  descText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7B1FA2',
  },
});