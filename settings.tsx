import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Alert,
  Switch,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
} from 'react-native';

import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';

// ✅ IMPORT YOLLARI
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Button } from '../../components/Button';
import { getSiteSettingsAdmin, updateSiteSettings, SiteSettings } from '../../lib/supabase'; 
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../lib/constants';

export default function AdminSettingsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State başlangıç değerleri
  const [settings, setSettings] = useState<Partial<SiteSettings>>({
    site_name: '',
    site_description: '',
    contact_email: '',
    contact_phone: '',
    iban_number: '',
    bank_name: '',
    account_holder: '',
    tax_office: '',
    tax_number: '',
    maintenance_mode: false,
    free_shipping_limit: 500, 
    shipping_fee: 29.90, 
  });

  // Ayarları Yükle
  const loadSettings = useCallback(async () => {
    try {
      const data = await getSiteSettingsAdmin();
      
      // Veritabanından gelen verileri State'e eşle
      setSettings({
        site_name: data.site_name || '',
        site_description: data.site_description || '',
        contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '',
        iban_number: data.iban_number || '',
        bank_name: data.bank_name || '',
        account_holder: data.account_holder || '',
        tax_office: data.tax_office || '',
        tax_number: data.tax_number || '',
        // Boolean kontrolü (String gelirse booleana çevir)
        maintenance_mode: data.maintenance_mode === true || String(data.maintenance_mode) === 'true',
        // Sayısal kontrol
        free_shipping_limit: Number(data.free_shipping_threshold || data.free_shipping_limit || 0), 
        shipping_fee: Number(data.shipping_fee || 0),
      });
    } catch (error) {
      console.error("Ayarlar yüklenirken hata:", error);
      Alert.alert('Hata', 'Ayarlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  // Ayarları Kaydet
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Gönderilecek veriyi hazırla
      const dataToSave = {
        ...settings,
        // Sayısal değerleri number olarak gönder (lib/supabase.ts bunları string'e çevirecek)
        free_shipping_limit: Number(settings.free_shipping_limit) || 0,
        shipping_fee: Number(settings.shipping_fee) || 0,
        // Boolean değeri kesinleştir
        maintenance_mode: settings.maintenance_mode === true,
      };
      
      await updateSiteSettings(dataToSave);
      Alert.alert("Başarılı", "Site ayarları güncellendi.");
    } catch (error: any) {
      console.error("Ayar kaydetme hatası:", error);
      // Detaylı hata mesajı
      const msg = error.message || "Bilinmeyen bir hata oluştu.";
      if (msg.includes("permission denied")) {
        Alert.alert("Yetki Hatası", "Bu ayarları değiştirmek için veritabanı izniniz yok. Lütfen SQL panelinden RLS politikalarını güncelleyin.");
      } else {
        Alert.alert("Hata", "Ayarlar kaydedilemedi: " + msg);
      }
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const handleBack = () => navigation.goBack();

  const updateField = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Site Ayarları</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* SİSTEM AYARLARI (En üste alındı) */}
          <View style={[styles.section, styles.highlightSection]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={22} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Sistem Durumu</Text>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Bakım Modu</Text>
                <Text style={styles.switchDesc}>Aktifken site müşterilere kapanır.</Text>
              </View>
              <Switch
                value={settings.maintenance_mode}
                onValueChange={(val) => updateField("maintenance_mode", val)}
                trackColor={{ false: "#E0E0E0", true: COLORS.primary }}
                thumbColor={"#FFF"}
              />
            </View>

            {settings.maintenance_mode && (
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={18} color="#FF9F1C" />
                <Text style={styles.warningText}>
                  Dikkat: Site şu an bakım modunda.
                </Text>
              </View>
            )}
          </View>

          {/* GENEL BİLGİLER */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={22} color={COLORS.text} />
              <Text style={styles.sectionTitle}>Genel Bilgiler</Text>
            </View>
            
            <Text style={styles.label}>Site Adı</Text>
            <TextInput
              style={styles.input}
              value={settings.site_name}
              onChangeText={(t) => updateField("site_name", t)}
              placeholder="Örn: Enxh Jewelry"
            />

            <Text style={styles.label}>Site Açıklaması</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={settings.site_description}
              onChangeText={(t) => updateField("site_description", t)}
              multiline
              numberOfLines={3}
              placeholder="Site hakkında kısa bilgi..."
            />

            <View style={styles.row}>
                <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>E-posta</Text>
                    <TextInput
                    style={styles.input}
                    value={settings.contact_email}
                    onChangeText={(t) => updateField("contact_email", t)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>Telefon</Text>
                    <TextInput
                    style={styles.input}
                    value={settings.contact_phone}
                    onChangeText={(t) => updateField("contact_phone", t)}
                    keyboardType="phone-pad"
                    />
                </View>
            </View>
          </View>

          {/* KARGO AYARLARI */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube-outline" size={22} color={COLORS.text} />
              <Text style={styles.sectionTitle}>Kargo & Teslimat</Text>
            </View>

            <View style={styles.row}>
                <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>Ücretsiz Limit (₺)</Text>
                    <TextInput
                        style={styles.input}
                        value={String(settings.free_shipping_limit)}
                        onChangeText={(t) => updateField("free_shipping_limit", t)}
                        keyboardType="numeric"
                    />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>Kargo Ücreti (₺)</Text>
                    <TextInput
                        style={styles.input}
                        value={String(settings.shipping_fee)}
                        onChangeText={(t) => updateField("shipping_fee", t)}
                        keyboardType="numeric"
                    />
                </View>
            </View>
          </View>

          {/* BANKA BİLGİLERİ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={22} color={COLORS.text} />
              <Text style={styles.sectionTitle}>Banka Bilgileri (Havale)</Text>
            </View>

            <Text style={styles.label}>Banka Adı</Text>
            <TextInput
              style={styles.input}
              value={settings.bank_name}
              onChangeText={(t) => updateField("bank_name", t)}
            />

            <Text style={styles.label}>IBAN</Text>
            <TextInput
              style={styles.input}
              value={settings.iban_number}
              onChangeText={(t) => updateField("iban_number", t)}
              placeholder="TR..."
            />

            <Text style={styles.label}>Hesap Sahibi</Text>
            <TextInput
              style={styles.input}
              value={settings.account_holder}
              onChangeText={(t) => updateField("account_holder", t)}
            />
          </View>

          <Button
            title={saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            onPress={handleSave}
            loading={saving}
            style={{ marginVertical: 20 }}
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 15, 
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' 
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  backButton: { padding: 5 },
  content: { padding: 20 },
  
  // Section Styles
  section: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
    borderWidth: 1, borderColor: '#F0F0F0'
  },
  highlightSection: { borderColor: COLORS.primary + '40', borderWidth: 1.5 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  
  // Input Styles
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 10 },
  input: { 
    backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E0E0E0', 
    borderRadius: 10, padding: 12, fontSize: 14, color: '#333' 
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  
  // Switch & Warning
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  switchDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  warningBox: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', 
    padding: 10, borderRadius: 8, marginTop: 10, gap: 8 
  },
  warningText: { fontSize: 13, color: '#F57C00', fontWeight: '600', flex: 1 },
});