import { create } from 'zustand';
import { getBalance, getPendingSyncCount, setUserId } from '../database';
import { pullFromServer } from '../services/syncService';

const useAppStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  session:    undefined,   // undefined = loading | null = no session | object = logged in
  setSession: async (session) => {
    const wasLoggedOut = !get().session;
    set({ session });
    if (session?.user) {
      await setUserId(session.user.id).catch(() => {});

      // À la connexion (transition de logged-out → logged-in), on pull
      // les transactions du serveur pour restaurer le wallet local.
      if (wasLoggedOut) {
        pullFromServer()
          .catch((e) => console.warn('[store] pullFromServer failed:', e?.message))
          .finally(() => get().refreshWallet());
      } else {
        get().refreshWallet();
      }
    }
  },

  // ── Wallet ────────────────────────────────────────────────────────────────
  balance:      null,
  pendingCount: 0,

  refreshWallet: async () => {
    const [balance, pendingCount] = await Promise.all([
      getBalance(),
      getPendingSyncCount(),
    ]);
    set({ balance, pendingCount });
  },

  // ── Sync status ───────────────────────────────────────────────────────────
  lastSyncResult: null,
  setLastSyncResult: (result) => set({ lastSyncResult: result }),

  // ── Lock state ────────────────────────────────────────────────────────────
  isLocked: true,                                  // verrouillé par défaut au lancement
  setLocked: (locked) => set({ isLocked: locked }),
}));

export default useAppStore;
