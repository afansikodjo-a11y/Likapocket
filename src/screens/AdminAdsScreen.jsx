import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Image, Alert,
  StyleSheet, Platform, ActivityIndicator, TextInput, Modal,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft, ImagePlus, Trash2, X, Eye, EyeOff,
  ImageIcon, AlertCircle, Pencil,
} from 'lucide-react-native';
import {
  listAllAds, uploadAd, deleteAd, setAdActive, updateAd,
} from '../services/adsService';
import { COLORS, FONT, SPACE } from '../theme';

export default function AdminAdsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [ads,        setAds]        = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [showAdd,    setShowAdd]    = useState(false);
  const [pickedUri,  setPickedUri]  = useState(null);
  const [title,      setTitle]      = useState('');
  const [linkUrl,    setLinkUrl]    = useState('');
  const [editingAd,  setEditingAd]  = useState(null); // ad en cours d'édition (null = mode création)

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listAllAds();
      setAds(data);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorise l\'accès aux photos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 5],
    });
    if (!res.canceled && res.assets?.[0]) {
      setPickedUri(res.assets[0].uri);
      setShowAdd(true);
    }
  };

  const closeSheet = () => {
    setShowAdd(false);
    setPickedUri(null);
    setEditingAd(null);
    setTitle('');
    setLinkUrl('');
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      if (editingAd) {
        // Mode édition : on met juste à jour titre + lien
        await updateAd(editingAd.id, {
          title:   title.trim() || null,
          linkUrl: linkUrl.trim() || null,
        });
        closeSheet();
        await load();
        Alert.alert('Bannière modifiée', 'Les changements sont visibles immédiatement.');
      } else {
        // Mode création : upload + insert
        if (!pickedUri) return;
        await uploadAd({
          uri:     pickedUri,
          title:   title.trim() || null,
          linkUrl: linkUrl.trim() || null,
        });
        closeSheet();
        await load();
        Alert.alert('Bannière ajoutée', 'Elle est visible sur le Home des utilisateurs.');
      }
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (ad) => {
    setEditingAd(ad);
    setTitle(ad.title ?? '');
    setLinkUrl(ad.link_url ?? '');
    setPickedUri(null);
    setShowAdd(true);
  };

  const handleDelete = (ad) => {
    // Web : Alert.alert ne supporte pas les boutons multiples → on utilise window.confirm
    const proceed = async () => {
      // Optimistic update : on retire la ligne immédiatement de l'écran
      setAds((prev) => prev.filter((a) => a.id !== ad.id));
      try {
        await deleteAd(ad.id);
        // On recharge pour rester synchronisé avec la DB
        await load();
      } catch (e) {
        // Échec → on restaure et on prévient
        await load();
        Alert.alert('Erreur', e.message);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Supprimer "${ad.title ?? 'Sans titre'}" ?`)) {
        proceed();
      }
      return;
    }

    Alert.alert(
      'Supprimer cette bannière ?',
      ad.title ?? 'Sans titre',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: proceed },
      ],
    );
  };

  const handleToggleActive = async (ad) => {
    try {
      await setAdActive(ad.id, !ad.active);
      await load();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={COLORS.black} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Gérer les bannières</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={ads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[s.adCard, !item.active && s.adCardInactive]}>
            <Image source={{ uri: item.image_url }} style={s.adImage} />
            <View style={s.adInfo}>
              <Text style={s.adTitle} numberOfLines={1}>{item.title ?? '(sans titre)'}</Text>
              {item.link_url && <Text style={s.adLink} numberOfLines={1}>🔗 {item.link_url}</Text>}
              <Text style={s.adStatus}>{item.active ? 'Active' : 'Désactivée'}</Text>
            </View>
            <View style={s.adActions}>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleToggleActive(item)} activeOpacity={0.7}>
                {item.active
                  ? <EyeOff size={16} color={COLORS.grey} strokeWidth={2.2} />
                  : <Eye    size={16} color={COLORS.success} strokeWidth={2.2} />}
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleEdit(item)} activeOpacity={0.7}>
                <Pencil size={16} color={COLORS.gold} strokeWidth={2.2} />
              </TouchableOpacity>
              <TouchableOpacity style={s.iconBtn} onPress={() => handleDelete(item)} activeOpacity={0.7}>
                <Trash2 size={16} color={COLORS.error} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={['#D69E4E', '#B5822D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.hero}
            >
              <View style={s.heroIcon}>
                <ImageIcon size={22} color="#FFF" strokeWidth={2.2} />
              </View>
              <Text style={s.heroOver}>ESPACE PUBLICITAIRE</Text>
              <Text style={s.heroTitle}>Bannières du Home</Text>
              <Text style={s.heroSub}>
                Ajoute des bannières (1600×500 px idéal) avec un lien optionnel. Elles défilent automatiquement.
              </Text>
            </LinearGradient>

            <TouchableOpacity
              style={s.addBtn}
              onPress={handlePickImage}
              activeOpacity={0.85}
              disabled={uploading}
            >
              <ImagePlus size={18} color="#FFF" strokeWidth={2.4} />
              <Text style={s.addBtnTxt}>Ajouter une bannière</Text>
            </TouchableOpacity>

            {loading && <ActivityIndicator color={COLORS.gold} style={{ marginTop: 20 }} />}
          </>
        }
        ListEmptyComponent={!loading && (
          <View style={s.empty}>
            <ImageIcon size={32} color={COLORS.greyLight} strokeWidth={1.8} />
            <Text style={s.emptyTitle}>Aucune bannière</Text>
            <Text style={s.emptyBody}>
              Ajoute la première bannière publicitaire qui s'affichera sur le Home des utilisateurs.
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de configuration de la bannière (création OU édition) */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={closeSheet}>
        <KeyboardAvoidingView
          style={s.sheetBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>
                {editingAd ? 'Modifier la bannière' : 'Nouvelle bannière'}
              </Text>
              <TouchableOpacity onPress={closeSheet} hitSlop={10} style={s.closeBtn}>
                <X size={18} color={COLORS.grey} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {(pickedUri || editingAd?.image_url) && (
                <Image
                  source={{ uri: pickedUri ?? editingAd.image_url }}
                  style={s.preview}
                />
              )}

              <Text style={s.fieldLabel}>TITRE (OPTIONNEL)</Text>
              <View style={s.inputBox}>
                <TextInput
                  style={s.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Ex: Pack Internet Yas"
                  placeholderTextColor="#C9C9C9"
                  maxLength={80}
                />
              </View>

              <Text style={s.fieldLabel}>LIEN (OPTIONNEL)</Text>
              <View style={s.inputBox}>
                <TextInput
                  style={s.input}
                  value={linkUrl}
                  onChangeText={setLinkUrl}
                  placeholder="https://..."
                  placeholderTextColor="#C9C9C9"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[s.cta, uploading && s.ctaDisabled]}
                onPress={handleUpload}
                disabled={uploading}
                activeOpacity={0.88}
              >
                {uploading
                  ? <ActivityIndicator color="#FFF" />
                  : (
                    <>
                      {editingAd
                        ? <Pencil    size={17} color="#FFF" strokeWidth={2.4} />
                        : <ImagePlus size={17} color="#FFF" strokeWidth={2.4} />}
                      <Text style={s.ctaTxt}>
                        {editingAd ? 'Enregistrer les modifications' : 'Publier la bannière'}
                      </Text>
                    </>
                  )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
  default: { elevation: 2 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACE.md, paddingVertical: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center', ...SHADOW,
  },
  headerTitle: { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: COLORS.black },

  hero: {
    marginHorizontal: SPACE.lg, marginTop: 8, marginBottom: 16,
    borderRadius: 20, padding: 20, ...SHADOW,
  },
  heroIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroOver:  { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  heroTitle: { fontFamily: FONT, fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginBottom: 6 },
  heroSub:   { fontFamily: FONT, fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 17 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.black, borderRadius: 14, paddingVertical: 14,
    marginHorizontal: SPACE.lg, marginBottom: 16, ...SHADOW,
  },
  addBtnTxt: { fontFamily: FONT, fontSize: 14, fontWeight: '800', color: '#FFF' },

  // Ad row
  adCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', marginHorizontal: SPACE.lg, marginBottom: 8,
    borderRadius: 14, padding: 10, ...SHADOW,
  },
  adCardInactive: { opacity: 0.5 },
  adImage: { width: 80, height: 50, borderRadius: 8, backgroundColor: '#EEE' },
  adInfo: { flex: 1 },
  adTitle:  { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: COLORS.black },
  adLink:   { fontFamily: FONT, fontSize: 10, color: COLORS.gold, marginTop: 2 },
  adStatus: { fontFamily: FONT, fontSize: 10, color: COLORS.grey, marginTop: 2 },
  adActions:{ flexDirection: 'row', gap: 4 },
  iconBtn:  {
    width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center',
  },

  empty: { padding: 32, alignItems: 'center' },
  emptyTitle: { fontFamily: FONT, fontSize: 14, fontWeight: '800', color: COLORS.black, marginTop: 12, marginBottom: 6 },
  emptyBody: { fontFamily: FONT, fontSize: 12, color: COLORS.grey, textAlign: 'center', lineHeight: 17 },

  // Modal
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: SPACE.lg,
    maxHeight: '90%',
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle:  { fontFamily: FONT, fontSize: 16, fontWeight: '800', color: COLORS.black },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },

  preview: { width: '100%', aspectRatio: 16/5, borderRadius: 14, marginBottom: 16, backgroundColor: '#EEE' },

  fieldLabel: { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 2, color: COLORS.grey, marginBottom: 8 },
  inputBox: {
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    borderWidth: 1, borderColor: '#EEEEEE', marginBottom: 14,
  },
  input: { fontFamily: FONT, fontSize: 14, color: COLORS.black, padding: 0 },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.gold, borderRadius: 14, paddingVertical: 14,
    marginTop: 4, ...SHADOW,
  },
  ctaDisabled: { backgroundColor: '#BBBBBB' },
  ctaTxt: { fontFamily: FONT, fontSize: 15, fontWeight: '800', color: '#FFF' },
});
