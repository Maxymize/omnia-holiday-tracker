'use client';

import { useState, useMemo } from 'react';
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
  Download
} from 'lucide-react';
import { PendingHolidayRequest } from '@/lib/hooks/useAdminData';

interface HolidayRequestsManagementProps {
  requests: PendingHolidayRequest[];
  loading: boolean;
  error: string | null;
  onApproveRequest: (requestId: string) => Promise<boolean>;
  onRejectRequest: (requestId: string, reason?: string) => Promise<boolean>;
  onRefresh: () => void;
}

export function HolidayRequestsManagement({ 
  requests, 
  loading, 
  error, 
  onApproveRequest, 
  onRejectRequest, 
  onRefresh 
}: HolidayRequestsManagementProps) {
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

  // Filter and search requests
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const matchesSearch = !searchTerm || 
        request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.employeeEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.department?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesType = typeFilter === 'all' || request.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, searchTerm, statusFilter, typeFilter]);

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
        : await onRejectRequest(request.id, 'Stato cambiato dall\'amministratore');

      if (success) {
        onRefresh();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: PendingHolidayRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800">In attesa</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approvata</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rifiutata</Badge>;
      default:
        return <Badge variant="outline">Sconosciuto</Badge>;
    }
  };

  const getTypeBadge = (type: PendingHolidayRequest['type']) => {
    switch (type) {
      case 'vacation':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">🏖️ Ferie</Badge>;
      case 'sick':
        return <Badge variant="outline" className="bg-red-100 text-red-800">🏥 Malattia</Badge>;
      case 'personal':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">👤 Personale</Badge>;
      default:
        return <Badge variant="outline">Altro</Badge>;
    }
  };

  const getUserInitials = (name: string) => {
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
            <span>Gestione Richieste di Ferie</span>
          </h2>
          <p className="text-gray-600">
            {requests.length} richieste totali • {pendingRequests.length} in attesa • {approvedRequests.length} approvate
          </p>
        </div>
        <Button onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
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
                <p className="text-sm text-gray-600">In Attesa</p>
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
                <p className="text-sm text-gray-600">Approvate</p>
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
                <p className="text-sm text-gray-600">Rifiutate</p>
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
                <p className="text-sm text-gray-600">Totali</p>
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
                  placeholder="Cerca per dipendente, email o dipartimento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="pending">In attesa</SelectItem>
                  <SelectItem value="approved">Approvate</SelectItem>
                  <SelectItem value="rejected">Rifiutate</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="vacation">Ferie</SelectItem>
                  <SelectItem value="sick">Malattia</SelectItem>
                  <SelectItem value="personal">Personale</SelectItem>
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
                  <TableHead>Dipendente</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Giorni</TableHead>
                  <TableHead>Richiesta</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {loading ? 'Caricamento richieste...' : 'Nessuna richiesta trovata'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
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
                        <div className="text-sm">
                          <div className="font-medium">
                            {formatDateRange(request.startDate, request.endDate)}
                          </div>
                          <div className="text-gray-600 flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{request.workingDays} giorni lavorativi</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(request.type)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {request.workingDays}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {formatDate(request.createdAt)}
                        </div>
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
                                <DialogTitle>Dettagli Richiesta di Ferie</DialogTitle>
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
                                      <label className="font-medium text-gray-700">Periodo</label>
                                      <p className="mt-1 text-gray-900">
                                        {formatDateRange(selectedRequest.startDate, selectedRequest.endDate)}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">Giorni lavorativi</label>
                                      <p className="mt-1 text-gray-900">{selectedRequest.workingDays}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">Tipo</label>
                                      <div className="mt-1">{getTypeBadge(selectedRequest.type)}</div>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">Stato</label>
                                      <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                                    </div>
                                    <div className="col-span-2">
                                      <label className="font-medium text-gray-700">Data richiesta</label>
                                      <p className="mt-1 text-gray-900">
                                        {formatDate(selectedRequest.createdAt)}
                                      </p>
                                    </div>
                                  </div>

                                  {selectedRequest.notes && (
                                    <div>
                                      <label className="font-medium text-gray-700">Note</label>
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
            <DialogTitle>Rifiuta Richiesta di Ferie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Stai per rifiutare la richiesta di ferie di <strong>{requestToReject?.employeeName}</strong>.
              Puoi aggiungere una motivazione (opzionale).
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700">Motivazione (opzionale)</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Inserisci il motivo del rifiuto..."
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
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={actionLoading === requestToReject?.id}
            >
              {actionLoading === requestToReject?.id ? 'Rifiutando...' : 'Rifiuta Richiesta'}
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
              Conferma Cambio Stato Richiesta
            </DialogTitle>
          </DialogHeader>
          {confirmDialog.request && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
                <div>
                  <h4 className="font-medium text-amber-900">Attenzione: Cambio di Stato</h4>
                  <p className="text-sm text-amber-700">
                    Stai per modificare lo stato di una richiesta già processata.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="font-medium text-gray-700">Dipendente:</label>
                  <p className="text-gray-900">{confirmDialog.request.employeeName}</p>
                  <p className="text-sm text-gray-600">{confirmDialog.request.employeeEmail}</p>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">Periodo richiesto:</label>
                  <p className="text-gray-900">
                    {formatDate(confirmDialog.request.startDate)} - {formatDate(confirmDialog.request.endDate)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {confirmDialog.request.workingDays} giorni lavorativi • {confirmDialog.request.type === 'vacation' ? '🏖️ Ferie' : confirmDialog.request.type === 'sick' ? '🏥 Malattia' : '📅 Permesso'}
                  </p>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">Stato attuale:</label>
                  <div className="mt-1">{getStatusBadge(confirmDialog.request.status)}</div>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">Nuovo stato:</label>
                  <div className="mt-1">
                    {confirmDialog.action === 'approve' ? (
                      <Badge className="bg-green-100 text-green-800">Approvata</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">Rifiutata</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <strong>Nota:</strong> Questa azione cambierà lo stato della richiesta di ferie. 
                {confirmDialog.action === 'approve' 
                  ? ' I giorni di ferie verranno nuovamente allocati al dipendente.' 
                  : ' I giorni di ferie verranno restituiti al dipendente se precedentemente approvati.'
                }
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ isOpen: false, request: null, action: 'approve' })}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleConfirmAction}
              className={confirmDialog.action === 'approve' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
              }
            >
              {confirmDialog.action === 'approve' ? 'Conferma Approvazione' : 'Conferma Rifiuto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}