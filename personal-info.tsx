import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TextInput, 
  Alert, 
  TouchableOpacity, 
  ScrollView,
  Platform,
  Modal,
  Pressable
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../lib/constants';

export default function PersonalInfoScreen() {
  const navigation = useNavigation();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    birthDate: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const genderOptions = [
    { value: 'male', label: 'Erkek', icon: 'male' },
    { value: 'female', label: 'Kadın', icon: 'female' },
    { value: 'other', label: 'Belirtmek İstemiyorum', icon: 'help-circle-outline' },
  ];

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setForm({
          fullName: profile.full_name || '',
          email: user.email || '',
          phone: profile.phone || '',
          gender: profile.gender || '',
          birthDate: profile.birth_date || '',
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveProfile = async () => {
    if (!form.fullName) {
      Alert.alert('Hata', 'Ad Soyad boş bırakılamaz.');
      return;
    }

    setLoading(true);
    try {
      // Profili güncelle
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.fullName,
          phone: form.phone,
          gender: form.gender || null,
          birth_date: form.birthDate || null,
        })
        .eq('id', user!.id);

      if (error) throw error;

      // Auth metadata güncelle
      await supabase.auth.updateUser({
        data: { full_name: form.fullName }
      });

      if (user) {
        setUser({ 
          ...user, 
          full_name: form.fullName,
          user_metadata: { ...user.user_metadata, full_name: form.fullName }
        });
      }

      Alert.alert('Başarılı', 'Bilgileriniz güncellendi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', 'Güncelleme sırasında bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    Alert.alert(
      'E-posta Değiştir',
      'E-posta değişikliği için lütfen destek ekibiyle iletişime geçin.',
      [{ text: 'Tamam' }]
    );
  };

  const handleChangePassword = () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }

    Alert.alert(
      'Şifre Değiştir',
      'Şifrenizi değiştirmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Değiştir',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase.auth.updateUser({
                password: passwordForm.newPassword
              });

              if (error) throw error;

              Alert.alert('Başarılı', 'Şifreniz değiştirildi.');
              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'Şifre değiştirilemedi.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getGenderLabel = (value: string) => {
    const option = genderOptions.find(opt => opt.value === value);
    return option ? option.label : 'Seçiniz';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kişisel Bilgiler</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profil Bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil Bilgileri</Text>

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
            <Text style={styles.label}>E-posta</Text>
            <View style={styles.inputWithButton}>
              <TextInput
                style={[styles.input, styles.inputDisabled, { flex: 1 }]}
                value={form.email}
                editable={false}
              />
              <TouchableOpacity style={styles.changeButton} onPress={handleChangeEmail}>
                <Text style={styles.changeButtonText}>Değiştir</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
              placeholder="+90 555 123 4567"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cinsiyet</Text>
            <TouchableOpacity 
              style={styles.selectInput} 
              onPress={() => setGenderModalVisible(true)}
            >
              <Text style={form.gender ? styles.selectInputText : styles.selectInputPlaceholder}>
                {getGenderLabel(form.gender)}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Doğum Tarihi</Text>
            <TextInput
              style={styles.input}
              value={form.birthDate}
              onChangeText={(text) => setForm({ ...form, birthDate: text })}
              placeholder="GG/AA/YYYY"
            />
            <Text style={styles.helpText}>Örn: 01/01/1990</Text>
          </View>

          <Button 
            title="Kaydet" 
            onPress={handleSaveProfile} 
            loading={loading} 
            style={{ marginTop: SPACING.md }} 
          />
        </View>

        {/* Şifre Değiştir */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Şifre Değiştir</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Yeni Şifre</Text>
            <TextInput
              style={styles.input}
              value={passwordForm.newPassword}
              onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
              placeholder="En az 6 karakter"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Yeni Şifre (Tekrar)</Text>
            <TextInput
              style={styles.input}
              value={passwordForm.confirmPassword}
              onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
              placeholder="Şifrenizi tekrar girin"
              secureTextEntry
            />
          </View>

          <Button 
            title="Şifre Değiştir" 
            onPress={handleChangePassword} 
            variant="outline"
            style={{ marginTop: SPACING.md }} 
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Cinsiyet Modal */}
      <Modal
        visible={genderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGenderModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setGenderModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cinsiyet Seçin</Text>
            {genderOptions.map((option) => (
              <Pressable
                key={option.value}
                style={styles.modalOption}
                onPress={() => {
                  setForm({ ...form, gender: option.value });
                  setGenderModalVisible(false);
                }}
              >
                <Ionicons name={option.icon as any} size={24} color={COLORS.primary} />
                <Text style={styles.modalOptionText}>{option.label}</Text>
                {form.gender === option.value && (
                  <Ionicons name="checkmark" size={24} color={COLORS.primary} style={{ marginLeft: 'auto' }} />
                )}
              </Pressable>
            ))}
            <Pressable style={styles.modalCancel} onPress={() => setGenderModalVisible(false)}>
              <Text style={styles.modalCancelText}>İptal</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.backgroundSecondary 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: SPACING.md, 
    paddingTop: Platform.OS === 'ios' ? 60 : SPACING.xl + 10,
    paddingBottom: SPACING.md, 
    backgroundColor: COLORS.background, 
    ...SHADOWS.sm 
  },
  headerTitle: { 
    fontSize: FONT_SIZES.lg, 
    fontWeight: '700', 
    color: COLORS.text 
  },
  backButton: { 
    padding: 8 
  },
  content: { 
    padding: SPACING.md 
  },
  section: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  inputGroup: { 
    marginBottom: SPACING.md 
  },
  label: { 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.text, 
    marginBottom: 8, 
    fontWeight: '600' 
  },
  input: { 
    backgroundColor: COLORS.backgroundSecondary, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: BORDER_RADIUS.md, 
    paddingHorizontal: SPACING.md, 
    paddingVertical: 12, 
    fontSize: FONT_SIZES.md, 
    color: COLORS.text 
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputWithButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  changeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
  },
  changeButtonText: {
    color: '#FFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  selectInputText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  selectInputPlaceholder: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
  },
  helpText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundSecondary,
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  modalOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  modalCancel: {
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  modalCancelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textLight,
  },
});