'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Search, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Building2,
  MessageSquare,
  MoreHorizontal,
  RefreshCw,
  AlertTriangle,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2
} from 'lucide-react';
import { PendingHolidayRequest } from '@/lib/hooks/useAdminData';

interface HolidayRequestsManagementProps {
  requests: PendingHolidayRequest[];
  loading: boolean;
  error: string | null;
  onApproveRequest: (requestId: string) => Promise<boolean>;
  onRejectRequest: (requestId: string, reason?: string) => Promise<boolean>;
  onDeleteRequest?: (requestId: string) => Promise<boolean>;
  onRefresh: () => void;
}

export function HolidayRequestsManagement({ 
  requests, 
  loading, 
  error, 
  onApproveRequest, 
  onRejectRequest, 
  onDeleteRequest,
  onRefresh 
}: HolidayRequestsManagementProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'vacation' | 'sick' | 'personal'>('all');
  const [selectedRequest, setSelectedRequest] = useState<PendingHolidayRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [requestToReject, setRequestToReject] = useState<PendingHolidayRequest | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    request: PendingHolidayRequest | null;
    action: 'approve' | 'reject';
  }>({ isOpen: false, request: null, action: 'approve' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<PendingHolidayRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: 'periodo' | 'tipo' | 'stato' | 'giorni' | 'richiesta' | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  // Sorting function
  const handleSort = (column: 'periodo' | 'tipo' | 'stato' | 'giorni' | 'richiesta') => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig.key === column && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key: column, direction });
  };

  // Get sort icon
  const getSortIcon = (column: 'periodo' | 'tipo' | 'stato' | 'giorni' | 'richiesta') => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  // Filter, search and sort requests
  const filteredAndSortedRequests = useMemo(() => {
    // First apply filters
    const filtered = requests.filter(request => {
      const matchesSearch = !searchTerm || 
        request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.employeeEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.department?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesType = typeFilter === 'all' || request.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });

    // Then apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'periodo':
            aValue = new Date(a.startDate).getTime();
            bValue = new Date(b.startDate).getTime();
            break;
          case 'tipo':
            // Ordine alfabetico con traduzioni
            const typeOrder = { vacation: t('admin.requests.types.vacation'), sick: t('admin.requests.types.sick'), personal: t('admin.requests.types.personal') };
            aValue = typeOrder[a.type];
            bValue = typeOrder[b.type];
            break;
          case 'stato':
            // Ordine alfabetico con traduzioni
            const statusOrder = { approved: t('admin.requests.statuses.approved'), pending: t('admin.requests.statuses.pending'), rejected: t('admin.requests.statuses.rejected'), cancelled: 'Cancellata' };
            aValue = statusOrder[a.status];
            bValue = statusOrder[b.status];
            break;
          case 'giorni':
            aValue = a.workingDays;
            bValue = b.workingDays;
            break;
          case 'richiesta':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
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
    }

    return filtered;
  }, [requests, searchTerm, statusFilter, typeFilter, sortConfig]);

  const handleApprove = async (request: PendingHolidayRequest) => {
    // Se la richiesta non è pending, mostra dialog di conferma
    if (request.status !== 'pending') {
      setConfirmDialog({
        isOpen: true,
        request,
        action: 'approve'
      });
      return;
    }

    // Procedi direttamente per richieste pending
    setActionLoading(request.id);
    try {
      const success = await onApproveRequest(request.id);
      if (success) {
        // Refresh data to show updated status
        onRefresh();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClick = (request: PendingHolidayRequest) => {
    // Se la richiesta non è pending, mostra dialog di conferma
    if (request.status !== 'pending') {
      setConfirmDialog({
        isOpen: true,
        request,
        action: 'reject'
      });
      return;
    }

    // Per richieste pending, usa il dialog di rifiuto esistente con motivo
    setRequestToReject(request);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!requestToReject) return;
    
    setActionLoading(requestToReject.id);
    try {
      const success = await onRejectRequest(requestToReject.id, rejectionReason);
      if (success) {
        setShowRejectDialog(false);
        setRequestToReject(null);
        setRejectionReason('');
        // Refresh data to show updated status
        onRefresh();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.request) return;

    const { request, action } = confirmDialog;
    setActionLoading(request.id);
    setConfirmDialog({ isOpen: false, request: null, action: 'approve' });

    try {
      const success = action === 'approve' 
        ? await onApproveRequest(request.id)
        : await onRejectRequest(request.id, t('admin.requests.statusChangedByAdmin'));

      if (success) {
        onRefresh();
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete request
  const handleDeleteRequest = async () => {
    if (!requestToDelete || !onDeleteRequest) return;
    
    setIsDeleting(true);
    try {
      const success = await onDeleteRequest(requestToDelete.id);
      if (success) {
        setDeleteDialogOpen(false);
        setRequestToDelete(null);
        onRefresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (request: PendingHolidayRequest) => {
    setRequestToDelete(request);
    setDeleteDialogOpen(true);
  };

  // Close delete dialog
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setRequestToDelete(null);
  };

  const getStatusBadge = (status: PendingHolidayRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800">{t('admin.requests.statuses.pending')}</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">{t('admin.requests.statuses.approved')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">{t('admin.requests.statuses.rejected')}</Badge>;
      default:
        return <Badge variant="outline">Sconosciuto</Badge>;
    }
  };

  const getTypeBadge = (type: PendingHolidayRequest['type']) => {
    switch (type) {
      case 'vacation':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">🏖️ {t('admin.requests.types.vacation')}</Badge>;
      case 'sick':
        return <Badge variant="outline" className="bg-red-100 text-red-800">🏥 {t('admin.requests.types.sick')}</Badge>;
      case 'personal':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">👤 {t('admin.requests.types.personal')}</Badge>;
      default:
        return <Badge variant="outline">Altro</Badge>;
    }
  };

  const getUserInitials = (name: string | undefined | null) => {
    if (!name || typeof name !== 'string') {
      return '??';
    }
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(start);
    }
    
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const approvedRequests = requests.filter(req => req.status === 'approved');
  const rejectedRequests = requests.filter(req => req.status === 'rejected');

  if (loading && requests.length === 0) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <FileText className="h-6 w-6" />
            <span>{t('admin.requests.management')}</span>
          </h2>
          <p className="text-gray-600">
            {requests.length} {t('admin.requests.totalRequests')} • {pendingRequests.length} {t('admin.requests.pending')} • {approvedRequests.length} {t('admin.requests.approved')}
          </p>
        </div>
        <Button onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.requests.pending')}</p>
                <p className="text-2xl font-bold text-amber-600">{pendingRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.requests.approved')}</p>
                <p className="text-2xl font-bold text-green-600">{approvedRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.requests.rejected')}</p>
                <p className="text-2xl font-bold text-red-600">{rejectedRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.requests.total')}</p>
                <p className="text-2xl font-bold text-blue-600">{requests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('admin.requests.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('admin.requests.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.requests.allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('admin.requests.pending')}</SelectItem>
                  <SelectItem value="approved">{t('admin.requests.approved')}</SelectItem>
                  <SelectItem value="rejected">{t('admin.requests.rejected')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('admin.requests.type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.requests.allTypes')}</SelectItem>
                  <SelectItem value="vacation">{t('admin.requests.types.vacation')}</SelectItem>
                  <SelectItem value="sick">{t('admin.requests.types.sick')}</SelectItem>
                  <SelectItem value="personal">{t('admin.requests.types.personal')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Requests Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.requests.employee')}</TableHead>
                  <TableHead>
                    <button 
                      className="flex items-center space-x-1 hover:bg-gray-100 p-1 rounded transition-colors"
                      onClick={() => handleSort('richiesta')}
                      title="Ordina per data richiesta"
                    >
                      <span>{t('admin.requests.request')}</span>
                      {getSortIcon('richiesta')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button 
                      className="flex items-center space-x-1 hover:bg-gray-100 p-1 rounded transition-colors"
                      onClick={() => handleSort('periodo')}
                      title="Ordina per periodo"
                    >
                      <span>{t('admin.requests.period')}</span>
                      {getSortIcon('periodo')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button 
                      className="flex items-center space-x-1 hover:bg-gray-100 p-1 rounded transition-colors"
                      onClick={() => handleSort('giorni')}
                      title="Ordina per giorni"
                    >
                      <span>{t('admin.requests.days')}</span>
                      {getSortIcon('giorni')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button 
                      className="flex items-center space-x-1 hover:bg-gray-100 p-1 rounded transition-colors"
                      onClick={() => handleSort('tipo')}
                      title="Ordina per tipo"
                    >
                      <span>{t('admin.requests.type')}</span>
                      {getSortIcon('tipo')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button 
                      className="flex items-center space-x-1 hover:bg-gray-100 p-1 rounded transition-colors"
                      onClick={() => handleSort('stato')}
                      title="Ordina per stato"
                    >
                      <span>{t('admin.requests.status')}</span>
                      {getSortIcon('stato')}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">{t('admin.requests.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {loading ? t('admin.requests.loadingRequests') : t('admin.requests.noRequestsFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-sm">
                              {getUserInitials(request.employeeName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-gray-900">{request.employeeName}</div>
                            <div className="text-sm text-gray-600">{request.employeeEmail}</div>
                            {request.department && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Building2 className="h-3 w-3" />
                                <span>{request.department}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {formatDate(request.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {formatDateRange(request.startDate, request.endDate)}
                          </div>
                          <div className="text-gray-600 flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{request.workingDays} {t('admin.requests.workingDays').toLowerCase()}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {request.workingDays}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(request.type)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Pulsanti per richieste pending */}
                          {request.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(request)}
                                disabled={actionLoading === request.id}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Approva richiesta"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectClick(request)}
                                disabled={actionLoading === request.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Rifiuta richiesta"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {/* Per richieste approvate: consenti di rifiutare */}
                          {request.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectClick(request)}
                              disabled={actionLoading === request.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Cambia stato ad rifiutata"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Per richieste rifiutate: consenti di approvare */}
                          {request.status === 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(request)}
                              disabled={actionLoading === request.id}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Cambia stato ad approvata"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Delete button - available for all requests */}
                          {onDeleteRequest && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteDialog(request)}
                              disabled={actionLoading === request.id || isDeleting}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Elimina richiesta"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedRequest(request)}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{t('admin.requests.detailsModal.title')}</DialogTitle>
                              </DialogHeader>
                              {selectedRequest && (
                                <div className="space-y-4">
                                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                                    <Avatar className="h-12 w-12 flex-shrink-0">
                                      <AvatarFallback>
                                        {getUserInitials(selectedRequest.employeeName)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <h3 className="font-semibold truncate">{selectedRequest.employeeName}</h3>
                                      <p className="text-sm text-gray-600 break-all">{selectedRequest.employeeEmail}</p>
                                      {selectedRequest.department && (
                                        <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
                                          <Building2 className="h-4 w-4 flex-shrink-0" />
                                          <span className="truncate">{selectedRequest.department}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <label className="font-medium text-gray-700">{t('admin.requests.period')}</label>
                                      <p className="mt-1 text-gray-900">
                                        {formatDateRange(selectedRequest.startDate, selectedRequest.endDate)}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">{t('admin.requests.workingDays')}</label>
                                      <p className="mt-1 text-gray-900">{selectedRequest.workingDays}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">{t('admin.requests.type')}</label>
                                      <div className="mt-1">{getTypeBadge(selectedRequest.type)}</div>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">{t('admin.requests.status')}</label>
                                      <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                                    </div>
                                    <div className="col-span-2">
                                      <label className="font-medium text-gray-700">{t('admin.requests.detailsModal.requestDate')}</label>
                                      <p className="mt-1 text-gray-900">
                                        {formatDate(selectedRequest.createdAt)}
                                      </p>
                                    </div>
                                  </div>

                                  {selectedRequest.notes && (
                                    <div>
                                      <label className="font-medium text-gray-700">{t('admin.requests.detailsModal.notes')}</label>
                                      <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                                        {selectedRequest.notes}
                                      </div>
                                    </div>
                                  )}

                                  {/* Medical Certificate Section for Sick Leave */}
                                  {selectedRequest.type === 'sick' && (
                                    <div className="border-t pt-4">
                                      <label className="font-medium text-gray-700">Certificato Medico</label>
                                      <div className="mt-2">
                                        {selectedRequest.medicalCertificateOption === 'upload' && selectedRequest.medicalCertificateFileName ? (
                                          <div className="flex items-start justify-between p-3 bg-green-50 border border-green-200 rounded-lg gap-3">
                                            <div className="flex items-start space-x-3 min-w-0 flex-1">
                                              <FileText className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                              <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-green-800 break-all">
                                                  File caricato:
                                                </p>
                                                <p className="text-sm text-green-700 break-all font-mono bg-green-100 px-2 py-1 rounded mt-1">
                                                  {selectedRequest.medicalCertificateFileName}
                                                </p>
                                                <p className="text-xs text-green-600 mt-1">
                                                  Certificato medico presente nel sistema
                                                </p>
                                              </div>
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-green-700 border-green-300"
                                              onClick={async () => {
                                                if ((selectedRequest as any).medicalCertificateFileId) {
                                                  try {
                                                    const token = localStorage.getItem('accessToken');
                                                    const baseUrl = process.env.NODE_ENV === 'development' 
                                                      ? 'http://localhost:3000' 
                                                      : window.location.origin;
                                                    
                                                    const response = await fetch(
                                                      `${baseUrl}/.netlify/functions/download-medical-certificate?fileId=${(selectedRequest as any).medicalCertificateFileId}`,
                                                      {
                                                        headers: {
                                                          'Authorization': `Bearer ${token}`
                                                        }
                                                      }
                                                    );

                                                    if (response.ok) {
                                                      // Create a blob from the response
                                                      const blob = await response.blob();
                                                      const url = window.URL.createObjectURL(blob);
                                                      
                                                      // Create a download link and click it
                                                      const a = document.createElement('a');
                                                      a.href = url;
                                                      a.download = selectedRequest.medicalCertificateFileName || 'certificato-medico';
                                                      document.body.appendChild(a);
                                                      a.click();
                                                      document.body.removeChild(a);
                                                      
                                                      // Clean up the URL
                                                      window.URL.revokeObjectURL(url);
                                                    } else {
                                                      alert('Errore durante il download del certificato');
                                                    }
                                                  } catch (error) {
                                                    console.error('Download error:', error);
                                                    alert('Errore durante il download del certificato');
                                                  }
                                                } else {
                                                  alert('File non disponibile nel sistema');
                                                }
                                              }}
                                            >
                                              <Download className="h-4 w-4 mr-1" />
                                              Scarica
                                            </Button>
                                          </div>
                                        ) : selectedRequest.medicalCertificateOption === 'send_later' ? (
                                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                              <Clock className="h-5 w-5 text-blue-600" />
                                              <div>
                                                <p className="text-sm font-medium text-blue-800">
                                                  Impegno a inviare via email
                                                </p>
                                                <p className="text-xs text-blue-600">
                                                  Il dipendente si è impegnato a inviare il certificato medico 
                                                  via email alla direzione aziendale entro 3 giorni lavorativi
                                                </p>
                                                <p className="text-xs text-blue-500 mt-1">
                                                  Status: {selectedRequest.medicalCertificateStatus === 'commitment_pending' ? 'In attesa di ricevimento' : 'Ricevuto'}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                              <AlertTriangle className="h-5 w-5 text-gray-600" />
                                              <div>
                                                <p className="text-sm font-medium text-gray-800">
                                                  Certificato medico non specificato
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                  Il dipendente non ha fornito informazioni sul certificato medico
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.requests.rejectRequest')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t('admin.requests.rejectModal.message')} <strong>{requestToReject?.employeeName}</strong>.
              {' '}{t('admin.requests.rejectModal.optionalMessage')}
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700">{t('admin.requests.rejectModal.reasonLabel')}</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('admin.requests.rejectModal.reasonPlaceholder')}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={actionLoading === requestToReject?.id}
            >
              {t('admin.requests.rejectModal.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={actionLoading === requestToReject?.id}
            >
              {actionLoading === requestToReject?.id ? t('admin.requests.rejecting') : t('admin.requests.rejectRequestButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog di Conferma Cambio Stato */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => 
        setConfirmDialog({ isOpen: open, request: null, action: 'approve' })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('admin.requests.confirmStatusChange')}
            </DialogTitle>
          </DialogHeader>
          {confirmDialog.request && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
                <div>
                  <h4 className="font-medium text-amber-900">{t('admin.requests.statusChangeWarning')}</h4>
                  <p className="text-sm text-amber-700">
                    {t('admin.requests.statusChangeDescription')}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="font-medium text-gray-700">{t('admin.requests.employee')}:</label>
                  <p className="text-gray-900">{confirmDialog.request.employeeName}</p>
                  <p className="text-sm text-gray-600">{confirmDialog.request.employeeEmail}</p>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">{t('admin.requests.requestedPeriod')}</label>
                  <p className="text-gray-900">
                    {formatDate(confirmDialog.request.startDate)} - {formatDate(confirmDialog.request.endDate)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {confirmDialog.request.workingDays} {t('admin.requests.workingDays').toLowerCase()} • {confirmDialog.request.type === 'vacation' ? '🏖️ ' + t('admin.requests.types.vacation') : confirmDialog.request.type === 'sick' ? '🏥 ' + t('admin.requests.types.sick') : '📅 ' + t('admin.requests.types.personal')}
                  </p>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">{t('admin.requests.currentStatus')}</label>
                  <div className="mt-1">{getStatusBadge(confirmDialog.request.status)}</div>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">Nuovo stato:</label>
                  <div className="mt-1">
                    {confirmDialog.action === 'approve' ? (
                      <Badge className="bg-green-100 text-green-800">{t('admin.requests.statuses.approved')}</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">{t('admin.requests.statuses.rejected')}</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <strong>{t('admin.requests.statusChangeNote')}</strong>
                {confirmDialog.action === 'approve' 
                  ? t('admin.requests.statusChangeNoteApprove')
                  : t('admin.requests.statusChangeNoteReject')
                }
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ isOpen: false, request: null, action: 'approve' })}
            >
              {t('admin.requests.cancel')}
            </Button>
            <Button 
              onClick={handleConfirmAction}
              className={confirmDialog.action === 'approve' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
              }
            >
              {confirmDialog.action === 'approve' ? t('admin.requests.confirmApproval') : t('admin.requests.confirmRejection')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              {t('admin.requests.deleteModal.title')}
            </DialogTitle>
          </DialogHeader>
          
          {requestToDelete && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <div>
                    <h4 className="font-medium text-red-900">{t('admin.requests.deleteModal.warning')}</h4>
                    <p className="text-sm text-red-700">
                      {t('admin.requests.deleteModal.message')} <strong>{requestToDelete.employeeName}</strong>? {t('admin.requests.deleteModal.cannotBeUndone')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{t('admin.requests.employee')}:</span>
                  <div>
                    <div className="text-sm font-medium">{requestToDelete.employeeName}</div>
                    <div className="text-xs text-gray-600">{requestToDelete.employeeEmail}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{t('admin.requests.period')}:</span>
                  <span className="text-sm">
                    {formatDateRange(requestToDelete.startDate, requestToDelete.endDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{t('admin.requests.days')}:</span>
                  <span className="text-sm">{requestToDelete.workingDays} {t('admin.requests.workingDays').toLowerCase()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{t('admin.requests.type')}:</span>
                  {getTypeBadge(requestToDelete.type)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{t('admin.requests.status')}:</span>
                  {getStatusBadge(requestToDelete.status)}
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
              {t('admin.requests.deleteModal.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRequest}
              disabled={isDeleting}
              className="min-w-20"
            >
              {isDeleting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>{t('admin.requests.deleteModal.deleting')}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <Trash2 className="h-4 w-4" />
                  <span>{t('admin.requests.deleteModal.delete')}</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}