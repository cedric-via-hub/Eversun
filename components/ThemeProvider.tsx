'use client';

import { useLayoutEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useAppStore((state) => state.theme);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return <>{children}</>;
}
