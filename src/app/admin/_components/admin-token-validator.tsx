"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { TRPCClientError } from "@trpc/client";
import { api } from "@/trpc/react";
import { useAdminSession } from "@/hooks/use-admin-session";

/**
 * On load and on admin route changes, validates `admin_token` with the server.
 * Stale or invalid tokens are removed from session storage.
 */
export function AdminTokenValidator({ children }: { children: React.ReactNode }) {
  const { token, logout } = useAdminSession();
  const pathname = usePathname() ?? "";

  const { isError, error } = api.admin.sessionCheck.useQuery(
    { path: pathname },
    {
      enabled: !!token,
      retry: false,
      staleTime: 0,
      refetchOnWindowFocus: true,
    }
  );

  useEffect(() => {
    if (!isError || !error) return;
    if (!(error instanceof TRPCClientError)) return;
    const code = error.shape?.code ?? error.data?.code;
    if (code === "UNAUTHORIZED") {
      logout();
    }
  }, [isError, error, logout]);

  return <>{children}</>;
}
