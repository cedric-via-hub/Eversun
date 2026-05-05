'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { ClientRecord } from '@/types/client';
import { parseJsonSafe } from '@/lib/utils';
import {
  FileText,
  Lightning,
  Buildings,
  TrendUp,
  Warning,
  CheckCircle,
  Clock,
  Users,
  ArrowUp,
  ArrowDown,
  Calendar,
  CaretDown,
} from '@phosphor-icons/react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  description?: string;
}

function KPICard({
  title,
  value,
  icon,
  color,
  trend,
  description,
}: KPICardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {/* Subtle gradient background */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 bg-gradient-to-br ${color}`} />
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {value}
          </p>
          {description && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {description}
            </p>
          )}
        </div>
        <div
          className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg shadow-slate-200/50 dark:shadow-none transition-transform duration-300 group-hover:scale-110`}
        >
          {icon}
        </div>
      </div>
      {trend !== undefined && trend !== 0 && (
        <div className="relative flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
          {trend > 0 ? (
            <ArrowUp className="h-3.5 w-3.5 text-emerald-500" weight="bold" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-rose-500" weight="bold" />
          )}
          <span
            className={`text-xs font-semibold ${trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
          >
            {Math.abs(trend).toFixed(1)}%
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">vs mois dernier</span>
        </div>
      )}
    </div>
  );
}

interface SectionProgressProps {
  title: string;
  count: number;
  total: number;
  color: string;
}

function SectionProgress({ title, count, total, color }: SectionProgressProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="group relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</span>
        <span className="text-sm font-bold text-slate-900 dark:text-white">
          {count}
          <span className="text-slate-400 dark:text-slate-500 font-normal">/{total}</span>
        </span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
        {percentage.toFixed(1)}% du total
      </p>
    </div>
  );
}

function DashboardOverview() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<
    'week' | 'month' | 'quarter' | 'all'
  >('all');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/clients?limit=10000')
      .then((res) => parseJsonSafe(res))
      .then((response) => {
        const data = (response as any)?.data || response;
        setClients(Array.isArray(data) ? data : []);
        setLoading(false);

        // Store historical snapshot for trend calculation
        const today = new Date().toISOString().split('T')[0];
        const historicalKey = `dashboard-history-${today}`;
        const existingHistory = JSON.parse(
          localStorage.getItem('dashboard-history') || '[]'
        );

        // Check if we already have a snapshot for today
        const todaySnapshot = existingHistory.find(
          (h: any) => h.date === today
        );
        if (!todaySnapshot) {
          const snapshot = {
            date: today,
            totalClients: Array.isArray(data) ? data.length : 0,
            dpEnCours: Array.isArray(data)
              ? data.filter((c: any) => c.section === 'dp-en-cours').length
              : 0,
            dpAccordes: Array.isArray(data)
              ? data.filter((c: any) => c.section === 'dp-accordes').length
              : 0,
            consuelEnCours: Array.isArray(data)
              ? data.filter((c: any) => c.section === 'consuel-en-cours').length
              : 0,
            consuelFinalise: Array.isArray(data)
              ? data.filter((c: any) => c.section === 'consuel-finalise').length
              : 0,
            raccordement: Array.isArray(data)
              ? data.filter((c: any) => c.section === 'raccordement').length
              : 0,
            raccordementMes: Array.isArray(data)
              ? data.filter((c: any) => c.section === 'raccordement-mes').length
              : 0,
          };

          // Keep only last 30 days of history
          const updatedHistory = [...existingHistory, snapshot].slice(-30);
          localStorage.setItem(
            'dashboard-history',
            JSON.stringify(updatedHistory)
          );
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dateDropdownRef.current) return;
      if (!dateDropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDateDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Calculate trends based on historical data
  const calculateTrend = (currentValue: number, metricKey: string): number => {
    const history = JSON.parse(
      localStorage.getItem('dashboard-history') || '[]'
    );
    if (history.length < 2) return 0;

    // Get snapshot from ~30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const targetDate = thirtyDaysAgo.toISOString().split('T')[0];

    const oldSnapshot =
      history.find((h: any) => h.date === targetDate) || history[0];
    const oldValue = oldSnapshot[metricKey] || 0;

    if (oldValue === 0) return 0;
    return ((currentValue - oldValue) / oldValue) * 100;
  };

  // Filter clients based on date range
  const filteredClients = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateRange) {
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return clients.filter(
          (c) => c.dateEnvoi && new Date(c.dateEnvoi) >= weekAgo
        );
      }
      case 'month': {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return clients.filter(
          (c) => c.dateEnvoi && new Date(c.dateEnvoi) >= monthAgo
        );
      }
      case 'quarter': {
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        return clients.filter(
          (c) => c.dateEnvoi && new Date(c.dateEnvoi) >= quarterAgo
        );
      }
      default:
        return clients;
    }
  })();
  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-8">
        {/* Header Skeleton */}
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-8 animate-pulse" />

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>

        {/* Section Progress Skeleton */}
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg p-5 animate-pulse"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalClients = filteredClients.length;
  const dpEnCours = filteredClients.filter(
    (c) => c.section === 'dp-en-cours'
  ).length;
  const dpAccordes = filteredClients.filter(
    (c) => c.section === 'dp-accordes'
  ).length;
  const dpRefuses = filteredClients.filter(
    (c) => c.section === 'dp-refuses'
  ).length;
  const consuelEnCours = filteredClients.filter(
    (c) => c.section === 'consuel-en-cours'
  ).length;
  const consuelFinalise = filteredClients.filter(
    (c) => c.section === 'consuel-finalise'
  ).length;
  const raccordement = filteredClients.filter(
    (c) => c.section === 'raccordement'
  ).length;
  const raccordementMes = filteredClients.filter(
    (c) => c.section === 'raccordement-mes'
  ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate alerts with different priority levels
  const alerts = {
    critical: 0, // 0-1 days (urgent)
    high: 0, // 2-3 days
    medium: 0, // 4-7 days
    total: 0,
  };

  filteredClients.forEach((c) => {
    if (c.section === 'dp-en-cours' && c.dateEstimative) {
      const estimatedDate = new Date(c.dateEstimative);
      estimatedDate.setHours(0, 0, 0, 0);
      const diffTime = estimatedDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        alerts.critical++;
        alerts.total++;
      } else if (diffDays <= 3) {
        alerts.high++;
        alerts.total++;
      } else if (diffDays <= 7) {
        alerts.medium++;
        alerts.total++;
      }
    }
  });

  const completed = dpAccordes + consuelFinalise + raccordementMes;
  const completionRate =
    totalClients > 0 ? ((completed / totalClients) * 100).toFixed(1) : '0';

  return (
    <div className="p-6 md:p-8 min-h-screen bg-slate-50/50 dark:bg-slate-900/50">
      {/* Header élégant avec glassmorphism */}
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 rounded-2xl transform -skew-y-0 opacity-10 blur-3xl" />
        <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
          {/* Decorative gradient orb */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-amber-400/20 to-orange-400/20 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl shadow-lg shadow-slate-700/20">
                  <Buildings className="h-7 w-7 text-white" weight="bold" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Tableau de bord
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                    Vue d&apos;ensemble de vos dossiers et métriques clés
                  </p>
                </div>
              </div>
              
              {/* Date Range Selector moderne */}
              <div className="relative" ref={dateDropdownRef}>
                <button
                  onClick={() => setShowDateDropdown(!showDateDropdown)}
                  aria-haspopup="menu"
                  aria-expanded={showDateDropdown}
                  aria-controls="dashboard-date-range-menu"
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-slate-700 dark:text-slate-200 text-sm font-medium transition-all duration-200 border border-slate-200 dark:border-slate-600"
                >
                  <Calendar className="h-4 w-4 text-slate-500" weight="bold" />
                  <span>
                    {dateRange === 'all' && 'Tout le temps'}
                    {dateRange === 'week' && 'Cette semaine'}
                    {dateRange === 'month' && 'Ce mois'}
                    {dateRange === 'quarter' && 'Ce trimestre'}
                  </span>
                  <CaretDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${showDateDropdown ? 'rotate-180' : ''}`} weight="bold" />
                </button>
                {showDateDropdown && (
                  <div
                    id="dashboard-date-range-menu"
                    role="menu"
                    className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-20 overflow-hidden"
                  >
                    {[
                      { key: 'all', label: 'Tout le temps' },
                      { key: 'week', label: 'Cette semaine' },
                      { key: 'month', label: 'Ce mois' },
                      { key: 'quarter', label: 'Ce trimestre' },
                    ].map((item, index) => (
                      <button
                        key={item.key}
                        onClick={() => {
                          setDateRange(item.key as any);
                          setShowDateDropdown(false);
                        }}
                        role="menuitemradio"
                        aria-checked={dateRange === item.key}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-3"
                      >
                        <div className={`w-2 h-2 rounded-full ${dateRange === item.key ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Badges d'information */}
            <div className="mt-6 flex flex-wrap gap-3">
              {alerts.total > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800">
                  <Warning className="h-4 w-4 text-rose-500" weight="fill" />
                  <span className="text-sm text-rose-700 dark:text-rose-300">
                    <span className="font-semibold">{alerts.total}</span> alertes
                  </span>
                  <div className="flex gap-1 ml-1">
                    {alerts.critical > 0 && (
                      <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded text-[10px] font-bold">
                        {alerts.critical}
                      </span>
                    )}
                    {alerts.high > 0 && (
                      <span className="px-1.5 py-0.5 bg-orange-500 text-white rounded text-[10px] font-bold">
                        {alerts.high}
                      </span>
                    )}
                    {alerts.medium > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold">
                        {alerts.medium}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {completionRate !== '0' && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle className="h-4 w-4 text-emerald-500" weight="fill" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-300">
                    <span className="font-semibold">{completionRate}%</span> complété
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards avec couleurs slate modernes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Dossiers"
          value={totalClients}
          icon={<Users className="h-5 w-5 text-white" weight="bold" />}
          color="from-slate-600 to-slate-700"
          trend={calculateTrend(totalClients, 'totalClients')}
          description="Dossiers actifs"
        />
        <KPICard
          title="En Attente"
          value={dpEnCours + consuelEnCours + raccordement}
          icon={<Clock className="h-5 w-5 text-white" weight="bold" />}
          color="from-amber-500 to-orange-500"
          trend={calculateTrend(
            dpEnCours + consuelEnCours + raccordement,
            'dpEnCours'
          )}
          description="Dossiers en attente"
        />
        <KPICard
          title="Accordés"
          value={dpAccordes + consuelFinalise + raccordementMes}
          icon={<CheckCircle className="h-5 w-5 text-white" weight="bold" />}
          color="from-emerald-500 to-teal-500"
          trend={calculateTrend(
            dpAccordes + consuelFinalise + raccordementMes,
            'dpAccordes'
          )}
          description="Dossiers validés"
        />
        <KPICard
          title="Alertes"
          value={alerts.total}
          icon={<Warning className="h-5 w-5 text-white" weight="bold" />}
          color="from-rose-500 to-pink-500"
          trend={0}
          description="Actions requises"
        />
      </div>

      {/* Section Progress avec titres modernes */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
            <TrendUp className="h-5 w-5 text-slate-600 dark:text-slate-400" weight="bold" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Progression par section
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SectionProgress
            title="DP En cours"
            count={dpEnCours}
            total={totalClients}
            color="bg-gradient-to-r from-blue-500 to-blue-600"
          />
          <SectionProgress
            title="DP Accordés"
            count={dpAccordes}
            total={totalClients}
            color="bg-gradient-to-r from-emerald-500 to-teal-500"
          />
          <SectionProgress
            title="DP Refusés"
            count={dpRefuses}
            total={totalClients}
            color="bg-gradient-to-r from-rose-500 to-pink-500"
          />
          <SectionProgress
            title="Consuel En cours"
            count={consuelEnCours}
            total={totalClients}
            color="bg-gradient-to-r from-amber-500 to-orange-500"
          />
          <SectionProgress
            title="Consuel Finalisés"
            count={consuelFinalise}
            total={totalClients}
            color="bg-gradient-to-r from-emerald-500 to-teal-500"
          />
          <SectionProgress
            title="Raccordement"
            count={raccordement}
            total={totalClients}
            color="bg-gradient-to-r from-violet-500 to-purple-500"
          />
        </div>
      </div>

      {/* Quick Stats modernes avec glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <FileText className="h-5 w-5" weight="bold" />
              </div>
              <h3 className="text-lg font-semibold">Déclarations Préalables</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-white/15 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-colors">
                <p className="text-2xl font-bold">{dpEnCours}</p>
                <p className="text-xs text-blue-100 mt-1">En cours</p>
              </div>
              <div className="text-center p-3 bg-white/15 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-colors">
                <p className="text-2xl font-bold">{dpAccordes}</p>
                <p className="text-xs text-blue-100 mt-1">Accordés</p>
              </div>
              <div className="text-center p-3 bg-white/15 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-colors">
                <p className="text-2xl font-bold">{dpRefuses}</p>
                <p className="text-xs text-blue-100 mt-1">Refusés</p>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <Lightning className="h-5 w-5" weight="bold" />
              </div>
              <h3 className="text-lg font-semibold">Certifications Consuel</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-white/15 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-colors">
                <p className="text-2xl font-bold">{consuelEnCours}</p>
                <p className="text-xs text-amber-100 mt-1">En cours</p>
              </div>
              <div className="text-center p-3 bg-white/15 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-colors">
                <p className="text-2xl font-bold">{consuelFinalise}</p>
                <p className="text-xs text-amber-100 mt-1">Finalisés</p>
              </div>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-30" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <Buildings className="h-5 w-5" weight="bold" />
              </div>
              <h3 className="text-lg font-semibold">Raccordement</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-white/15 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-colors">
                <p className="text-2xl font-bold">{raccordement}</p>
                <p className="text-xs text-emerald-100 mt-1">En cours</p>
              </div>
              <div className="text-center p-3 bg-white/15 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-colors">
                <p className="text-2xl font-bold">{raccordementMes}</p>
                <p className="text-xs text-emerald-100 mt-1">MES</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section modernisée */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Evolution des dossiers */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
              <TrendUp className="h-5 w-5 text-teal-600 dark:text-teal-400" weight="bold" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Évolution des dossiers
            </h3>
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">30 derniers jours</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={(() => {
                const history = JSON.parse(
                  localStorage.getItem('dashboard-history') || '[]'
                );
                return history.map((h: any) => ({
                  date: new Date(h.date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                  }),
                  total: h.totalClients,
                  dpEnCours: h.dpEnCours,
                  accordés:
                    h.dpAccordes + h.consuelFinalise + h.raccordementMes,
                }));
              })()}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                itemStyle={{ color: '#1e293b', fontSize: '13px' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#0f766e"
                strokeWidth={3}
                dot={{ fill: '#0f766e', r: 4 }}
                activeDot={{ r: 6 }}
                name="Total"
              />
              <Line
                type="monotone"
                dataKey="dpEnCours"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ fill: '#f59e0b', r: 4 }}
                activeDot={{ r: 6 }}
                name="DP En cours"
              />
              <Line
                type="monotone"
                dataKey="accordés"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
                name="Accordés"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Répartition par statut */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" weight="bold" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Répartition par section
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={[
                  { name: 'DP En cours', value: dpEnCours, color: '#3b82f6' },
                  { name: 'DP Accordés', value: dpAccordes, color: '#10b981' },
                  { name: 'DP Refusés', value: dpRefuses, color: '#f43f5e' },
                  { name: 'Consuel En cours', value: consuelEnCours, color: '#f59e0b' },
                  { name: 'Consuel Finalisés', value: consuelFinalise, color: '#06b6d4' },
                  { name: 'Raccordement', value: raccordement, color: '#8b5cf6' },
                  { name: 'MES', value: raccordementMes, color: '#14b8a6' },
                ].filter(item => item.value > 0)}
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={3}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) =>
                  percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                }
                labelLine={false}
              >
                {[
                  { color: '#3b82f6' },
                  { color: '#10b981' },
                  { color: '#f43f5e' },
                  { color: '#f59e0b' },
                  { color: '#06b6d4' },
                  { color: '#8b5cf6' },
                  { color: '#14b8a6' },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                itemStyle={{ color: '#1e293b', fontSize: '13px' }}
              />
              <Legend 
                layout="vertical" 
                align="right" 
                verticalAlign="middle"
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardOverview);
