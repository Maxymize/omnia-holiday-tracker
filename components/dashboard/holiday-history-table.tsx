'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/hooks/useAuth';
import { Holiday } from '@/lib/hooks/useHolidays';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Calendar, Filter, RefreshCw, Download, Edit, X } from 'lucide-react';
import { format } from 'date-fns';
import { it, enUS, es } from 'date-fns/locale';
import { toast } from '@/lib/utils/toast';

interface HolidayHistoryTableProps {
  holidays: Holiday[];
  loading?: boolean;
  onRefresh?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export function HolidayHistoryTable({ 
  holidays, 
  loading = false, 
  onRefresh,
  showActions = true,
  compact = false 
}: HolidayHistoryTableProps) {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());

  // Helper to get token from localStorage
  const getToken = () => localStorage.getItem('accessToken');

  // Get date-fns locale
  const getDateLocale = () => {
    switch (locale) {
      case 'it': return it;
      case 'es': return es;
      default: return enUS;
    }
  };

  // Filter holidays based on selected filters
  const filteredHolidays = holidays.filter(holiday => {
    const statusMatch = statusFilter === 'all' || holiday.status === statusFilter;
    const typeMatch = typeFilter === 'all' || holiday.type === typeFilter;
    return statusMatch && typeMatch;
  });

  // Sort holidays by start date (most recent first)
  const sortedHolidays = filteredHolidays.sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  const getTypeIcon = (type: Holiday['type']) => {
    switch (type) {
      case 'vacation': return '🏖️';
      case 'sick': return '🏥';
      case 'personal': return '👤';
      default: return '📅';
    }
  };

  const getTypeLabel = (type: Holiday['type']) => {
    return t(`holidays.request.types.${type}`);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateLocale = getDateLocale();
    
    if (start.toDateString() === end.toDateString()) {
      return format(start, 'dd MMM yyyy', { locale: dateLocale });
    }
    
    return `${format(start, 'dd MMM', { locale: dateLocale })} - ${format(end, 'dd MMM yyyy', { locale: dateLocale })}`;
  };

  const formatWorkingDays = (days: number) => {
    if (days === 1) {
      return locale === 'it' ? '1 giorno' : locale === 'es' ? '1 día' : '1 day';
    }
    const dayLabel = locale === 'it' ? 'giorni' : locale === 'es' ? 'días' : 'days';
    return `${days} ${dayLabel}`;
  };

  // Handle edit request - redirect to holiday request page with pre-filled data
  const handleEditRequest = (holiday: Holiday) => {
    router.push(`/${locale}/holiday-request?edit=${holiday.id}`);
  };

  // Handle cancel request
  const handleCancelRequest = async (holiday: Holiday) => {
    if (!getToken()) {
      toast.error(locale === 'it' ? 'Non autorizzato' : locale === 'es' ? 'No autorizado' : 'Not authorized');
      return;
    }

    try {
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://localhost:${window.location.port}`
        : '';

      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.port === '3001';

      const response = await fetch(`${baseUrl}/.netlify/functions/approve-reject-holiday`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        ...(isDevelopment ? {} : { credentials: 'include' }),
        body: JSON.stringify({
          holidayId: holiday.id,
          action: 'reject',
          notes: 'Annullata dal dipendente'
        }),
      });

      if (response.ok) {
        toast.success(locale === 'it' ? 'Richiesta annullata con successo' : 
                     locale === 'es' ? 'Solicitud cancelada con éxito' : 
                     'Request cancelled successfully');
        onRefresh?.();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('Cancel request error:', error);
      toast.error(locale === 'it' ? 'Errore nell\'annullamento della richiesta' : 
                 locale === 'es' ? 'Error al cancelar la solicitud' : 
                 'Failed to cancel request');
    }
  };

  // Handle download medical certificate
  const handleDownloadCertificate = async (holiday: Holiday) => {
    if (!getToken() || !holiday.medicalCertificateFileId) {
      toast.error(locale === 'it' ? 'Certificato non disponibile' : 
                 locale === 'es' ? 'Certificado no disponible' : 
                 'Certificate not available');
      return;
    }

    const fileId = holiday.medicalCertificateFileId;
    setDownloadingFiles(prev => new Set(prev).add(fileId));

    try {
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://localhost:${window.location.port}`
        : '';

      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.port === '3001';

      const response = await fetch(`${baseUrl}/.netlify/functions/download-medical-certificate?fileId=${fileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
        ...(isDevelopment ? {} : { credentials: 'include' }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const contentDisposition = response.headers.get('content-disposition');
        let fileName = 'medical-certificate.pdf';
        
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
          if (fileNameMatch) {
            fileName = fileNameMatch[1];
          }
        }

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success(locale === 'it' ? 'Certificato scaricato con successo' : 
                     locale === 'es' ? 'Certificado descargado con éxito' : 
                     'Certificate downloaded successfully');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download certificate');
      }
    } catch (error) {
      console.error('Download certificate error:', error);
      toast.error(locale === 'it' ? 'Errore nel download del certificato' : 
                 locale === 'es' ? 'Error al descargar el certificado' : 
                 'Failed to download certificate');
    } finally {
      setDownloadingFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{t('dashboard.holidays.title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>{t('dashboard.holidays.title')}</span>
          </CardTitle>
          
          {!compact && (
            <div className="flex items-center space-x-2">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {locale === 'it' ? 'Tutti gli stati' : locale === 'es' ? 'Todos los estados' : 'All statuses'}
                  </SelectItem>
                  <SelectItem value="pending">
                    {locale === 'it' ? 'In attesa' : locale === 'es' ? 'Pendiente' : 'Pending'}
                  </SelectItem>
                  <SelectItem value="approved">
                    {locale === 'it' ? 'Approvate' : locale === 'es' ? 'Aprobadas' : 'Approved'}
                  </SelectItem>
                  <SelectItem value="rejected">
                    {locale === 'it' ? 'Rifiutate' : locale === 'es' ? 'Rechazadas' : 'Rejected'}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {locale === 'it' ? 'Annullate' : locale === 'es' ? 'Canceladas' : 'Cancelled'}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {locale === 'it' ? 'Tutti i tipi' : locale === 'es' ? 'Todos los tipos' : 'All types'}
                  </SelectItem>
                  <SelectItem value="vacation">
                    {t('holidays.request.types.vacation')}
                  </SelectItem>
                  <SelectItem value="sick">
                    {t('holidays.request.types.sick')}
                  </SelectItem>
                  <SelectItem value="personal">
                    {t('holidays.request.types.personal')}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Refresh Button */}
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {sortedHolidays.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('dashboard.holidays.noRequests')}
            </h3>
            <p className="text-gray-600">
              {locale === 'it' ? 'Le tue richieste di ferie appariranno qui una volta create.' :
               locale === 'es' ? 'Tus solicitudes de vacaciones aparecerán aquí una vez creadas.' :
               'Your holiday requests will appear here once created.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {sortedHolidays.map((holiday) => (
                <div key={holiday.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getTypeIcon(holiday.type)}</span>
                      <span className="font-medium">{getTypeLabel(holiday.type)}</span>
                    </div>
                    <StatusBadge status={holiday.status} />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">{t('dashboard.holidays.dates')}: </span>
                      <span>{formatDateRange(holiday.startDate, holiday.endDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">
                        {locale === 'it' ? 'Giorni lavorativi' : locale === 'es' ? 'Días laborables' : 'Working days'}: 
                      </span>
                      <span className="font-medium">{formatWorkingDays(holiday.workingDays)}</span>
                    </div>
                    {holiday.notes && (
                      <div>
                        <span className="text-gray-600">{t('dashboard.holidays.notes')}: </span>
                        <span>{holiday.notes}</span>
                      </div>
                    )}
                    {holiday.status === 'rejected' && holiday.rejectionReason && (
                      <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                        <span className="text-red-700 font-medium text-xs">
                          {locale === 'it' ? 'Motivo del rifiuto:' : locale === 'es' ? 'Motivo del rechazo:' : 'Rejection reason:'}
                        </span>
                        <div className="text-red-800 text-sm mt-1">
                          {holiday.rejectionReason}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">
                        {locale === 'it' ? 'Richiesta' : locale === 'es' ? 'Solicitud' : 'Request'}: 
                      </span>
                      <span>{format(new Date(holiday.createdAt), 'dd MMM yyyy', { locale: getDateLocale() })}</span>
                    </div>
                  </div>

                  {showActions && (
                    <div className="flex space-x-2 pt-2 border-t">
                      {holiday.status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => handleEditRequest(holiday)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            {t('dashboard.holidays.editRequest')}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 text-red-600 hover:text-red-700"
                            onClick={() => handleCancelRequest(holiday)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            {t('dashboard.holidays.cancelRequest')}
                          </Button>
                        </>
                      )}
                      {holiday.type === 'sick' && holiday.medicalCertificateFileId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleDownloadCertificate(holiday)}
                          disabled={downloadingFiles.has(holiday.medicalCertificateFileId!)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          {downloadingFiles.has(holiday.medicalCertificateFileId!) ? 'Scaricando...' : 'Scarica Certificato'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">{t('dashboard.holidays.type')}</TableHead>
                    <TableHead>{t('dashboard.holidays.dates')}</TableHead>
                    <TableHead className="w-[120px]">
                      {locale === 'it' ? 'Giorni' : locale === 'es' ? 'Días' : 'Days'}
                    </TableHead>
                    <TableHead className="w-[120px]">{t('dashboard.holidays.status')}</TableHead>
                    <TableHead>
                      {locale === 'it' ? 'Note/Motivo' : locale === 'es' ? 'Notas/Motivo' : 'Notes/Reason'}
                    </TableHead>
                    <TableHead className="w-[100px]">
                      {locale === 'it' ? 'Richiesta' : locale === 'es' ? 'Solicitud' : 'Request'}
                    </TableHead>
                    {showActions && <TableHead className="w-[120px]">{t('dashboard.holidays.actions')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHolidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{getTypeIcon(holiday.type)}</span>
                          <span className="text-sm">{getTypeLabel(holiday.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDateRange(holiday.startDate, holiday.endDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {formatWorkingDays(holiday.workingDays)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={holiday.status} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 max-w-[150px]">
                          {holiday.notes && (
                            <div className="truncate mb-1">{holiday.notes}</div>
                          )}
                          {holiday.status === 'rejected' && holiday.rejectionReason && (
                            <div className="bg-red-50 border border-red-200 rounded px-2 py-1 text-xs">
                              <div className="text-red-700 font-medium mb-1">
                                {locale === 'it' ? 'Motivo rifiuto:' : locale === 'es' ? 'Motivo rechazo:' : 'Rejection:'}
                              </div>
                              <div className="text-red-800 text-xs leading-tight">
                                {holiday.rejectionReason}
                              </div>
                            </div>
                          )}
                          {!holiday.notes && holiday.status !== 'rejected' && '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-gray-500">
                          {format(new Date(holiday.createdAt), 'dd MMM', { locale: getDateLocale() })}
                        </div>
                      </TableCell>
                      {showActions && (
                        <TableCell>
                          <div className="flex space-x-1">
                            {holiday.status === 'pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleEditRequest(holiday)}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  {t('dashboard.holidays.editRequest')}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 px-2 text-xs text-red-600"
                                  onClick={() => handleCancelRequest(holiday)}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  {t('dashboard.holidays.cancelRequest')}
                                </Button>
                              </>
                            )}
                            {holiday.type === 'sick' && holiday.medicalCertificateFileId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => handleDownloadCertificate(holiday)}
                                disabled={downloadingFiles.has(holiday.medicalCertificateFileId!)}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                {downloadingFiles.has(holiday.medicalCertificateFileId!) ? 'Scaricando...' : 'Scarica'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}