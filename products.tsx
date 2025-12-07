import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, ScrollView, StyleSheet, Text, Pressable, Image, Alert, Modal, TextInput, Platform, Switch, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

// SADECE GÜVENLİ İMPORTLAR (Button kaldırıldı, yerine TouchableOpacity kullanıldı)
import { getAllProductsAdmin, deleteProduct, addProduct, updateProduct, getCategories, Product, uploadProductImage } from '../../lib/supabase';
import { COLORS, SHADOWS } from '../../lib/constants';

export default function AdminProductsScreen() {
  const navigation = useNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState<any>({ name: '', description: '', price: '', discount_price: '', stock: '', category_id: '', image_url: '', is_featured: false, is_active: true });

  const loadData = useCallback(async () => {
    try {
      // Fonksiyon isminin doğru olduğundan emin oluyoruz
      const [p, c] = await Promise.all([getAllProductsAdmin(), getCategories()]);
      setProducts(p || []);
      setCategories(c || []);
      if(c?.length > 0 && !form.category_id) setForm((prev: any) => ({...prev, category_id: c[0].id}));
    } catch(e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("İzin", "Galeri izni gerekli.");
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!res.canceled) {
      setUploading(true);
      const url = await uploadProductImage(res.assets[0].uri);
      if (url) { setForm((prev: any) => ({ ...prev, image_url: url })); Alert.alert("Başarılı", "Resim yüklendi."); } 
      else Alert.alert("Hata", "Yükleme başarısız.");
      setUploading(false);
    }
  };

  const exportExcel = async () => {
    try {
      const data = products.map(p => ({ ID: p.id, Ad: p.name, Fiyat: p.price, Stok: p.stock, Durum: p.is_active ? 'Aktif' : 'Pasif' }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Urunler");
      const base64 = XLSX.write(wb, { type: "base64" });
      const uri = FileSystem.documentDirectory + "urunler.xlsx";
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(uri);
    } catch (e) { Alert.alert("Hata", "Excel oluşturulamadı."); }
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return Alert.alert("Hata", "Ad ve Fiyat zorunlu.");
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) || 0 };
      if (editingId) await updateProduct(editingId, payload);
      else await addProduct(payload);
      setModalVisible(false); loadData(); Alert.alert("Başarılı", "Kaydedildi.");
    } catch (e: any) { Alert.alert("Hata", e.message); } finally { setSaving(false); }
  };

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image_url || 'https://via.placeholder.com/100' }} style={styles.img} />
      <View style={{ flex: 1, paddingHorizontal: 10 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>₺{item.price}</Text>
        <Text style={{ color: item.stock < 5 ? 'red' : 'green' }}>Stok: {item.stock}</Text>
      </View>
      <View style={{ gap: 10 }}>
        <Pressable onPress={() => { setEditingId(item.id); setForm({ ...item, price: String(item.price), stock: String(item.stock) }); setModalVisible(true); }}>
          <Ionicons name="pencil" size={20} color="blue" />
        </Pressable>
        <Pressable onPress={async () => { await deleteProduct(item.id); loadData(); }}>
          <Ionicons name="trash" size={20} color="red" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} /></Pressable>
        <Text style={styles.title}>Ürünler ({products.length})</Text>
        <View style={{ flexDirection: 'row', gap: 15 }}>
          <Pressable onPress={exportExcel}><Ionicons name="download-outline" size={24} /></Pressable>
          <Pressable onPress={() => { setEditingId(null); setForm({ name: '', price: '', stock: '', category_id: categories[0]?.id || '', image_url: '', is_active: true }); setModalVisible(true); }}>
            <Ionicons name="add-circle" size={28} color={COLORS.primary} />
          </Pressable>
        </View>
      </View>

      <FlatList data={products} renderItem={renderItem} keyExtractor={i => i.id} contentContainerStyle={{ padding: 10 }} />

      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHead}>
            <Text style={styles.title}>{editingId ? 'Düzenle' : 'Ekle'}</Text>
            <Pressable onPress={() => setModalVisible(false)}><Ionicons name="close" size={28} /></Pressable>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.label}>Ürün Adı *</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({ ...form, name: t })} />
            
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Fiyat (₺) *</Text>
                <TextInput style={styles.input} value={form.price} onChangeText={t => setForm({ ...form, price: t })} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Stok *</Text>
                <TextInput style={styles.input} value={form.stock} onChangeText={t => setForm({ ...form, stock: t })} keyboardType="numeric" />
              </View>
            </View>

            <Text style={styles.label}>Görsel</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TextInput style={[styles.input, { flex: 1 }]} value={form.image_url} onChangeText={t => setForm({ ...form, image_url: t })} placeholder="URL veya Yükle" />
              <TouchableOpacity onPress={handlePickImage} style={styles.uploadBtn}>
                {uploading ? <ActivityIndicator color="#FFF" /> : <Ionicons name="cloud-upload" size={20} color="#FFF" />}
              </TouchableOpacity>
            </View>
            {form.image_url ? <Image source={{ uri: form.image_url }} style={styles.preview} /> : null}

            <Text style={styles.label}>Kategori</Text>
            <ScrollView horizontal style={{ marginBottom: 15 }}>
              {categories.map(c => (
                <Pressable key={c.id} onPress={() => setForm({ ...form, category_id: c.id })} style={[styles.chip, form.category_id === c.id && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                  <Text style={{ color: form.category_id === c.id ? '#FFF' : '#000' }}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontWeight: 'bold' }}>Aktif Ürün</Text>
              <Switch value={form.is_active} onValueChange={v => setForm({ ...form, is_active: v })} />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
               {saving ? <ActivityIndicator color="#FFF" /> : <Text style={{color: '#FFF', fontWeight: 'bold'}}>Kaydet</Text>}
            </TouchableOpacity>
            <View style={{ height: 50 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#FFF', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold' },
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 10, marginVertical: 5, borderRadius: 10, alignItems: 'center', ...SHADOWS.sm },
  img: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#EEE' },
  name: { fontWeight: 'bold', fontSize: 16 },
  price: { color: COLORS.primary, fontWeight: 'bold' },
  modalHead: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#EEE' },
  label: { marginBottom: 5, fontWeight: '600', color: '#555' },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', padding: 12, borderRadius: 8, marginBottom: 15 },
  uploadBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, justifyContent: 'center' },
  chip: { padding: 8, paddingHorizontal: 15, borderWidth: 1, borderColor: '#DDD', borderRadius: 20, marginRight: 8, backgroundColor: '#FFF' },
  preview: { width: '100%', height: 200, borderRadius: 10, marginBottom: 15, backgroundColor: '#EEE' },
  saveBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 }
});