import { AppProviders } from '@/components/AppProviders';
import { AppChrome } from '@/components/layout/AppChrome';

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <AppChrome>{children}</AppChrome>
    </AppProviders>
  );
}
