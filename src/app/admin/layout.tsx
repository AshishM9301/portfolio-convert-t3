import { AdminTokenValidator } from "@/app/admin/_components/admin-token-validator";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminTokenValidator>{children}</AdminTokenValidator>;
}
