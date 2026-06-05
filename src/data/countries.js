// ── Pays Franc CFA — UEMOA (XOF) + CEMAC (XAF) ────────────────────────────

export const COUNTRIES = [
  // UEMOA — Franc CFA Ouest (XOF)
  { code: 'SN', label: 'Sénégal',              dial: '+221', flag: '🇸🇳', zone: 'XOF' },
  { code: 'CI', label: "Côte d'Ivoire",         dial: '+225', flag: '🇨🇮', zone: 'XOF' },
  { code: 'ML', label: 'Mali',                  dial: '+223', flag: '🇲🇱', zone: 'XOF' },
  { code: 'BF', label: 'Burkina Faso',          dial: '+226', flag: '🇧🇫', zone: 'XOF' },
  { code: 'TG', label: 'Togo',                  dial: '+228', flag: '🇹🇬', zone: 'XOF' },
  { code: 'BJ', label: 'Bénin',                 dial: '+229', flag: '🇧🇯', zone: 'XOF' },
  { code: 'NE', label: 'Niger',                 dial: '+227', flag: '🇳🇪', zone: 'XOF' },
  { code: 'GW', label: 'Guinée-Bissau',         dial: '+245', flag: '🇬🇼', zone: 'XOF' },
  // CEMAC — Franc CFA Centre (XAF)
  { code: 'CM', label: 'Cameroun',              dial: '+237', flag: '🇨🇲', zone: 'XAF' },
  { code: 'CG', label: 'Congo',                 dial: '+242', flag: '🇨🇬', zone: 'XAF' },
  { code: 'GA', label: 'Gabon',                 dial: '+241', flag: '🇬🇦', zone: 'XAF' },
  { code: 'TD', label: 'Tchad',                 dial: '+235', flag: '🇹🇩', zone: 'XAF' },
  { code: 'CF', label: 'Rép. Centrafricaine',   dial: '+236', flag: '🇨🇫', zone: 'XAF' },
  { code: 'GQ', label: 'Guinée Équatoriale',    dial: '+240', flag: '🇬🇶', zone: 'XAF' },
];

export function findCountry(code) {
  return COUNTRIES.find((c) => c.code === code) ?? null;
}

export function zoneLabel(zone) {
  return zone === 'XOF' ? 'Franc CFA · UEMOA' : 'Franc CFA · CEMAC';
}
