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
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Search, 
  Filter, 
  UserCheck, 
  UserX, 
  Mail, 
  Calendar,
  Clock,
  Shield,
  Building2,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  Edit3
} from 'lucide-react';
import { Employee, Department } from '@/lib/hooks/useAdminData';

interface EmployeeManagementProps {
  employees: Employee[];
  departments: Department[];
  loading: boolean;
  error: string | null;
  onApproveEmployee: (employeeId: string) => Promise<boolean>;
  onRejectEmployee: (employeeId: string) => Promise<boolean>;
  onRefresh: () => void;
}

export function EmployeeManagement({ 
  employees, 
  departments,
  loading, 
  error, 
  onApproveEmployee, 
  onRejectEmployee, 
  onRefresh 
}: EmployeeManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'employee'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    employee: Employee | null;
    action: 'approve' | 'reject';
  }>({ isOpen: false, employee: null, action: 'approve' });
  
  // Department assignment state
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [assigningEmployee, setAssigningEmployee] = useState<Employee | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Filter and search employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = !searchTerm || 
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.departmentName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
      const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
      
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [employees, searchTerm, statusFilter, roleFilter]);

  const handleApprove = async (employee: Employee) => {
    // Se il dipendente non è pending, mostra dialog di conferma
    if (employee.status !== 'pending') {
      setConfirmDialog({
        isOpen: true,
        employee,
        action: 'approve'
      });
      return;
    }

    // Procedi direttamente per dipendenti pending
    setActionLoading(employee.id);
    try {
      const success = await onApproveEmployee(employee.id);
      if (success) {
        // Success feedback will be handled by the parent component
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (employee: Employee) => {
    // Se il dipendente non è pending, mostra dialog di conferma
    if (employee.status !== 'pending') {
      setConfirmDialog({
        isOpen: true,
        employee,
        action: 'reject'
      });
      return;
    }

    // Procedi direttamente per dipendenti pending
    setActionLoading(employee.id);
    try {
      const success = await onRejectEmployee(employee.id);
      if (success) {
        // Success feedback will be handled by the parent component
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.employee) return;

    const { employee, action } = confirmDialog;
    setActionLoading(employee.id);
    setConfirmDialog({ isOpen: false, employee: null, action: 'approve' });

    try {
      const success = action === 'approve' 
        ? await onApproveEmployee(employee.id)
        : await onRejectEmployee(employee.id);

      if (success) {
        // Success feedback will be handled by the parent component
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignDepartment = async () => {
    if (!assigningEmployee) return;

    setAssignLoading(true);
    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000'
        : window.location.origin;

      const response = await fetch(`${baseUrl}/.netlify/functions/assign-employee-department`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          employeeId: assigningEmployee.id,
          departmentId: selectedDepartment === 'none' ? null : selectedDepartment
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign department');
      }

      // Reset form and close dialog
      setAssigningEmployee(null);
      setSelectedDepartment('');
      setShowDepartmentDialog(false);
      
      // Refresh data
      onRefresh();
    } catch (err) {
      console.error('Error assigning department:', err);
      // TODO: Show error toast
    } finally {
      setAssignLoading(false);
    }
  };

  const openDepartmentDialog = (employee: Employee) => {
    setAssigningEmployee(employee);
    setSelectedDepartment(employee.department || '');
    setShowDepartmentDialog(true);
  };

  const getStatusBadge = (status: Employee['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Attivo</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800">In attesa</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inattivo</Badge>;
      default:
        return <Badge variant="outline">Sconosciuto</Badge>;
    }
  };

  const getRoleBadge = (role: Employee['role']) => {
    return role === 'admin' ? (
      <Badge variant="outline" className="bg-purple-100 text-purple-800">
        <Shield className="h-3 w-3 mr-1" />
        Admin
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-blue-100 text-blue-800">
        <Users className="h-3 w-3 mr-1" />
        Dipendente
      </Badge>
    );
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const pendingEmployees = employees.filter(emp => emp.status === 'pending');
  const activeEmployees = employees.filter(emp => emp.status === 'active');
  const totalHolidaysUsed = employees.reduce((sum, emp) => sum + emp.holidaysUsed, 0);

  if (loading && employees.length === 0) {
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
            <Users className="h-6 w-6" />
            <span>Gestione Dipendenti</span>
          </h2>
          <p className="text-gray-600">
            {employees.length} dipendenti totali • {activeEmployees.length} attivi • {pendingEmployees.length} in attesa
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Dipendenti Totali</p>
                <p className="text-2xl font-bold text-blue-600">{employees.length}</p>
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
                <p className="text-sm text-gray-600">Dipendenti Attivi</p>
                <p className="text-2xl font-bold text-green-600">{activeEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Attesa Approvazione</p>
                <p className="text-2xl font-bold text-amber-600">{pendingEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Giorni Ferie Utilizzati</p>
                <p className="text-2xl font-bold text-purple-600">{totalHolidaysUsed}</p>
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
                  placeholder="Cerca per nome, email o dipartimento..."
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
                  <SelectItem value="active">Attivi</SelectItem>
                  <SelectItem value="pending">In attesa</SelectItem>
                  <SelectItem value="inactive">Inattivi</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i ruoli</SelectItem>
                  <SelectItem value="employee">Dipendenti</SelectItem>
                  <SelectItem value="admin">Amministratori</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Employee Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dipendente</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Dipartimento</TableHead>
                  <TableHead>Ferie</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {loading ? 'Caricamento dipendenti...' : 'Nessun dipendente trovato'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-sm">
                              {getUserInitials(employee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-gray-900">{employee.name}</div>
                            <div className="text-sm text-gray-600">{employee.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(employee.status)}
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(employee.role)}
                      </TableCell>
                      <TableCell>
                        {employee.departmentName ? (
                          <div className="flex items-center space-x-1">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{employee.departmentName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Nessun dipartimento</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {employee.holidaysRemaining}/{employee.holidayAllowance} giorni
                          </div>
                          <div className="text-gray-600">
                            {employee.holidaysUsed} utilizzati
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Mostra pulsanti basati sullo stato attuale */}
                          {employee.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(employee)}
                                disabled={actionLoading === employee.id}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Approva dipendente"
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(employee)}
                                disabled={actionLoading === employee.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Rifiuta dipendente"
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {/* Per dipendenti attivi/approvati: consenti di rifiutare */}
                          {employee.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(employee)}
                              disabled={actionLoading === employee.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title={`Cambia stato da ${employee.status === 'active' ? 'attivo' : 'approvato'} a rifiutato`}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Per dipendenti rifiutati: consenti di approvare */}
                          {employee.status === 'inactive' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(employee)}
                              disabled={actionLoading === employee.id}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Cambia stato da rifiutato ad approvato"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Assegna Dipartimento Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDepartmentDialog(employee)}
                            title="Assegna dipartimento"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedEmployee(employee)}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Dettagli Dipendente</DialogTitle>
                              </DialogHeader>
                              {selectedEmployee && (
                                <div className="space-y-4">
                                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                                    <Avatar className="h-12 w-12">
                                      <AvatarFallback>
                                        {getUserInitials(selectedEmployee.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <h3 className="font-semibold">{selectedEmployee.name}</h3>
                                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <Mail className="h-4 w-4" />
                                        <span>{selectedEmployee.email}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <label className="font-medium text-gray-700">Stato</label>
                                      <div className="mt-1">{getStatusBadge(selectedEmployee.status)}</div>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">Ruolo</label>
                                      <div className="mt-1">{getRoleBadge(selectedEmployee.role)}</div>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">Dipartimento</label>
                                      <p className="mt-1 text-gray-900">
                                        {selectedEmployee.departmentName || 'Nessuno'}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">Registrato il</label>
                                      <p className="mt-1 text-gray-900">
                                        {new Date(selectedEmployee.createdAt).toLocaleDateString('it-IT')}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">Giorni di ferie</label>
                                      <p className="mt-1 text-gray-900">
                                        {selectedEmployee.holidayAllowance} all&apos;anno
                                      </p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">Giorni utilizzati</label>
                                      <p className="mt-1 text-gray-900">
                                        {selectedEmployee.holidaysUsed} / {selectedEmployee.holidayAllowance}
                                      </p>
                                    </div>
                                  </div>
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

      {/* Dialog di Conferma Cambio Stato */}
      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => 
        setConfirmDialog({ isOpen: open, employee: null, action: 'approve' })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Conferma Cambio Stato
            </DialogTitle>
          </DialogHeader>
          {confirmDialog.employee && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
                <div>
                  <h4 className="font-medium text-amber-900">Attenzione: Cambio di Stato</h4>
                  <p className="text-sm text-amber-700">
                    Stai per modificare lo stato di un dipendente già processato.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="font-medium text-gray-700">Dipendente:</label>
                  <p className="text-gray-900">{confirmDialog.employee.name}</p>
                  <p className="text-sm text-gray-600">{confirmDialog.employee.email}</p>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">Stato attuale:</label>
                  <div className="mt-1">{getStatusBadge(confirmDialog.employee.status)}</div>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">Nuovo stato:</label>
                  <div className="mt-1">
                    {confirmDialog.action === 'approve' ? (
                      <Badge className="bg-green-100 text-green-800">Approvato</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">Rifiutato</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <strong>Nota:</strong> Questa azione cambierà lo stato del dipendente. 
                {confirmDialog.action === 'approve' 
                  ? ' Il dipendente potrà accedere al sistema e richiedere ferie.' 
                  : ' Il dipendente non potrà più accedere al sistema.'
                }
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ isOpen: false, employee: null, action: 'approve' })}
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

      {/* Department Assignment Dialog */}
      <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assegna Dipartimento</DialogTitle>
          </DialogHeader>
          {assigningEmployee && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {getUserInitials(assigningEmployee.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{assigningEmployee.name}</h3>
                  <p className="text-sm text-gray-600">{assigningEmployee.email}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="department-select">Dipartimento</Label>
                <Select 
                  value={selectedDepartment} 
                  onValueChange={setSelectedDepartment}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleziona un dipartimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessun dipartimento</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} {dept.location && `(${dept.location})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-gray-600">
                Dipartimento attuale: {assigningEmployee.departmentName || 'Nessuno'}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDepartmentDialog(false)}
              disabled={assignLoading}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleAssignDepartment}
              disabled={assignLoading}
            >
              {assignLoading ? 'Assegnando...' : 'Assegna Dipartimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}