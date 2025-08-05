'use client';

import { useTranslation } from '@/lib/i18n/provider';

export default function AdminDashboardPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {t('admin.title')}
      </h1>
      
      {/* Admin dashboard content will be added later */}
      <div className="mt-8">
        <p className="text-gray-600">Admin dashboard content coming soon...</p>
      </div>
    </div>
  );
}