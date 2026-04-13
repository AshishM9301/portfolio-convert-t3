import { useCallback, useSyncExternalStore } from "react";

const ADMIN_TOKEN_KEY = "admin_token";

const tokenListeners = new Set<() => void>();

function emitTokenChange() {
  for (const l of tokenListeners) l();
}

function subscribeToken(onStoreChange: () => void) {
  tokenListeners.add(onStoreChange);
  return () => {
    tokenListeners.delete(onStoreChange);
  };
}

function getClientTokenSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

function getServerTokenSnapshot(): null {
  return null;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === ADMIN_TOKEN_KEY || e.key === null) {
      emitTokenChange();
    }
  });
}

interface AdminSession {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

export function useAdminSession(): AdminSession {
  const token = useSyncExternalStore(
    subscribeToken,
    getClientTokenSnapshot,
    getServerTokenSnapshot
  );

  const login = useCallback((newToken: string) => {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, newToken);
    emitTokenChange();
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    emitTokenChange();
  }, []);

  return {
    token,
    isAuthenticated: token !== null,
    login,
    logout,
  };
}

export function useAdminAuthHeader(): { Authorization: string } | Record<string, never> {
  const { token } = useAdminSession();

  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

export function useAdminAccess() {
  const { isAuthenticated } = useAdminSession();

  return {
    canAccess: isAuthenticated,
    isLoading: false,
  };
}
