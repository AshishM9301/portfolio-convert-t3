"use client";

import { redirect } from "next/navigation";
import { useAdminSession } from "@/hooks/use-admin-session";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, token, logout } = useAdminSession();

  if (!isAuthenticated || !token) {
    redirect("/admin");
  }

  const handleLogout = () => {
    logout();
    redirect("/admin");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="font-bold text-lg">
              Admin Dashboard
            </Link>
            <nav className="hidden md:flex items-center gap-4 ml-8">
              <Link
                href="/admin/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Projects
              </Link>
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                View Site
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}

