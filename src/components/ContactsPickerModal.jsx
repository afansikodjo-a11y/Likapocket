import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, FlatList,
  StyleSheet, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Search, User } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { COLORS, FONT, SPACE } from '../theme';

/**
 * Bottom sheet de sélection d'un contact du téléphone.
 *
 * Props :
 *   - visible: boolean
 *   - onClose: () => void
 *   - onSelect: ({ name, phone }) => void
 */
export default function ContactsPickerModal({ visible, onClose, onSelect }) {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState(null); // null = loading
  const [search,   setSearch]   = useState('');
  const [error,    setError]    = useState('');

  // Charger les contacts à chaque ouverture
  useEffect(() => {
    if (!visible) return;
    if (Platform.OS === 'web') {
      setError('Les contacts sont disponibles uniquement sur mobile.');
      setContacts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) {
            setError('Permission refusée. Active l\'accès aux contacts dans les Paramètres.');
            setContacts([]);
          }
          return;
        }
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });
        if (cancelled) return;
        // Filtre les contacts qui ont au moins un numéro
        const valid = (data || [])
          .filter((c) => c.phoneNumbers?.length > 0)
          .map((c) => ({
            id:    c.id,
            name:  c.name ?? '(sans nom)',
            phone: c.phoneNumbers[0].number ?? '',
          }))
          .filter((c) => c.phone)
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        setContacts(valid);
      } catch (e) {
        if (!cancelled) {
          setError('Erreur lors du chargement des contacts.');
          setContacts([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [visible]);

  const filtered = useMemo(() => {
    if (!contacts) return [];
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q),
    );
  }, [contacts, search]);

  const handlePick = (contact) => {
    // Nettoie le numéro (garde + et chiffres)
    const cleanPhone = contact.phone.replace(/[^\d+]/g, '');
    onSelect?.({ name: contact.name, phone: cleanPhone });
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.handle} />

          <View style={s.header}>
            <Text style={s.title}>Choisir un contact</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={s.closeBtn}>
              <X size={18} color={COLORS.grey} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={s.searchBox}>
            <Search size={16} color={COLORS.grey} strokeWidth={2.2} />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher un contact"
              placeholderTextColor="#C9C9C9"
              autoCorrect={false}
            />
          </View>

          {/* List / loading / empty */}
          {contacts === null ? (
            <View style={s.center}>
              <ActivityIndicator color={COLORS.gold} />
              <Text style={s.loadingTxt}>Chargement des contacts…</Text>
            </View>
          ) : error ? (
            <View style={s.center}>
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.center}>
              <Text style={s.emptyTxt}>Aucun contact trouvé.</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.row} onPress={() => handlePick(item)} activeOpacity={0.7}>
                  <View style={s.avatar}>
                    <Text style={s.avatarTxt}>{(item.name?.charAt(0) ?? '?').toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.rowPhone} numberOfLines={1}>{item.phone}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={s.sep} />}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 480 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16 },
  default: { elevation: 5 },
});

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: SPACE.lg,
    maxHeight: '85%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title:  { fontFamily: FONT, fontSize: 17, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    marginBottom: 12, ...SHADOW,
  },
  searchInput: { flex: 1, fontFamily: FONT, fontSize: 14, color: COLORS.black, padding: 0 },

  center: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  loadingTxt: { fontFamily: FONT, fontSize: 12, color: COLORS.grey },
  errorTxt: { fontFamily: FONT, fontSize: 13, color: COLORS.error, textAlign: 'center' },
  emptyTxt: { fontFamily: FONT, fontSize: 13, color: COLORS.grey, textAlign: 'center' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.goldSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontFamily: FONT, fontSize: 14, fontWeight: '800', color: COLORS.gold },
  rowName:   { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: COLORS.black },
  rowPhone:  { fontFamily: FONT, fontSize: 12, color: COLORS.grey, marginTop: 2 },
  sep:       { height: 1, backgroundColor: '#F4F4F4', marginLeft: 52 },
});
