'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/hooks/useAuth';
import { Holiday } from '@/lib/hooks/useHolidays';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Filter, RefreshCw, Download, Edit, X, Search, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: 'richiesta' | 'periodo' | 'giorni' | 'tipo' | 'stato' | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  // Helper to get token from localStorage
  const getToken = () => localStorage.getItem('accessToken');

  // Sorting function
  const handleSort = (column: 'richiesta' | 'periodo' | 'giorni' | 'tipo' | 'stato') => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig.key === column && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key: column, direction });
  };

  // Get sort icon
  const getSortIcon = (column: 'richiesta' | 'periodo' | 'giorni' | 'tipo' | 'stato') => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  // Get date-fns locale
  const getDateLocale = () => {
    switch (locale) {
      case 'it': return it;
      case 'es': return es;
      default: return enUS;
    }
  };

  // Filter, search and sort holidays
  const filteredAndSortedHolidays = useMemo(() => {
    // First apply filters
    const filtered = holidays.filter(holiday => {
      const matchesSearch = !searchTerm || 
        holiday.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getTypeLabel(holiday.type).toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusMatch = statusFilter === 'all' || holiday.status === statusFilter;
      const typeMatch = typeFilter === 'all' || holiday.type === typeFilter;
      
      return matchesSearch && statusMatch && typeMatch;
    });

    // Then apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'richiesta':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case 'periodo':
            aValue = new Date(a.startDate).getTime();
            bValue = new Date(b.startDate).getTime();
            break;
          case 'giorni':
            aValue = a.workingDays;
            bValue = b.workingDays;
            break;
          case 'tipo':
            // Use translation keys for type sorting
            const typeOrder = { vacation: t('holidayHistory.types.vacation'), sick: t('holidayHistory.types.sick'), personal: t('holidayHistory.types.personal') };
            aValue = typeOrder[a.type];
            bValue = typeOrder[b.type];
            break;
          case 'stato':
            // Use translation keys for status sorting
            const statusOrder = { approved: t('holidayHistory.statuses.approved'), pending: t('holidayHistory.statuses.pending'), rejected: t('holidayHistory.statuses.rejected'), cancelled: t('holidayHistory.statuses.cancelled') };
            aValue = statusOrder[a.status];
            bValue = statusOrder[b.status];
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Default sorting: most recent first
      filtered.sort((a, b) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
    }

    return filtered;
  }, [holidays, searchTerm, statusFilter, typeFilter, sortConfig]);

  const getTypeIcon = (type: Holiday['type']) => {
    switch (type) {
      case 'vacation': return '🏖️';
      case 'sick': return '🏥';
      case 'personal': return '👤';
      default: return '📅';
    }
  };

  const getTypeLabel = (type: Holiday['type']) => {
    return t(`dashboard.calendar.legendDetails.${type}`);
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
          notes: t('holidayHistory.messages.cancelNote')
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
      toast.error(t('holidayHistory.messages.cancelError'));
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
      toast.error(t('holidayHistory.messages.downloadError'));
    } finally {
      setDownloadingFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  // Handle delete request
  const handleDeleteRequest = async (holiday: Holiday) => {
    if (!getToken()) {
      toast.error(locale === 'it' ? 'Non autorizzato' : locale === 'es' ? 'No autorizado' : 'Not authorized');
      return;
    }

    setIsDeleting(true);
    try {
      const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://localhost:${window.location.port}`
        : '';

      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.port === '3001';

      const response = await fetch(`${baseUrl}/.netlify/functions/delete-holiday-request`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        ...(isDevelopment ? {} : { credentials: 'include' }),
        body: JSON.stringify({
          holidayId: holiday.id
        }),
      });

      if (response.ok) {
        toast.success(locale === 'it' ? 'Richiesta eliminata con successo' : 
                     locale === 'es' ? 'Solicitud eliminada con éxito' : 
                     'Request deleted successfully');
        setDeleteDialogOpen(false);
        setHolidayToDelete(null);
        onRefresh?.();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete request');
      }
    } catch (error) {
      console.error('Delete request error:', error);
      toast.error(t('holidayHistory.messages.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (holiday: Holiday) => {
    setHolidayToDelete(holiday);
    setDeleteDialogOpen(true);
  };

  // Close delete dialog
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setHolidayToDelete(null);
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
          
          {!compact && onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      {/* Filters and Search */}
      {!compact && (
        <CardContent className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={locale === 'it' ? 'Cerca per note o tipo...' : locale === 'es' ? 'Buscar por notas o tipo...' : 'Search by notes or type...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('holidayHistory.filters.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
{t('holidayHistory.filters.allStatuses')}
                  </SelectItem>
                  <SelectItem value="pending">
{t('holidayHistory.statuses.pending')}
                  </SelectItem>
                  <SelectItem value="approved">
{t('holidayHistory.statuses.approved')}
                  </SelectItem>
                  <SelectItem value="rejected">
{t('holidayHistory.statuses.rejected')}
                  </SelectItem>
                  <SelectItem value="cancelled">
{t('holidayHistory.statuses.cancelled')}
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('holidayHistory.filters.type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
{t('holidayHistory.filters.allTypes')}
                  </SelectItem>
                  <SelectItem value="vacation">
                    {t('dashboard.calendar.legendDetails.vacation')}
                  </SelectItem>
                  <SelectItem value="sick">
                    {t('dashboard.calendar.legendDetails.sick')}
                  </SelectItem>
                  <SelectItem value="personal">
                    {t('dashboard.calendar.legendDetails.personal')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      )}
      
      <CardContent>
        {filteredAndSortedHolidays.length === 0 ? (
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
              {filteredAndSortedHolidays.map((holiday) => (
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
{t('holidayHistory.columns.workingDays')}: 
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openDeleteDialog(holiday)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
{t('holidayHistory.actions.delete')}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button 
                          className="flex items-center space-x-1 hover:bg-gray-100 p-1 rounded transition-colors"
                          onClick={() => handleSort('richiesta')}
                          title="Ordina per data richiesta"
                        >
                          <span>{locale === 'it' ? 'Richiesta' : locale === 'es' ? 'Solicitud' : 'Request'}</span>
                          {getSortIcon('richiesta')}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center space-x-1 hover:bg-gray-100 p-1 rounded transition-colors"
                          onClick={() => handleSort('periodo')}
                          title="Ordina per periodo"
                        >
                          <span>{t('dashboard.holidays.dates')}</span>
                          {getSortIcon('periodo')}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center space-x-1 hover:bg-gray-100 p-1 rounded transition-colors"
                          onClick={() => handleSort('giorni')}
                          title="Ordina per giorni"
                        >
                          <span>{t('holidayHistory.columns.days')}</span>
                          {getSortIcon('giorni')}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center space-x-1 hover:bg-gray-100 p-1 rounded transition-colors"
                          onClick={() => handleSort('tipo')}
                          title="Ordina per tipo"
                        >
                          <span>{t('dashboard.holidays.type')}</span>
                          {getSortIcon('tipo')}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button 
                          className="flex items-center space-x-1 hover:bg-gray-100 p-1 rounded transition-colors"
                          onClick={() => handleSort('stato')}
                          title="Ordina per stato"
                        >
                          <span>{t('dashboard.holidays.status')}</span>
                          {getSortIcon('stato')}
                        </button>
                      </TableHead>
                      <TableHead>
                        {locale === 'it' ? 'Note/Motivo' : locale === 'es' ? 'Notas/Motivo' : 'Notes/Reason'}
                      </TableHead>
                      {showActions && <TableHead className="text-right">{t('dashboard.holidays.actions')}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedHolidays.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={showActions ? 7 : 6} className="text-center py-8 text-gray-500">
{t('holidayHistory.messages.noRequests')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedHolidays.map((holiday) => (
                        <TableRow key={holiday.id}>
                          <TableCell>
                            <div className="text-xs text-gray-500">
                              {format(new Date(holiday.createdAt), 'dd MMM yyyy', { locale: getDateLocale() })}
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
                            <div className="flex items-center space-x-2">
                              <span>{getTypeIcon(holiday.type)}</span>
                              <span className="text-sm">{getTypeLabel(holiday.type)}</span>
                            </div>
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
                          {showActions && (
                            <TableCell>
                              <div className="flex space-x-1 justify-end">
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
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => openDeleteDialog(holiday)}
                                  disabled={isDeleting}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
          {t('holidayHistory.actions.delete')}
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              {locale === 'it' ? 'Conferma Eliminazione' : locale === 'es' ? 'Confirmar Eliminación' : 'Confirm Deletion'}
            </DialogTitle>
            <DialogDescription className="text-left">
              {locale === 'it' 
                ? 'Sei sicuro di voler eliminare questa richiesta ferie? Una volta eliminata, non sarà più disponibile e dovrai creare una nuova richiesta se necessario.'
                : locale === 'es'
                ? '¿Estás seguro de que quieres eliminar esta solicitud de vacaciones? Una vez eliminada, ya no estará disponible y tendrás que crear una nueva solicitud si es necesario.'
                : 'Are you sure you want to delete this holiday request? Once deleted, it will no longer be available and you will need to create a new request if necessary.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {holidayToDelete && (
            <div className="py-4 space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {locale === 'it' ? 'Tipo:' : locale === 'es' ? 'Tipo:' : 'Type:'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span>{getTypeIcon(holidayToDelete.type)}</span>
                    <span className="text-sm">{getTypeLabel(holidayToDelete.type)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {locale === 'it' ? 'Date:' : locale === 'es' ? 'Fechas:' : 'Dates:'}
                  </span>
                  <span className="text-sm">
                    {formatDateRange(holidayToDelete.startDate, holidayToDelete.endDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {locale === 'it' ? 'Giorni lavorativi:' : locale === 'es' ? 'Días laborables:' : 'Working days:'}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {formatWorkingDays(holidayToDelete.workingDays)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {locale === 'it' ? 'Stato:' : locale === 'es' ? 'Estado:' : 'Status:'}
                  </span>
                  <StatusBadge status={holidayToDelete.status} />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDeleteDialog}
              disabled={isDeleting}
            >
              {locale === 'it' ? 'Annulla' : locale === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => holidayToDelete && handleDeleteRequest(holidayToDelete)}
              disabled={isDeleting}
              className="min-w-20"
            >
              {isDeleting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>{locale === 'it' ? 'Eliminando...' : locale === 'es' ? 'Eliminando...' : 'Deleting...'}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <Trash2 className="h-4 w-4" />
                  <span>{locale === 'it' ? 'Elimina' : locale === 'es' ? 'Eliminar' : 'Delete'}</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}