'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, memo } from 'react';
import { parseJsonSafe } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  FileText,
  Wrench,
  CheckCircle,
  Plug,
  ArrowRight,
} from '@phosphor-icons/react';

interface SectionCard {
  title: string;
  description: string;
  icon: React.ElementType;
  targetSection: string;
  gradient: string;
  bgColor: string;
  borderColor: string;
  iconBg: string;
  subSections: { label: string; countKey: string; color: string }[];
}

interface SectionCounts {
  [key: string]: number;
}

const sections: SectionCard[] = [
  {
    title: 'Déclarations Préalables',
    description: 'Gérez les déclarations préalables de travaux',
    icon: FileText,
    targetSection: 'dp-en-cours',
    gradient: 'from-amber-500 to-orange-600',
    bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-500',
    subSections: [
      { label: 'En cours', countKey: 'dp-en-cours', color: 'bg-amber-500' },
      { label: 'Accordés', countKey: 'dp-accordes', color: 'bg-emerald-500' },
      { label: 'Refusés', countKey: 'dp-refuses', color: 'bg-rose-500' },
    ],
  },
  {
    title: 'Installation',
    description: 'Suivi des installations photovoltaïques',
    icon: Wrench,
    targetSection: 'installation',
    gradient: 'from-cyan-500 to-blue-600',
    bgColor: 'bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    iconBg: 'bg-cyan-500',
    subSections: [
      { label: 'En cours', countKey: 'installation', color: 'bg-cyan-500' },
    ],
  },
  {
    title: 'Consuel',
    description: 'Certifications et conformité électrique',
    icon: CheckCircle,
    targetSection: 'consuel-en-cours',
    gradient: 'from-violet-500 to-purple-600',
    bgColor: 'bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
    borderColor: 'border-violet-200 dark:border-violet-800',
    iconBg: 'bg-violet-500',
    subSections: [
      { label: 'En cours', countKey: 'consuel-en-cours', color: 'bg-violet-500' },
      { label: 'Finalisé', countKey: 'consuel-finalise', color: 'bg-emerald-500' },
    ],
  },
  {
    title: 'Raccordement',
    description: 'Demandes de raccordement au réseau',
    icon: Plug,
    targetSection: 'raccordement',
    gradient: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-500',
    subSections: [
      { label: 'En cours', countKey: 'raccordement', color: 'bg-emerald-500' },
      { label: 'MES', countKey: 'raccordement-mes', color: 'bg-teal-500' },
    ],
  },
];

export function HomeContent() {
  const router = useRouter();
  const [counts, setCounts] = useState<SectionCounts>({});

  useEffect(() => {
    fetch('/api/clients/counts')
      .then((res) => parseJsonSafe(res))
      .then((data) => setCounts((data as any)?.counts || {}))
      .catch(() => setCounts({}));
  }, []);

  const handleCardClick = (targetSection: string) => {
    router.push(`/dashboard?section=${targetSection}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 200,
      },
    },
  };

  return (
    <div className="space-y-8">
      {/* Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        {sections.map((section, index) => {
          const Icon = section.icon;
          const totalInSection = section.subSections.reduce((sum, sub) => sum + (counts[sub.countKey] || 0), 0);

          return (
            <motion.button
              key={section.title}
              variants={cardVariants}
              onClick={() => handleCardClick(section.targetSection)}
              className={`group relative overflow-hidden rounded-2xl p-6 border-2 ${section.borderColor} ${section.bgColor} backdrop-blur-sm text-left transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1`}
            >
              {/* Animated gradient overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-r ${section.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

              <div className="relative flex items-start gap-4">
                <div className={`p-3.5 ${section.iconBg} rounded-2xl shadow-lg flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <Icon className="h-7 w-7 text-white" weight="bold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {section.title}
                    </h3>
                    {totalInSection > 0 && (
                      <span className="px-2 py-0.5 bg-white/60 dark:bg-slate-800/60 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {totalInSection}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {section.description}
                  </p>

                  {/* Sub-section badges */}
                  <div className="flex flex-wrap gap-2">
                    {section.subSections.map((sub) => {
                      const count = counts[sub.countKey] || 0;
                      if (count === 0) return null;
                      return (
                        <span
                          key={sub.countKey}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${sub.color} text-white shadow-sm`}
                        >
                          <span className="w-1.5 h-1.5 bg-white rounded-full" />
                          {sub.label}: {count}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-all duration-300 group-hover:translate-x-1" />
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

// Skeleton Loader pendant le chargement
export function HomeContentSkeleton() {
  return (
    <div className="space-y-8">
      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-pulse"
          >
            <div className="flex items-start gap-4">
              <div className="p-3.5 h-14 w-14 bg-slate-200 dark:bg-slate-700 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
