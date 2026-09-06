const LEGACY_DATABASE_NAME = "poolyar-local";
const LEGACY_OWNER_KEY = "poolamkoo:legacy-db-owner";
const SCOPE_COOKIE = "poolamkoo_scope";

export function databaseNameForScope(scope: string | null, legacyOwner: string | null) {
  if (!scope) return LEGACY_DATABASE_NAME;
  if (!legacyOwner || legacyOwner === scope) return LEGACY_DATABASE_NAME;
  return `${LEGACY_DATABASE_NAME}-${scope.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)}`;
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const row = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return row ? decodeURIComponent(row.slice(prefix.length)) : null;
}

export function resolveLocalDatabaseName() {
  if (typeof window === "undefined") return LEGACY_DATABASE_NAME;
  const scope = readCookie(SCOPE_COOKIE);
  if (!scope) return LEGACY_DATABASE_NAME;

  let legacyOwner = window.localStorage.getItem(LEGACY_OWNER_KEY);
  if (!legacyOwner) {
    window.localStorage.setItem(LEGACY_OWNER_KEY, scope);
    legacyOwner = scope;
  }
  return databaseNameForScope(scope, legacyOwner);
}
