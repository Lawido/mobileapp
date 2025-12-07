import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Linking, 
  Platform, 
  TextInput,
  LayoutAnimation,
  UIManager,
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
// Constants dosyanızın yolunu korudum, renkleri kod içinde kullanacağım ama siz constants'tan çekmeye devam edebilirsiniz.
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../lib/constants';

// Android için LayoutAnimation aktivasyonu
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQ {
  question: string;
  answer: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function HelpScreen() {
  const navigation = useNavigation();
  const [whatsappNumber, setWhatsappNumber] = useState('905078843413');
  const [email, setEmail] = useState('enxhstore@gmail.com');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Header animasyonu için scroll değeri
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('site_settings').select('*').single();
      if (data) {
        setWhatsappNumber(data.whatsapp_number || '905078843413');
        setEmail(data.contact_email || 'enxhstore@gmail.com');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const faqs: FAQ[] = [
    {
      question: 'Siparişim ne zaman kargoya verilecek?',
      answer: 'Siparişiniz ödeme onayından sonra 1-2 iş günü içinde kargoya teslim edilir. Kargo takip numaranız SMS ve e-posta ile tarafınıza iletilecektir.',
      icon: 'cube-outline'
    },
    {
      question: 'Ürün iadesini nasıl yapabilirim?',
      answer: 'Siparişlerim sayfasından ilgili siparişe tıklayarak "İade Talebi Oluştur" butonuna basabilirsiniz. İade talebiniz onaylandıktan sonra size bir iade kodu gönderilecektir.',
      icon: 'return-up-back-outline'
    },
    {
      question: 'Kargo ücreti ne kadar?',
      answer: '500 TL ve üzeri alışverişlerde kargo ücretsizdir. 500 TL altındaki siparişlerde kargo ücreti 29.90 TL\'dir.',
      icon: 'car-outline'
    },
    {
      question: 'Hangi ödeme yöntemlerini kullanabilirim?',
      answer: 'Kredi kartı, banka kartı veya havale/EFT ile ödeme yapabilirsiniz. Havale/EFT ödemelerinde %5 ek indirim kazanırsınız.',
      icon: 'card-outline'
    },
    {
      question: 'Ürünlerin garantisi var mı?',
      answer: 'Tüm ürünlerimiz 2 yıl garantilidir. Garanti belgesi ürünle birlikte size ulaştırılır. Garanti kapsamındaki sorunlar için bizimle iletişime geçebilirsiniz.',
      icon: 'shield-checkmark-outline'
    },
    {
      question: 'Kupon kodumu nasıl kullanabilirim?',
      answer: 'Sepet sayfasında "İndirim Kodu" alanına kupon kodunuzu girerek kullanabilirsiniz. Kupon kodları belirli minimum tutar ve şartlara bağlıdır.',
      icon: 'ticket-outline'
    },
    {
      question: 'Fatura bilgilerimi değiştirebilir miyim?',
      answer: 'Sipariş vermeden önce fatura bilgilerinizi kontrol edebilirsiniz. Sipariş tamamlandıktan sonra fatura bilgileri değiştirilemez.',
      icon: 'document-text-outline'
    },
    {
      question: 'Ürün stokta yoksa ne olur?',
      answer: 'Stokta olmayan ürünler için "Stokta Yok" uyarısı gösterilir. Ürün tekrar stoka girdiğinde e-posta ile bilgilendirilmek isterseniz "Stok Bildirimi Al" butonunu kullanabilirsiniz.',
      icon: 'alert-circle-outline'
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openWhatsApp = () => {
    const message = 'Merhaba, yardım almak istiyorum.';
    const url = `whatsapp://send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback for web or generic
        Linking.openURL(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`);
      }
    });
  };

  const openEmail = () => {
    Linking.openURL(`mailto:${email}?subject=Destek Talebi`);
  };

  const toggleFAQ = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yardım Merkezi</Text>
        <TouchableOpacity style={styles.headerRightButton}>
           {/* Opsiyonel sağ ikon */}
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]} // Arama çubuğunu yukarıda sabit tutmak isterseniz
      >
        {/* Arama Alanı */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={COLORS.textLight} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Hangi konuda yardıma ihtiyacınız var?"
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* İletişim Kartları - Grid Yapısı */}
        <View style={styles.contactContainer}>
          <Text style={styles.sectionTitle}>Hızlı İletişim</Text>
          <View style={styles.contactRow}>
            <TouchableOpacity style={[styles.contactCard, styles.cardWhatsapp]} onPress={openWhatsApp}>
              <View style={styles.contactIconCircle}>
                <Ionicons name="logo-whatsapp" size={24} color="#FFF" />
              </View>
              <Text style={styles.contactCardTitle}>WhatsApp</Text>
              <Text style={styles.contactCardSubtitle}>Canlı Destek</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.contactCard, styles.cardEmail]} onPress={openEmail}>
              <View style={[styles.contactIconCircle, { backgroundColor: '#EA4335' }]}>
                <Ionicons name="mail" size={24} color="#FFF" />
              </View>
              <Text style={styles.contactCardTitle}>E-Posta</Text>
              <Text style={styles.contactCardSubtitle}>Bize Yazın</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SSS Listesi */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Sıkça Sorulan Sorular</Text>
          
          {filteredFaqs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={40} color={COLORS.border} />
              <Text style={styles.emptyStateText}>Aradığınız soru bulunamadı.</Text>
            </View>
          ) : (
            filteredFaqs.map((faq, index) => {
              const isActive = expandedIndex === index;
              return (
                <View key={index} style={[styles.faqCardContainer, isActive && styles.faqCardActiveBorder]}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    onPress={() => toggleFAQ(index)}
                    activeOpacity={0.9}
                  >
                    <View style={[styles.faqIconBox, isActive && styles.faqIconBoxActive]}>
                      <Ionicons 
                        name={faq.icon} 
                        size={22} 
                        color={isActive ? COLORS.primary : COLORS.textLight} 
                      />
                    </View>
                    <Text style={[styles.faqQuestion, isActive && styles.faqQuestionActive]}>
                      {faq.question}
                    </Text>
                    <Ionicons 
                      name={isActive ? "remove-outline" : "add-outline"} 
                      size={22} 
                      color={isActive ? COLORS.primary : COLORS.textLight} 
                    />
                  </TouchableOpacity>
                  
                  {isActive && (
                    <View style={styles.faqAnswerWrapper}>
                      <View style={styles.divider} />
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Alt Bilgi */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>Versiyon 1.0.2</Text>
          <Text style={styles.footerSubText}>© 2024 Enxh Store</Text>
        </View>
        
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' // Daha temiz bir gri arka plan
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: SPACING.md, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.md, 
    backgroundColor: '#F8F9FA', // Header arka planla bütünleşsin
  },
  headerTitle: { 
    fontSize: FONT_SIZES.xl, 
    fontWeight: '800', 
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  backButton: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerRightButton: {
    width: 40,
  },
  content: { 
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  sectionTitle: { 
    fontSize: FONT_SIZES.lg, 
    fontWeight: '700', 
    color: COLORS.text, 
    marginBottom: SPACING.md,
    marginLeft: 4,
  },

  // Arama Alanı
  searchSection: {
    paddingBottom: SPACING.lg,
    backgroundColor: '#F8F9FA', // Sticky header için
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: SPACING.md,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    height: '100%',
  },

  // İletişim Kartları Grid
  contactContainer: {
    marginBottom: SPACING.xl,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: SPACING.lg,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardWhatsapp: {
    // Özel stil gerekirse
  },
  cardEmail: {
    // Özel stil gerekirse
  },
  contactIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  contactCardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  contactCardSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    fontWeight: '500',
  },

  // SSS Bölümü
  faqSection: {
    marginBottom: SPACING.xl,
  },
  faqCardContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent', // Aktif değilken border yok
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  faqCardActiveBorder: {
    borderColor: COLORS.primary, // Aktifken border rengi
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    minHeight: 70,
  },
  faqIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  faqIconBoxActive: {
    backgroundColor: COLORS.primary + '15', // Primary rengin %15 opaklığı
  },
  faqQuestion: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 22,
  },
  faqQuestionActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  faqAnswerWrapper: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: SPACING.md,
    marginLeft: 56, // İkonun hizasından başlasın
  },
  faqAnswerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text + '99', // Hafif transparan siyah
    lineHeight: 22,
    marginLeft: 56, // Metin ikonun hizasından devam etsin
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyStateText: {
    marginTop: SPACING.sm,
    color: COLORS.textLight,
    fontSize: FONT_SIZES.md,
  },

  // Footer
  footerNote: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  footerSubText: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
    opacity: 0.6,
  }
});