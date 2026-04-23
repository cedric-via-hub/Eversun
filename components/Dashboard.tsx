'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { List, CaretUp } from '@phosphor-icons/react';
import PageTransition from '@/components/PageTransition';
import SectionTransition from '@/components/SectionTransition';
import { Section } from '@/types/client';
import { useAppStore } from '@/store/useAppStore';

const Sidebar = dynamic(() => import('@/components/Sidebar'), {
  ssr: false,
  loading: () => (
    <div className="w-56 h-screen bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 animate-pulse" />
  ),
});

const ClientAggregationView = dynamic(
  () => import('@/components/ClientAggregationView'),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 shadow-lg">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse mb-6" />
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-14 bg-slate-200 dark:bg-slate-700 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    ),
  }
);

const ClientSection = dynamic(
  () => import('@/components/ClientSection'),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 shadow-lg">
        <div className="h-6 w-44 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse mb-6" />
        <div className="space-y-3">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-12 bg-slate-200 dark:bg-slate-700 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    ),
  }
);


interface DashboardProps {
  /** Section initiale (optionnel, défaut: 'dp-en-cours') */
  initialSection?: Section;
}

export default function Dashboard({ initialSection = 'dp-en-cours' }: DashboardProps) {
  const { activeSection, setActiveSection, sectionCounts } = useAppStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isSectionLoading, setIsSectionLoading] = useState(false);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection, setActiveSection]);

  useEffect(() => {
    // Prefetch components based on active section
    if (activeSection === 'clients') {
      import('@/components/ClientAggregationView');
    } else {
      import('@/components/ClientSection');
    }
  }, [activeSection]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleSectionLoading = (event: any) => {
      const { section, loading } = event.detail;
      if (section === activeSection) {
        setIsSectionLoading(loading);
      }
    };

    window.addEventListener('sectionLoading', handleSectionLoading);
    return () => window.removeEventListener('sectionLoading', handleSectionLoading);
  }, [activeSection]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        sectionCounts={sectionCounts}
        onCollapsedChange={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <main className={`flex-1 overflow-auto transition-all duration-200 relative ${
        isSidebarCollapsed ? 'ml-16' : 'ml-56'
      }`}>
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden fixed top-20 left-4 z-30 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:scale-[1.01] transition-transform duration-200"
          aria-label="Ouvrir le menu"
        >
          <List className="h-6 w-6 text-gray-600 dark:text-gray-400" weight="bold" />
        </button>
        <PageTransition>
          <SectionTransition sectionKey={activeSection} isLoading={isSectionLoading}>
            {activeSection === 'clients' ? (
              <ClientAggregationView />
            ) : (
              <ClientSection section={activeSection} />
            )}
          </SectionTransition>
        </PageTransition>

        {/* Back to Top Button */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 p-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg shadow-md hover:shadow hover:scale-[1.01] transition-all duration-200"
            aria-label="Retour en haut"
          >
            <CaretUp className="h-6 w-6" weight="bold" />
          </button>
        )}
      </main>
    </div>
  );
}
