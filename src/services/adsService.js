/**
 * adsService — gestion des bannières publicitaires.
 *
 * Backend Supabase :
 *   - Table `ads` (id, image_url, title, link_url, active, sort_order, ...)
 *   - Storage bucket `ads-images` (public read, admin write)
 *
 * RLS : lecture libre des ads actives, écriture admin uniquement.
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';

const BUCKET = 'ads-images';
const TABLE  = 'ads';

/**
 * Récupère toutes les bannières actives, triées.
 */
export async function getActiveAds() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[ads] getActiveAds error:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Liste TOUTES les bannières (admin only).
 */
export async function listAllAds() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Upload une image vers Supabase Storage et crée une entrée dans `ads`.
 *
 * @param {{ uri: string, title?: string, linkUrl?: string }} opts
 */
export async function uploadAd({ uri, title, linkUrl }) {
  if (!uri) throw new Error('Image manquante.');

  // 1. Charger le payload binaire (compat web + native)
  let payload;
  let mime;
  let ext;

  if (Platform.OS === 'web') {
    // Web : l'URI est un blob: ou data: URL → fetch directement en Blob
    const res = await fetch(uri);
    if (!res.ok) throw new Error('Impossible de lire le fichier image.');
    payload = await res.blob();
    mime = payload.type || 'image/jpeg';
    ext  = (mime.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  } else {
    // Native : on lit en base64 via expo-file-system puis conversion en Uint8Array
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    payload = _base64ToUint8Array(base64);
    ext  = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
    mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  }

  // 2. Chemin Storage unique
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // 3. Upload vers Storage
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, payload, { contentType: mime, upsert: false });

  if (upErr) throw new Error(`Upload échoué : ${upErr.message}`);

  // 4. URL publique
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // 5. Insert dans la table ads
  const { data: { user } } = await supabase.auth.getUser();
  const { data: ad, error: insErr } = await supabase
    .from(TABLE)
    .insert({
      image_url:  publicUrl,
      title:      title  ?? null,
      link_url:   linkUrl ?? null,
      active:     true,
      sort_order: 0,
      created_by: user?.id ?? null,
    })
    .select()
    .single();

  if (insErr) throw new Error(`Insert ads échoué : ${insErr.message}`);
  return ad;
}

/**
 * Supprime une bannière (par admin).
 *
 * On utilise `.select()` pour récupérer les lignes effectivement supprimées :
 * sans ça, RLS bloque silencieusement (0 ligne supprimée mais aucune erreur).
 */
export async function deleteAd(adId) {
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', adId)
    .select();

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('Suppression refusée (droits admin manquants ou bannière introuvable).');
  }
}

/**
 * Active/désactive une bannière.
 */
export async function setAdActive(adId, active) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ active })
    .eq('id', adId)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('Modification refusée (droits admin manquants).');
  }
}

/**
 * Met à jour le titre et/ou le lien d'une bannière existante.
 *
 * @param {string} adId
 * @param {{ title?: string | null, linkUrl?: string | null }} fields
 */
export async function updateAd(adId, { title, linkUrl }) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      title:    title    ?? null,
      link_url: linkUrl  ?? null,
    })
    .eq('id', adId)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('Modification refusée (droits admin manquants).');
  }
  return data[0];
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _base64ToUint8Array(b64) {
  const binStr = globalThis.atob ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}
