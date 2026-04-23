import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/lib/react-query';
import ToastProvider from '@/components/ui/ToastProvider';
import ThemeProvider from '@/components/ThemeProvider';
import ConditionalHeader from '@/components/ConditionalHeader';
import MainWrapper from '@/components/MainWrapper';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import ServiceWorker from '@/components/ServiceWorker';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Eversun SaaS Dashboard',
  description: 'Dashboard de suivi des installations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#006d6f" />
      </head>
      <body
        className={
          inter.className +
          ' bg-pattern-subtle min-h-screen transition-colors duration-150'
        }
      >
        <QueryProvider>
          <ThemeProvider>
            <ToastProvider />
            <ServiceWorker />
            <ConditionalHeader />
            <ErrorBoundary>
              <MainWrapper>{children}</MainWrapper>
            </ErrorBoundary>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
