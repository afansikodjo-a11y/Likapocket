import { Platform } from 'react-native';

// ── Palette ────────────────────────────────────────────────────────────────
export const COLORS = {
  bg:          '#F9F9F9',
  gold:        '#D69E4E',
  goldSoft:    '#FBF3E4',
  goldDark:    '#B5822D',
  black:       '#0A0A0A',
  white:       '#FFFFFF',
  grey:        '#6B6B6B',
  greyLight:   '#9B9B9B',
  greySoft:    '#F4F4F4',
  border:      '#EBEBEB',
  success:     '#1A7F4B',
  successSoft: '#E6F4EE',
  error:       '#C0392B',
  errorSoft:   '#FDEAEA',
  warning:     '#D97706',
  warningSoft: '#FEF3C7',
};

// ── Typography ─────────────────────────────────────────────────────────────
export const FONT = Platform.select({ ios: 'System', default: 'sans-serif' });

export const TYPE = {
  display:   { fontFamily: FONT, fontSize: 64, fontWeight: '800', letterSpacing: -3, lineHeight: 68 },
  h1:        { fontFamily: FONT, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  h2:        { fontFamily: FONT, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  overline:  { fontFamily: FONT, fontSize: 10, fontWeight: '700', letterSpacing: 3 },
  body:      { fontFamily: FONT, fontSize: 14, fontWeight: '400', lineHeight: 22 },
  label:     { fontFamily: FONT, fontSize: 13, fontWeight: '600' },
  caption:   { fontFamily: FONT, fontSize: 11, fontWeight: '400', letterSpacing: 0.3 },
  badge:     { fontFamily: FONT, fontSize: 9,  fontWeight: '700', letterSpacing: 0.3 },
  amount:    { fontFamily: FONT, fontSize: 13, fontWeight: '700', letterSpacing: -0.3 },
  currency:  { fontFamily: FONT, fontSize: 20, fontWeight: '700', letterSpacing: 1 },
};

// ── Spacing ────────────────────────────────────────────────────────────────
export const SPACE = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

// ── Transaction types & statuses (align with DB schema) ───────────────────
export const TX_TYPE = {
  COLLECT:  'COLLECT',
  TRANSFER: 'TRANSFER',
  TOPUP:    'TOPUP',
  WITHDRAW: 'WITHDRAW',
};

export const TX_STATUS = {
  PENDING_SYNC: 'PENDING_SYNC',
  VALIDATED:    'VALIDATED',
};

// ── Status display config ──────────────────────────────────────────────────
export const SYNC_DISPLAY = {
  PENDING_SYNC: { label: 'En attente',   color: COLORS.gold,    bg: COLORS.goldSoft    },
  VALIDATED:    { label: 'Validé',       color: COLORS.success, bg: COLORS.successSoft },
  // Legacy (migration period)
  confirmed:    { label: 'Confirmé',     color: COLORS.success, bg: COLORS.successSoft },
  pending_sync: { label: 'En attente',   color: COLORS.gold,    bg: COLORS.goldSoft    },
  synced:       { label: 'Synchronisé',  color: COLORS.success, bg: COLORS.successSoft },
  rejected:     { label: 'Rejeté',       color: COLORS.error,   bg: COLORS.errorSoft   },
};
