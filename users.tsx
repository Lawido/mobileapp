import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Text, Pressable, Modal, ScrollView, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { getAllUsersAdmin, adminSendPasswordReset, adminBanUser } from '../../lib/supabase';
import { COLORS, SHADOWS } from '../../lib/constants';

interface UserData { id: string; email: string; full_name?: string; role: 'customer' | 'admin' | 'banned'; created_at: string; phone?: string; }

export default function AdminUsersScreen() {
  const navigation = useNavigation();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const loadUsers = async () => {
    try { const data = await getAllUsersAdmin(); setUsers(data || []); } 
    catch (e: any) { Alert.alert('Hata', e.message); } 
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const copyId = async (id: string) => { await Clipboard.setStringAsync(id); Alert.alert("Kopyalandı", "Kullanıcı ID panoya kopyalandı."); };

  const handleReset = async () => {
    if(!selectedUser) return;
    try { await adminSendPasswordReset(selectedUser.email); Alert.alert("Başarılı", "Şifre sıfırlama e-postası gönderildi."); } 
    catch(e: any) { Alert.alert("Hata", e.message); }
  };

  const handleBan = async () => {
    if(!selectedUser) return;
    try { await adminBanUser(selectedUser.id); Alert.alert("Başarılı", "Kullanıcı yasaklandı."); setDetailVisible(false); loadUsers(); } 
    catch(e: any) { Alert.alert("Hata", e.message); }
  };

  const renderItem = ({ item }: { item: UserData }) => (
    <Pressable style={styles.card} onPress={() => { setSelectedUser(item); setDetailVisible(true); }}>
      <View style={styles.iconBox}><Ionicons name={item.role === 'admin' ? 'shield-checkmark' : 'person'} size={24} color={COLORS.primary} /></View>
      <View style={{flex: 1}}>
        <Text style={styles.name}>{item.full_name || 'İsimsiz'}</Text>
        <Text style={styles.email}>{item.email}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: item.role === 'admin' ? COLORS.primary : '#4ECDC4' }]}>
        <Text style={styles.badgeText}>{item.role === 'admin' ? 'YÖNETİCİ' : 'MÜŞTERİ'}</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} /></Pressable>
        <Text style={styles.headerTitle}>Kullanıcılar ({users.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} /> : <FlatList data={users} renderItem={renderItem} contentContainerStyle={{ padding: 15 }} />}

      <Modal visible={detailVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Kullanıcı Detayı</Text>
                <Pressable onPress={() => setDetailVisible(false)}><Ionicons name="close" size={28} /></Pressable>
            </View>
            {selectedUser && (
                <ScrollView>
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        <View style={styles.avatar}><Text style={styles.avatarText}>{selectedUser.email[0].toUpperCase()}</Text></View>
                        <Text style={styles.detailName}>{selectedUser.full_name || 'İsimsiz'}</Text>
                        <View style={[styles.badge, {marginTop: 5, backgroundColor: selectedUser.role === 'admin' ? COLORS.primary : '#4ECDC4'}]}><Text style={styles.badgeText}>{selectedUser.role.toUpperCase()}</Text></View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>E-posta</Text><Text style={styles.value}>{selectedUser.email}</Text>
                        <Text style={styles.label}>Telefon</Text><Text style={styles.value}>{selectedUser.phone || 'Girilmemiş'}</Text>
                        <Text style={styles.label}>Kayıt Tarihi</Text><Text style={styles.value}>{new Date(selectedUser.created_at).toLocaleDateString('tr-TR')}</Text>
                        
                        <TouchableOpacity style={{ marginTop: 15 }} onPress={() => copyId(selectedUser.id)}>
                            <Text style={styles.label}>Kullanıcı ID (Kopyala)</Text>
                            <Text style={[styles.value, { color: COLORS.primary }]}>{selectedUser.id}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[styles.btn, { borderColor: COLORS.primary }]} onPress={handleReset}>
                            <Ionicons name="key-outline" size={20} color={COLORS.primary} /><Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Şifreyi Sıfırla</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, { borderColor: 'red' }]} onPress={handleBan}>
                            <Ionicons name="ban-outline" size={20} color="red" /><Text style={{ color: 'red', fontWeight: 'bold' }}>Kullanıcıyı Yasakla</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#FFF', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, marginBottom: 10, borderRadius: 12, alignItems: 'center', ...SHADOWS.sm },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  name: { fontSize: 16, fontWeight: 'bold' },
  email: { fontSize: 13, color: '#666' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  modalContent: { flex: 1, backgroundColor: '#FFF', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { fontSize: 32, color: '#FFF', fontWeight: 'bold' },
  detailName: { fontSize: 20, fontWeight: 'bold' },
  section: { backgroundColor: '#F9F9F9', padding: 20, borderRadius: 12, marginBottom: 20 },
  label: { fontSize: 12, color: '#888', marginBottom: 2, marginTop: 10 },
  value: { fontSize: 16, fontWeight: '500' },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 10, borderWidth: 1, gap: 8 }
});