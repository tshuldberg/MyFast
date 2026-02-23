'use client';

import { DatabaseProvider } from '@/lib/database';

export function Providers({ children }: { children: React.ReactNode }) {
  return <DatabaseProvider>{children}</DatabaseProvider>;
}
