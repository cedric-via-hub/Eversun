import dynamic from 'next/dynamic';

// Lazy load des composants lourds
export const DashboardOverview = dynamic(() => import('@/components/DashboardOverview'), {
  loading: () => (
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
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg p-4 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
        ))}
      </div>
    </div>
  ),
  ssr: false, // Désactiver SSR pour les composants avec beaucoup de données
});

export const ClientTable = dynamic(() => import('@/components/ClientTable'), {
  loading: () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  ),
});

export const ClientModal = dynamic(() => import('@/components/ClientModal'), {
  loading: () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
  ssr: false,
});