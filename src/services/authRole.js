/**
 * Helpers pour déterminer le rôle d'un utilisateur depuis sa session Supabase.
 *
 * Le rôle est stocké dans `auth.users.raw_app_meta_data.role` (non modifiable
 * par l'utilisateur depuis l'app). Il est inclus dans le JWT et donc dispo
 * via `session.user.app_metadata`.
 */

export const ROLES = {
  ADMIN: 'admin',
  USER:  'user',
};

export function getRole(session) {
  return session?.user?.app_metadata?.role ?? ROLES.USER;
}

export function isAdmin(session) {
  return getRole(session) === ROLES.ADMIN;
}
