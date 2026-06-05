// Web stub — pas de SIM sur navigateur
export async function detectOperator() {
  return { id: 'unknown', label: 'Opérateur non disponible (web)' };
}

export async function hasSIM() {
  return false;
}
