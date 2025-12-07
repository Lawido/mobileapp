import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { getUserAddress, saveUserAddress } from '../../lib/supabase';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../lib/constants';

export default function AddressScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    city: '',
    address: '',
  });

  useEffect(() => {
    loadAddress();
  }, []);

  const loadAddress = async () => {
    if (!user) return;
    try {
      const data = await getUserAddress(user.id);
      if (data) {
        setForm({
            fullName: data.full_name || '',
            phone: data.phone || '',
            city: data.city || '',
            address: data.address || '',
        });
      } else {
        setForm(prev => ({ ...prev, fullName: user.full_name || '' }));
      }
    } catch (error) {
      console.error('Error loading address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.fullName || !form.address || !form.city) {
      Alert.alert('Eksik Bilgi', 'Lütfen zorunlu alanları doldurun.');
      return;
    }

    setSaving(true);
    try {
      await saveUserAddress({
        user_id: user!.id,
        full_name: form.fullName,
        phone: form.phone,
        city: form.city,
        address: form.address,
      });
      Alert.alert('Başarılı', 'Adresiniz kaydedildi.', [
          { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Adres kaydedilirken bir sorun oluştu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Teslimat Adresi</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
                Buraya kaydettiğiniz adres, siparişlerinizde varsayılan teslimat adresi olarak kullanılacaktır.
            </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ad Soyad *</Text>
          <TextInput
            style={styles.input}
            value={form.fullName}
            onChangeText={(text) => setForm({ ...form, fullName: text })}
            placeholder="Adınız Soyadınız"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telefon</Text>
          <TextInput
            style={styles.input}
            value={form.phone}
            onChangeText={(text) => setForm({ ...form, phone: text })}
            placeholder="05XX..."
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Şehir *</Text>
          <TextInput
            style={styles.input}
            value={form.city}
            onChangeText={(text) => setForm({ ...form, city: text })}
            placeholder="İl"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Açık Adres *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.address}
            onChangeText={(text) => setForm({ ...form, address: text })}
            placeholder="Mahalle, Sokak, Bina No, Kapı No..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <Button 
          title="Adresi Kaydet" 
          onPress={handleSave} 
          loading={saving} 
          style={{ marginTop: SPACING.md }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingTop: 60, paddingBottom: SPACING.md, backgroundColor: COLORS.background, ...SHADOWS.sm },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: '700', color: COLORS.text },
  backButton: { padding: 8 },
  content: { padding: SPACING.lg },
  infoBox: { flexDirection: 'row', backgroundColor: COLORS.primary + '10', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.lg, gap: SPACING.sm },
  infoText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.text, lineHeight: 20 },
  inputGroup: { marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZES.sm, color: COLORS.textLight, marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: FONT_SIZES.md, color: COLORS.text },
  textArea: { height: 100 },
});