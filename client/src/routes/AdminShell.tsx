import { AdminAuthProvider } from '@/lib/AdminAuthProvider';

interface AdminShellProps {
  children: React.ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  return (
    <AdminAuthProvider>
      {children}
    </AdminAuthProvider>
  );
}