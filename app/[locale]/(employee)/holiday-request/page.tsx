'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/hooks/useAuth';
import { useHolidays } from '@/lib/hooks/useHolidays';
import { MultiStepHolidayRequest } from '@/components/forms/multi-step-holiday-request';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, CheckCircle } from 'lucide-react';
import { toast } from '@/lib/utils/toast';

interface Holiday {
  startDate: string;
  endDate: string;
  status: string;
}

export default function HolidayRequestPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { stats, loading: holidaysLoading } = useHolidays({ viewMode: 'own' });
  const router = useRouter();
  const [existingHolidays, setExistingHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing holidays for conflict checking
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchExistingHolidays();
    }
  }, [isAuthenticated, user]);

  const fetchExistingHolidays = async () => {
    try {
      setIsLoading(true);
      const baseUrl = window.location.origin;

      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${baseUrl}/.netlify/functions/get-holidays`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExistingHolidays(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching existing holidays:', error);
      toast.error('Errore nel caricamento delle ferie esistenti');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    // FIXED: This function now only handles success/error UI and navigation
    // All API calls are handled by the MultiStepHolidayRequest component
    setIsSubmitting(true);
    console.log('Holiday request completed successfully:', data);
    
    try {
      // Get the API response data 
      const apiResponse = data.apiResponse;
      const isAutoApproved = apiResponse?.data?.status === 'approved';
      
      // Show success message based on approval mode
      if (isAutoApproved) {
        toast.success('✅ Richiesta ferie approvata automaticamente!', 
          'La tua richiesta è stata automaticamente approvata ed è già attiva.'
        );
      } else {
        toast.success('✅ Richiesta ferie inviata con successo!', 
          'La tua richiesta è stata inviata per approvazione.'
        );
      }
      
      // Redirect back to dashboard after a short delay
      setTimeout(() => {
        router.push('/it/employee-dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error in post-submission handling:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Show loading while auth is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('forms.holidays.pageContent.loadingText')}</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.push('/it/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('forms.holidays.pageContent.backButton')}</span>
            </Button>
          </div>
          
          <div className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-lg p-6 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold">
              {t('forms.holidays.request.title')}
            </h1>
            <p className="mt-2 text-blue-100">
              {t('forms.holidays.pageContent.subtitle')}
            </p>
          </div>
        </div>

        {/* Quick Stats - Real-time data */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="flex items-center p-4">
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">{t('forms.holidays.pageContent.statsCards.availableDays')}</p>
                {holidaysLoading ? (
                  <div className="animate-pulse h-8 bg-gray-200 rounded w-12"></div>
                ) : (
                  <p className="text-2xl font-bold text-blue-600">
                    {user?.holidayAllowance || 25}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-4">
              <Clock className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">{t('forms.holidays.pageContent.statsCards.pendingRequests')}</p>
                {holidaysLoading ? (
                  <div className="animate-pulse h-8 bg-gray-200 rounded w-12"></div>
                ) : (
                  <p className="text-2xl font-bold text-orange-600">
                    {stats?.pendingRequests || 0}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-4">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">{t('forms.holidays.pageContent.statsCards.approvedRequests')}</p>
                {holidaysLoading ? (
                  <div className="animate-pulse h-8 bg-gray-200 rounded w-12"></div>
                ) : (
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.approvedRequests || 0}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Form */}
        <div className="mb-8">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">{t('forms.holidays.pageContent.loadingData')}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <MultiStepHolidayRequest
              existingHolidays={existingHolidays}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isSubmitting}
              className="bg-white"
            />
          )}
        </div>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('forms.holidays.pageContent.helpSection.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{t('forms.holidays.pageContent.helpSection.leaveTypes.title')}</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• {t('forms.holidays.pageContent.helpSection.leaveTypes.vacation')}</li>
                  <li>• {t('forms.holidays.pageContent.helpSection.leaveTypes.sick')}</li>
                  <li>• {t('forms.holidays.pageContent.helpSection.leaveTypes.personal')}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{t('forms.holidays.pageContent.helpSection.approvalProcess.title')}</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• {t('forms.holidays.pageContent.helpSection.approvalProcess.managerReview')}</li>
                  <li>• {t('forms.holidays.pageContent.helpSection.approvalProcess.approvalTime')}</li>
                  <li>• {t('forms.holidays.pageContent.helpSection.approvalProcess.emailNotification')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}