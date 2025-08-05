'use client';

import { useTranslation } from '@/lib/i18n/provider';

export default function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {t('dashboard.welcome.title', { name: 'Employee' })}
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        {t('dashboard.welcome.subtitle')}
      </p>
      
      {/* Dashboard content will be added later */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">
            {t('dashboard.stats.availableDays')}
          </h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">20</p>
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">
            {t('dashboard.stats.usedDays')}
          </h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">5</p>
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">
            {t('dashboard.stats.pendingRequests')}
          </h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">1</p>
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">
            {t('dashboard.stats.upcomingHolidays')}
          </h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">2</p>
        </div>
      </div>
    </div>
  );
}