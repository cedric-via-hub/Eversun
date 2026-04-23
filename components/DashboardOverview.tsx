'use client';

import { useState, useEffect } from 'react';
import { ClientRecord } from '@/types/client';
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
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  description?: string;
}

function KPICard({ title, value, icon, color, trend, description }: KPICardProps) {
  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-white/20 dark:border-slate-700/50 shadow-lg hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.02] group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
            {title}
          </p>
          <p className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
            {value}
          </p>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
              {description}
            </p>
          )}
        </div>
        <div className={`p-4 rounded-xl bg-gradient-to-br ${color} shadow-lg group-hover:scale-[1.05] group-hover:rotate-3 transition-all duration-300`}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
          {trend > 0 ? (
            <ArrowUp className="h-4 w-4 text-success-500" weight="bold" />
          ) : (
            <ArrowDown className="h-4 w-4 text-error-500" weight="bold" />
          )}
          <span className={`text-sm font-bold ${trend > 0 ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>
            {Math.abs(trend)}%
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">vs mois dernier</span>
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
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border border-white/20 dark:border-slate-700/50 shadow-lg hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:scale-[1.02] group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {title}
        </span>
        <span className="text-sm font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
          {count}/{total}
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all duration-500 ease-out ${color} shadow group-hover:shadow-md`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-3">
        {percentage.toFixed(1)}% du total
      </p>
    </div>
  );
}

export default function DashboardOverview() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'all'>('all');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  useEffect(() => {
    fetch('/api/clients?limit=10000')
      .then((res) => res.json())
      .then((response) => {
        const data = response.data || response;
        setClients(Array.isArray(data) ? data : []);
        setLoading(false);

        // Store historical snapshot for trend calculation
        const today = new Date().toISOString().split('T')[0];
        const historicalKey = `dashboard-history-${today}`;
        const existingHistory = JSON.parse(localStorage.getItem('dashboard-history') || '[]');
        
        // Check if we already have a snapshot for today
        const todaySnapshot = existingHistory.find((h: any) => h.date === today);
        if (!todaySnapshot) {
          const snapshot = {
            date: today,
            totalClients: Array.isArray(data) ? data.length : 0,
            dpEnCours: Array.isArray(data) ? data.filter((c: any) => c.section === 'dp-en-cours').length : 0,
            dpAccordes: Array.isArray(data) ? data.filter((c: any) => c.section === 'dp-accordes').length : 0,
            consuelEnCours: Array.isArray(data) ? data.filter((c: any) => c.section === 'consuel-en-cours').length : 0,
            consuelFinalise: Array.isArray(data) ? data.filter((c: any) => c.section === 'consuel-finalise').length : 0,
            raccordement: Array.isArray(data) ? data.filter((c: any) => c.section === 'raccordement').length : 0,
            raccordementMes: Array.isArray(data) ? data.filter((c: any) => c.section === 'raccordement-mes').length : 0,
          };
          
          // Keep only last 30 days of history
          const updatedHistory = [...existingHistory, snapshot].slice(-30);
          localStorage.setItem('dashboard-history', JSON.stringify(updatedHistory));
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Calculate trends based on historical data
  const calculateTrend = (currentValue: number, metricKey: string): number => {
    const history = JSON.parse(localStorage.getItem('dashboard-history') || '[]');
    if (history.length < 2) return 0;

    // Get snapshot from ~30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const targetDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    const oldSnapshot = history.find((h: any) => h.date === targetDate) || history[0];
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
        return clients.filter(c => c.dateEnvoi && new Date(c.dateEnvoi) >= weekAgo);
      }
      case 'month': {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return clients.filter(c => c.dateEnvoi && new Date(c.dateEnvoi) >= monthAgo);
      }
      case 'quarter': {
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        return clients.filter(c => c.dateEnvoi && new Date(c.dateEnvoi) >= quarterAgo);
      }
      default:
        return clients;
    }
  })();
  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-8">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg p-8 animate-pulse" />
        
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
        
        {/* Section Progress Skeleton */}
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg p-5 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalClients = filteredClients.length;
  const dpEnCours = filteredClients.filter((c) => c.section === 'dp-en-cours').length;
  const dpAccordes = filteredClients.filter((c) => c.section === 'dp-accordes').length;
  const dpRefuses = filteredClients.filter((c) => c.section === 'dp-refuses').length;
  const consuelEnCours = filteredClients.filter((c) => c.section === 'consuel-en-cours').length;
  const consuelFinalise = filteredClients.filter((c) => c.section === 'consuel-finalise').length;
  const raccordement = filteredClients.filter((c) => c.section === 'raccordement').length;
  const raccordementMes = filteredClients.filter((c) => c.section === 'raccordement-mes').length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate alerts with different priority levels
  const alerts = {
    critical: 0, // 0-1 days (urgent)
    high: 0,     // 2-3 days
    medium: 0,   // 4-7 days
    total: 0
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
  const completionRate = totalClients > 0 ? ((completed / totalClients) * 100).toFixed(1) : '0';

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg p-8 shadow-md relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:20px_20px]" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <Buildings className="h-6 w-6 text-white" weight="bold" />
              </div>
              <h1 className="text-3xl font-bold text-white">Tableau de bord</h1>
            </div>
            {/* Date Range Selector */}
            <div className="relative">
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white text-sm hover:bg-white/30 transition-colors"
              >
                <Calendar className="h-4 w-4" weight="bold" />
                <span>
                  {dateRange === 'all' && 'Tout le temps'}
                  {dateRange === 'week' && 'Cette semaine'}
                  {dateRange === 'month' && 'Ce mois'}
                  {dateRange === 'quarter' && 'Ce trimestre'}
                </span>
                <CaretDown className="h-4 w-4" weight="bold" />
              </button>
              {showDateDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <button
                    onClick={() => { setDateRange('all'); setShowDateDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg"
                  >
                    Tout le temps
                  </button>
                  <button
                    onClick={() => { setDateRange('week'); setShowDateDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cette semaine
                  </button>
                  <button
                    onClick={() => { setDateRange('month'); setShowDateDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Ce mois
                  </button>
                  <button
                    onClick={() => { setDateRange('quarter'); setShowDateDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors last:rounded-b-lg"
                  >
                    Ce trimestre
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="text-white/80 text-lg mb-4">
            Vue d'ensemble de vos dossiers et métriques clés
          </p>
          <div className="mt-4 flex gap-4">
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white text-sm">
              <span className="font-semibold">{totalClients}</span> dossiers au total
            </div>
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white text-sm">
              <span className="font-semibold">{alerts.total}</span> alertes actives
              {alerts.critical > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 rounded text-xs font-bold">Critique: {alerts.critical}</span>
              )}
              {alerts.high > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-orange-500 rounded text-xs font-bold">Haute: {alerts.high}</span>
              )}
              {alerts.medium > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-500 rounded text-xs font-bold">Moyenne: {alerts.medium}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Dossiers"
          value={totalClients}
          icon={<Users className="h-6 w-6 text-white" weight="bold" />}
          color="from-teal-500 to-cyan-500"
          trend={calculateTrend(totalClients, 'totalClients')}
          description="Dossiers actifs"
        />
        <KPICard
          title="En Attente"
          value={dpEnCours + consuelEnCours + raccordement}
          icon={<Clock className="h-6 w-6 text-white" weight="bold" />}
          color="from-amber-500 to-orange-500"
          trend={calculateTrend(dpEnCours + consuelEnCours + raccordement, 'dpEnCours')}
          description="Dossiers en attente"
        />
        <KPICard
          title="Accordés"
          value={dpAccordes + consuelFinalise + raccordementMes}
          icon={<CheckCircle className="h-6 w-6 text-white" weight="bold" />}
          color="from-emerald-500 to-green-500"
          trend={calculateTrend(dpAccordes + consuelFinalise + raccordementMes, 'dpAccordes')}
          description="Dossiers validés"
        />
        <KPICard
          title="Alertes"
          value={alerts.total}
          icon={<Warning className="h-6 w-6 text-white" weight="bold" />}
          color="from-red-500 to-rose-500"
          trend={0}
          description="Actions requises"
        />
      </div>

      {/* Section Progress */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Progression par section
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SectionProgress
            title="DP En cours"
            count={dpEnCours}
            total={totalClients}
            color="bg-gradient-to-r from-blue-500 to-cyan-500"
          />
          <SectionProgress
            title="DP Accordés"
            count={dpAccordes}
            total={totalClients}
            color="bg-gradient-to-r from-emerald-500 to-green-500"
          />
          <SectionProgress
            title="DP Refusés"
            count={dpRefuses}
            total={totalClients}
            color="bg-gradient-to-r from-red-500 to-rose-500"
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
            color="bg-gradient-to-r from-emerald-500 to-green-500"
          />
          <SectionProgress
            title="Raccordement"
            count={raccordement}
            total={totalClients}
            color="bg-gradient-to-r from-amber-500 to-orange-500"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg p-6 text-white shadow-md hover:shadow transition-all duration-200 hover:scale-[1.01] relative overflow-hidden group">
          <div className="absolute inset-0 bg-grid-white/[0.1] bg-[length:20px_20px]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <FileText className="h-6 w-6" weight="bold" />
              </div>
              <h3 className="text-lg font-semibold">Déclarations Préalables</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-lg">
                <p className="text-3xl font-bold">{dpEnCours}</p>
                <p className="text-xs text-white/80 mt-1">En cours</p>
              </div>
              <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-lg">
                <p className="text-3xl font-bold">{dpAccordes}</p>
                <p className="text-xs text-white/80 mt-1">Accordés</p>
              </div>
              <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-lg">
                <p className="text-3xl font-bold">{dpRefuses}</p>
                <p className="text-xs text-white/80 mt-1">Refusés</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg p-6 text-white shadow-md hover:shadow transition-all duration-200 hover:scale-[1.01] relative overflow-hidden group">
          <div className="absolute inset-0 bg-grid-white/[0.1] bg-[length:20px_20px]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <Lightning className="h-6 w-6" weight="bold" />
              </div>
              <h3 className="text-lg font-semibold">Certifications Consuel</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-lg">
                <p className="text-3xl font-bold">{consuelEnCours}</p>
                <p className="text-xs text-white/80 mt-1">En cours</p>
              </div>
              <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-lg">
                <p className="text-3xl font-bold">{consuelFinalise}</p>
                <p className="text-xs text-white/80 mt-1">Finalisés</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg p-6 text-white shadow-md hover:shadow transition-all duration-200 hover:scale-[1.01] relative overflow-hidden group">
          <div className="absolute inset-0 bg-grid-white/[0.1] bg-[length:20px_20px]" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <Buildings className="h-6 w-6" weight="bold" />
              </div>
              <h3 className="text-lg font-semibold">Raccordement</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-lg">
                <p className="text-3xl font-bold">{raccordement}</p>
                <p className="text-xs text-white/80 mt-1">En cours</p>
              </div>
              <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-lg">
                <p className="text-3xl font-bold">{raccordementMes}</p>
                <p className="text-xs text-white/80 mt-1">MES</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Evolution des dossiers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-md">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendUp className="h-5 w-5 text-teal-500" weight="bold" />
            Évolution des dossiers (30 derniers jours)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={(() => {
              const history = JSON.parse(localStorage.getItem('dashboard-history') || '[]');
              return history.map((h: any) => ({
                date: new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
                total: h.totalClients,
                dpEnCours: h.dpEnCours,
                accordés: h.dpAccordes + h.consuelFinalise + h.raccordementMes,
              }));
            })()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                itemStyle={{ color: '#f9fafb' }}
              />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#14b8a6" strokeWidth={2} name="Total" />
              <Line type="monotone" dataKey="dpEnCours" stroke="#f59e0b" strokeWidth={2} name="DP En cours" />
              <Line type="monotone" dataKey="accordés" stroke="#10b981" strokeWidth={2} name="Accordés" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Répartition par statut */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-md">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-500" weight="bold" />
            Répartition par section
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'DP En cours', value: dpEnCours, color: '#3b82f6' },
                  { name: 'DP Accordés', value: dpAccordes, color: '#10b981' },
                  { name: 'DP Refusés', value: dpRefuses, color: '#ef4444' },
                  { name: 'Consuel En cours', value: consuelEnCours, color: '#f59e0b' },
                  { name: 'Consuel Finalisés', value: consuelFinalise, color: '#10b981' },
                  { name: 'Raccordement', value: raccordement, color: '#f59e0b' },
                  { name: 'MES', value: raccordementMes, color: '#14b8a6' },
                ]}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
              >
                <Cell fill="#3b82f6" />
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
                <Cell fill="#14b8a6" />
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                itemStyle={{ color: '#f9fafb' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
