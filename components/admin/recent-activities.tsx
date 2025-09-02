'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  UserCheck, 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter,
  Trash2,
  RefreshCw,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  Activity,
  Clock,
  User,
  Mail,
  MoreHorizontal,
  Eye,
  Loader2
} from 'lucide-react';

// Definizione delle interfacce TypeScript seguendo i pattern del progetto
interface Activity {
  id: string;
  type: 'holiday_request' | 'employee_registration' | 'holiday_approved' | 'holiday_rejected';
  title: string;
  description: string;
  date: string; // ISO date
  user: {
    name: string;
    email: string;
  };
  status?: string;
}

interface RecentActivitiesProps {
  activities: Activity[];
  loading: boolean;
  onDeleteActivities: (activityIds: string[]) => Promise<void>;
  onRefresh: () => void;
}

// Configurazione paginazione
const PAGINATION_OPTIONS = [10, 25, 50, 100] as const;
type PaginationSize = typeof PAGINATION_OPTIONS[number];

// Tipologie di ordinamento
type SortOrder = 'newest' | 'oldest';

export function RecentActivities({
  activities,
  loading,
  onDeleteActivities,
  onRefresh
}: RecentActivitiesProps) {
  const { t } = useTranslation();

  // Stati per gestione UI
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | Activity['type']>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PaginationSize>(10);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Utility per i tipi di attività con icone e stili
  const getActivityTypeInfo = useCallback((type: Activity['type']) => {
    switch (type) {
      case 'holiday_request':
        return {
          label: t('admin.activities.holidayRequest'),
          icon: FileText,
          badgeClass: 'bg-blue-100 text-blue-800',
        };
      case 'employee_registration':
        return {
          label: t('admin.activities.employeeRegistration'),
          icon: UserCheck,
          badgeClass: 'bg-purple-100 text-purple-800',
        };
      case 'holiday_approved':
        return {
          label: t('admin.activities.holidayApproved'),
          icon: CheckCircle,
          badgeClass: 'bg-green-100 text-green-800',
        };
      case 'holiday_rejected':
        return {
          label: t('admin.activities.holidayRejected'),
          icon: XCircle,
          badgeClass: 'bg-red-100 text-red-800',
        };
      default:
        return {
          label: 'Attività',
          icon: Activity,
          badgeClass: 'bg-gray-100 text-gray-800',
        };
    }
  }, [t]);

  // Filtro e ordinamento delle attività
  const filteredAndSortedActivities = useMemo(() => {
    const filtered = activities.filter(activity => {
      // Filtro per termine di ricerca
      const matchesSearch = !searchTerm || 
        activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.user.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro per tipo
      const matchesType = typeFilter === 'all' || activity.type === typeFilter;

      return matchesSearch && matchesType;
    });

    // Ordinamento per data
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [activities, searchTerm, typeFilter, sortOrder]);

  // Paginazione
  const totalPages = Math.ceil(filteredAndSortedActivities.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedActivities = filteredAndSortedActivities.slice(startIndex, startIndex + pageSize);

  // Reset page when filters change
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Effect per reset paginazione quando cambiano i filtri
  useState(() => {
    resetPagination();
  });

  // Gestione selezione attività
  const toggleActivitySelection = useCallback((activityId: string) => {
    setSelectedActivities(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(activityId)) {
        newSelection.delete(activityId);
      } else {
        newSelection.add(activityId);
      }
      return newSelection;
    });
  }, []);

  // Seleziona/deseleziona tutte le attività visibili
  const toggleSelectAll = useCallback(() => {
    if (selectedActivities.size === paginatedActivities.length) {
      setSelectedActivities(new Set());
    } else {
      setSelectedActivities(new Set(paginatedActivities.map(a => a.id)));
    }
  }, [selectedActivities.size, paginatedActivities]);

  // Gestione eliminazione attività
  const handleDeleteSelected = useCallback(async () => {
    if (selectedActivities.size === 0) return;

    setDeleteLoading(true);
    try {
      await onDeleteActivities(Array.from(selectedActivities));
      setSelectedActivities(new Set());
      setShowDeleteDialog(false);
      
      // Reset alla prima pagina se non ci sono più attività nella pagina corrente
      const remainingActivities = filteredAndSortedActivities.length - selectedActivities.size;
      const maxPage = Math.ceil(remainingActivities / pageSize);
      if (currentPage > maxPage && maxPage > 0) {
        setCurrentPage(maxPage);
      }
    } catch (error) {
      console.error('Errore durante l\'eliminazione delle attività:', error);
    } finally {
      setDeleteLoading(false);
    }
  }, [selectedActivities, onDeleteActivities, filteredAndSortedActivities.length, pageSize, currentPage]);

  // Navigazione paginazione
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  // Utility per tradurre titoli e descrizioni delle attività
  const translateActivityContent = useCallback((activity: Activity) => {
    let translatedTitle = activity.title;
    let translatedDescription = activity.description;

    // Traduci i titoli
    if (activity.title.startsWith('Richiesta ferie -')) {
      const userName = activity.title.replace('Richiesta ferie - ', '');
      translatedTitle = `${t('admin.activities.holidayRequest')} - ${userName}`;
    } else if (activity.title.includes('Ferie approvate -')) {
      const userName = activity.title.replace('Ferie approvate - ', '');
      translatedTitle = `${t('admin.activities.holidayApproved')} - ${userName}`;
    } else if (activity.title.includes('Ferie rifiutate -') || activity.title.includes('Ferie respinte -')) {
      const userName = activity.title.replace(/Ferie (rifiutate|respinte) - /, '');
      translatedTitle = `${t('admin.activities.holidayRejected')} - ${userName}`;
    } else if (activity.title.startsWith('Nuovo dipendente registrato -')) {
      const userName = activity.title.replace('Nuovo dipendente registrato - ', '');
      translatedTitle = `${t('admin.activities.employeeRegistration')} - ${userName}`;
    }

    // Traduci le descrizioni
    if (activity.description.includes('Richiesta ferie dal')) {
      // Esempio: "Richiesta ferie dal 2025-10-28 al 2025-10-29 (2 giorni lavorativi)"
      const match = activity.description.match(/Richiesta ferie dal ([\d-]+) al ([\d-]+) \((\d+) giorni? lavorativ[io]\)/);
      if (match) {
        const [, startDate, endDate, workingDays] = match;
        const daysText = parseInt(workingDays) === 1 ? t('admin.activities.workingDay') : t('admin.activities.workingDays');
        translatedDescription = `${t('admin.activities.holidayRequestFrom')} ${startDate} ${t('admin.activities.to')} ${endDate} (${workingDays} ${daysText})`;
      }
    } else if (activity.description.includes('Le ferie dal')) {
      // Esempio: "Le ferie dal 2025-10-28 al 2025-10-29 sono state approvate/rifiutate"
      const match = activity.description.match(/Le ferie dal ([\d-]+) al ([\d-]+) sono state (approvate|rifiutate)/);
      if (match) {
        const [, startDate, endDate, action] = match;
        const actionText = action === 'approvate' ? t('admin.activities.holidayApproved').toLowerCase() : t('admin.activities.holidayRejected').toLowerCase();
        translatedDescription = `Holidays ${t('admin.activities.from')} ${startDate} ${t('admin.activities.to')} ${endDate} were ${actionText}`;
      }
    }

    return {
      ...activity,
      title: translatedTitle,
      description: translatedDescription
    };
  }, [t]);

  // Utility per formattare la data
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 60) {
      return diffMinutes <= 1 ? t('admin.activities.justNow') : `${diffMinutes} ${t('admin.activities.minutesAgo')}`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? `1 ${t('admin.activities.hourAgo')}` : `${diffHours} ${t('admin.activities.hoursAgo')}`;
    } else if (diffDays === 1) {
      return t('admin.activities.dayAgo');
    } else if (diffDays < 7) {
      return `${diffDays} ${t('admin.activities.daysAgo')}`;
    } else {
      return date.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }, [t]);

  // Loading skeleton
  if (loading && activities.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con statistiche */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Activity className="h-6 w-6" />
            <span>{t('admin.activities.title')}</span>
          </h2>
          <p className="text-gray-600">
            {filteredAndSortedActivities.length} {t('admin.activities.totalActivities')}
            {selectedActivities.size > 0 && ` • ${selectedActivities.size} ${t('admin.activities.selected')}`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {selectedActivities.size > 0 && (
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('admin.activities.delete')} ({selectedActivities.size})
            </Button>
          )}
          <Button 
            onClick={onRefresh} 
            disabled={loading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('admin.activities.refresh')}
          </Button>
        </div>
      </div>

      {/* Filtri e ricerca */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Ricerca */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('admin.activities.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    resetPagination();
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Filtri */}
            <div className="flex gap-2">
              <Select 
                value={typeFilter} 
                onValueChange={(value: any) => {
                  setTypeFilter(value);
                  resetPagination();
                }}
              >
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo attività" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.activities.allTypes')}</SelectItem>
                  <SelectItem value="holiday_request">Richieste Ferie</SelectItem>
                  <SelectItem value="employee_registration">Registrazioni</SelectItem>
                  <SelectItem value="holiday_approved">Ferie Approvate</SelectItem>
                  <SelectItem value="holiday_rejected">Ferie Rifiutate</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              >
                {sortOrder === 'newest' ? (
                  <ArrowDown className="h-4 w-4 mr-2" />
                ) : (
                  <ArrowUp className="h-4 w-4 mr-2" />
                )}
                {sortOrder === 'newest' ? t('admin.activities.mostRecent') : 'Più vecchie'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Lista attività */}
          {filteredAndSortedActivities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna attività trovata</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || typeFilter !== 'all' 
                  ? 'Prova a modificare i filtri di ricerca.'
                  : 'Non ci sono attività recenti da mostrare.'
                }
              </p>
              {(searchTerm || typeFilter !== 'all') && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('all');
                    resetPagination();
                  }}
                >
                  Rimuovi filtri
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header selezione */}
              {paginatedActivities.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedActivities.size === paginatedActivities.length && paginatedActivities.length > 0}
                      onCheckedChange={toggleSelectAll}
                      className="scale-50"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {selectedActivities.size > 0 
                        ? `${selectedActivities.size} ${t('admin.activities.selectedOf')} ${paginatedActivities.length} ${t('admin.activities.selected')}`
                        : t('admin.activities.selectAll')
                      }
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>{t('admin.activities.showPerPage')}</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(Number(value) as PaginationSize);
                        resetPagination();
                      }}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGINATION_OPTIONS.map(option => (
                          <SelectItem key={option} value={option.toString()}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Lista attività */}
              <div className="space-y-2">
                {paginatedActivities.map((activity) => {
                  const translatedActivity = translateActivityContent(activity);
                  const typeInfo = getActivityTypeInfo(activity.type);
                  const IconComponent = typeInfo.icon;
                  const isSelected = selectedActivities.has(activity.id);

                  return (
                    <div
                      key={activity.id}
                      className={`flex items-center space-x-4 p-4 border rounded-lg transition-colors ${
                        isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Checkbox selezione */}
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleActivitySelection(activity.id)}
                        className="scale-50"
                      />

                      {/* Icona tipo attività */}
                      <div className="p-2 bg-white rounded-full border">
                        <IconComponent className="h-4 w-4 text-gray-600" />
                      </div>

                      {/* Contenuto attività */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {translatedActivity.title}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {translatedActivity.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                              <User className="h-3 w-3" />
                              <span className="truncate">{activity.user.name}</span>
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{activity.user.email}</span>
                            </div>
                          </div>
                          
                          {/* Badge e data */}
                          <div className="flex flex-col items-end space-y-2 ml-4">
                            <Badge className={typeInfo.badgeClass}>
                              {typeInfo.label}
                            </Badge>
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDate(activity.date)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginazione */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Mostra {startIndex + 1}-{Math.min(startIndex + pageSize, filteredAndSortedActivities.length)} di {filteredAndSortedActivities.length} attività
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <span className="text-sm text-gray-600 px-2">
                      Pagina {currentPage} di {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog conferma eliminazione */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>{t('admin.activities.confirmDelete')}</span>
            </DialogTitle>
            <DialogDescription>
              {t('admin.activities.deleteConfirmation').replace('{count}', selectedActivities.size.toString())} {' '}
              {t('admin.activities.deleteWarning')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('admin.activities.deleteAuditWarning')}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteLoading}
            >
              {t('admin.activities.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('admin.activities.deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('admin.activities.deleteActivities')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}