'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/hooks/useAuth';
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
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:8888' 
        : window.location.origin;

      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${baseUrl}/.netlify/functions/get-holidays-mock`, {
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
    setIsSubmitting(true);
    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:8888' 
        : window.location.origin;

      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${baseUrl}/.netlify/functions/holidays/create-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          startDate: data.startDate.toISOString().split('T')[0],
          endDate: data.endDate.toISOString().split('T')[0],
          type: data.type,
          notes: data.notes || '',
          workingDays: data.workingDays
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante la creazione della richiesta');
      }

      toast.success('Richiesta inviata con successo!', 'La tua richiesta di ferie è stata inviata per l\'approvazione.');
      
      // Redirect back to dashboard after a short delay
      setTimeout(() => {
        router.push('/it/employee-dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error creating holiday request:', error);
      throw error; // Let the form handle error display
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
          <p className="mt-4 text-gray-600">Caricamento...</p>
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
              <span>Indietro</span>
            </Button>
          </div>
          
          <div className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-lg p-6 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold">
              {t('holidays.request.title')}
            </h1>
            <p className="mt-2 text-blue-100">
              Compila il modulo per richiedere giorni di ferie, malattia o permessi personali
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="flex items-center p-4">
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Giorni disponibili</p>
                <p className="text-2xl font-bold text-blue-600">20</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-4">
              <Clock className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">In attesa</p>
                <p className="text-2xl font-bold text-orange-600">1</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-4">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Approvate</p>
                <p className="text-2xl font-bold text-green-600">3</p>
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
                  <p className="mt-4 text-gray-600">Caricamento dati...</p>
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
            <CardTitle className="text-lg">Informazioni Utili</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Tipi di Assenza</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• <strong>Ferie:</strong> Vengono scalate dal monte ore annuale</li>
                  <li>• <strong>Malattia:</strong> Richiedono certificato medico</li>
                  <li>• <strong>Permesso Personale:</strong> Per esigenze familiari</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Processo di Approvazione</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Le richieste vengono inviate al manager</li>
                  <li>• Tempi di approvazione: 1-3 giorni lavorativi</li>
                  <li>• Riceverai una notifica via email</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}