'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  CheckCircle,
  XCircle,
  Circle,
  Lightning,
  Flag,
  CaretLeft,
  CaretRight,
  CheckSquare,
  MagnifyingGlass,
  X,
  List,
  Users,
} from '@phosphor-icons/react';
import { HomeIcon, DocumentTextIcon, CheckBadgeIcon, XMarkIcon, EllipsisHorizontalIcon, BoltIcon, FlagIcon } from '@heroicons/react/24/outline';
import { Section } from '@/types/client';

interface SidebarProps {
  /** Section actuellement active */
  activeSection: Section;
  /** Fonction pour changer la section active */
  setActiveSection: (section: Section) => void;
  /** Comptes de clients par section */
  sectionCounts?: Record<string, number>;
  /** Callback appelé quand la sidebar est réduite/étendue */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** État mobile de la sidebar */
  isMobileOpen?: boolean;
  /** Callback pour fermer la sidebar mobile */
  onMobileClose?: () => void;
}

const sectionGroups = [
  {
    title: 'Vue Globale',
    sections: [
      {
        id: 'clients' as const,
        label: 'Clients',
        icon: HomeIcon,
      },
    ],
  },
  {
    title: 'Déclarations Préalables',
    sections: [
      {
        id: 'dp-en-cours' as const,
        label: 'DP En cours',
        icon: FileText,
      },
      {
        id: 'dp-accordes' as const,
        label: 'DP Accordés',
        icon: CheckCircle,
      },
      {
        id: 'dp-refuses' as const,
        label: 'DP Refus',
        icon: XCircle,
      },
      {
        id: 'daact' as const,
        label: 'DAACT',
        icon: CheckSquare,
      },
    ],
  },
  {
    title: 'Certifications Consuel',
    sections: [
      {
        id: 'consuel-en-cours' as const,
        label: 'Consuel En cours',
        icon: Circle,
      },
      {
        id: 'consuel-finalise' as const,
        label: 'Consuel Finalisé',
        icon: CheckCircle,
      },
    ],
  },
  {
    title: 'Raccordement',
    sections: [
      {
        id: 'raccordement' as const,
        label: 'Raccordement',
        icon: Lightning,
      },
      {
        id: 'raccordement-mes' as const,
        label: 'Raccordement MES',
        icon: Flag,
      },
    ],
  },
];

export default function Sidebar({
  activeSection,
  setActiveSection,
  sectionCounts,
  onCollapsedChange,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (onCollapsedChange) {
      onCollapsedChange(isCollapsed);
    }
  }, [isCollapsed, onCollapsedChange]);

  // Load saved state
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsed !== null) setIsCollapsed(savedCollapsed === 'true');
  }, []);

  // Save state
  const handleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  // Filter sections based on search query
  const filteredSectionGroups = sectionGroups.map(group => ({
    ...group,
    sections: group.sections.filter(section =>
      section.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.sections.length > 0);

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside
        className={`bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-r border-white/20 dark:border-slate-700/50 h-[calc(100vh-3.5rem)] z-40 flex flex-col shadow-xl transition-all duration-300 flex-shrink-0 ${
          isMobile
            ? isMobileOpen
              ? 'translate-x-0 w-64 fixed left-0'
              : '-translate-x-full w-64 fixed left-0'
            : 'fixed left-0 top-14 ' + (isCollapsed ? 'w-16' : 'w-56')
        }`}
        role="navigation"
        aria-label="Navigation principale"
      >
      {/* Mobile Close Button */}
      {isMobile && (
        <button
          onClick={onMobileClose}
          className="absolute right-4 top-4 z-50 p-2 bg-white dark:bg-gray-700 rounded-lg shadow border border-gray-200 dark:border-gray-600 hover:scale-[1.01] transition-transform duration-200 md:hidden"
          aria-label="Fermer la sidebar"
        >
          <X className="h-5 w-5 text-gray-600 dark:text-gray-300" weight="bold" />
        </button>
      )}


      {/* Search Bar */}
      {!isCollapsed && (
        <div className="px-4 py-3">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" weight="bold" />
              </button>
            )}
          </div>
        </div>
      )}

      <nav className="py-4 flex-1 overflow-y-auto">
        {filteredSectionGroups.map((group, groupIndex) => (
          <div key={group.title} className="mb-6">
            {!isCollapsed && (
              <div className="px-4 mb-3">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {group.title}
                </span>
              </div>
            )}
            <ul className="space-y-2 px-2" role="list">
              {group.sections.map((section, sectionIndex) => {
                const globalIndex = sectionGroups.slice(0, groupIndex).reduce((acc, g) => acc + g.sections.length, 0) + sectionIndex + 1;
                return (
                  <li key={section.id} role="listitem">
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-3 group relative overflow-hidden
                        ${
                          activeSection === section.id
                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 transform scale-[1.02]'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900'
                        }`}
                      tabIndex={0}
                      aria-current={activeSection === section.id ? 'page' : undefined}
                      title={isCollapsed ? `${section.label} (Alt+${globalIndex})` : undefined}
                    >
                      {activeSection === section.id && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      )}
                      {section.icon && (
                        <section.icon
                          weight="regular"
                          className={`h-5 w-5 flex-shrink-0 transition-all duration-200 ${
                            activeSection === section.id ? 'text-white scale-110' : 'text-gray-400 dark:text-gray-500 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:scale-110'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 relative z-10">{section.label}</span>
                          {sectionCounts && sectionCounts[section.id] !== undefined && (
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded-full transition-all duration-200 relative z-10 ${
                                activeSection === section.id
                                  ? 'bg-white text-amber-600 shadow'
                                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/50'
                              }`}
                            >
                              {sectionCounts[section.id]}
                            </span>
                          )}
                        </>
                      )}
                      {isCollapsed && sectionCounts && sectionCounts[section.id] !== undefined && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full relative z-10 ${
                          activeSection === section.id
                            ? 'bg-white text-amber-600'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        }`}>
                          {sectionCounts[section.id]}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle - Desktop only */}
      {!isMobile && (
        <div className="px-2 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleCollapse}
            className="w-full flex items-center justify-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all duration-200"
            aria-label={isCollapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
          >
            {isCollapsed ? (
              <CaretRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            ) : (
              <>
                <CaretLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Réduire</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
    </>
  );
}
