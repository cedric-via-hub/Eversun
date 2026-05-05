import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { QueryProvider } from '@/lib/react-query';
import ToastProvider from '@/components/ui/ToastProvider';
import ThemeProvider from '@/components/ThemeProvider';
import ConditionalHeader from '@/components/ConditionalHeader';
import MainWrapper from '@/components/MainWrapper';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Eversun SaaS Dashboard',
  description: 'Dashboard de suivi des installations',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#006d6f" />
        <Script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var raw=localStorage.getItem('app-storage');var t=null;if(raw){var s=JSON.parse(raw);t=s&&s.state&&s.state.theme;}if(!t){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}var root=document.documentElement;root.classList.toggle('dark',t==='dark');}catch(e){}})();`,
          }}
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={
          inter.className +
          ' bg-pattern-subtle min-h-screen transition-colors duration-100 ease-in-out'
        }
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[9999] focus:bg-primary focus:text-primary px-4 py-2 rounded-md border border-primary shadow-md"
        >
          Aller au contenu principal
        </a>
        <QueryProvider>
          <ThemeProvider>
            <ToastProvider />
            <ConditionalHeader />
            <ErrorBoundary>
              <MainWrapper>{children}</MainWrapper>
            </ErrorBoundary>
          </ThemeProvider>
        </QueryProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
