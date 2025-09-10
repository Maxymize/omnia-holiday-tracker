'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Edit3,
  CalendarCheck,
  ClockIcon,
  CalendarDays,
  Hourglass
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
  const { t } = useTranslation();
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

  // Vacation allowance editing state
  const [showAllowanceDialog, setShowAllowanceDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newAllowance, setNewAllowance] = useState<number>(0);
  const [allowanceReason, setAllowanceReason] = useState<string>('');
  const [allowanceLoading, setAllowanceLoading] = useState(false);

  // Unified edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEmployeeUnified, setEditingEmployeeUnified] = useState<Employee | null>(null);
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [editAllowance, setEditAllowance] = useState<number>(0);
  const [editRole, setEditRole] = useState<'admin' | 'employee'>('employee');
  const [editReason, setEditReason] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);

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
      const baseUrl = window.location.origin;

      const response = await fetch(`${baseUrl}/.netlify/functions/assign-employee-to-department`, {
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
    setSelectedDepartment(employee.departmentId || '');
    setShowDepartmentDialog(true);
  };

  const openAllowanceDialog = (employee: Employee) => {
    console.log('🔧 DEBUG: openAllowanceDialog called for employee:', employee.name, 'Current allowance:', employee.holidayAllowance);
    setEditingEmployee(employee);
    setNewAllowance(employee.holidayAllowance || 25);
    setAllowanceReason('');
    setShowAllowanceDialog(true);
    console.log('🔧 DEBUG: Dialog state set to true, should open now');
  };

  const handleUpdateAllowance = async () => {
    console.log('🔧 DEBUG: handleUpdateAllowance called');
    if (!editingEmployee) {
      console.log('❌ DEBUG: No editing employee set');
      return;
    }
    console.log('🔧 DEBUG: Updating employee:', editingEmployee.name, 'from', editingEmployee.holidayAllowance, 'to', newAllowance);

    setAllowanceLoading(true);
    try {
      const baseUrl = window.location.origin;

      const accessToken = localStorage.getItem('accessToken');

      const response = await fetch(`${baseUrl}/.netlify/functions/update-employee-allowance`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          employeeId: editingEmployee.id,
          holidayAllowance: newAllowance,
          reason: allowanceReason || 'Modifica manuale da admin dashboard'
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update vacation allowance');
      }

      // Reset form and close dialog
      setEditingEmployee(null);
      setNewAllowance(0);
      setAllowanceReason('');
      setShowAllowanceDialog(false);
      
      // Refresh data
      onRefresh();
    } catch (err) {
      console.error('Error updating vacation allowance:', err);
      // TODO: Show error toast
    } finally {
      setAllowanceLoading(false);
    }
  };

  // Unified edit dialog functions
  const openEditDialog = (employee: Employee) => {
    setEditingEmployeeUnified(employee);
    setEditDepartment(employee.departmentId || '');
    setEditAllowance(employee.holidayAllowance || 25);
    setEditRole(employee.role);
    setEditReason('');
    setShowEditDialog(true);
  };

  const handleUnifiedEdit = async () => {
    if (!editingEmployeeUnified) return;

    setEditLoading(true);
    try {
      const baseUrl = window.location.origin;

      const accessToken = localStorage.getItem('accessToken');

      // Update department assignment if changed
      if (editDepartment !== (editingEmployeeUnified.departmentId || '')) {
        const departmentResponse = await fetch(`${baseUrl}/.netlify/functions/assign-employee-to-department`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            employeeId: editingEmployeeUnified.id,
            departmentId: editDepartment === 'none' ? null : editDepartment
          }),
        });

        const departmentData = await departmentResponse.json();
        if (!departmentResponse.ok) {
          throw new Error(departmentData.error || 'Failed to update department assignment');
        }
      }

      // Update allowance if changed
      if (editAllowance !== editingEmployeeUnified.holidayAllowance) {
        const allowanceResponse = await fetch(`${baseUrl}/.netlify/functions/update-employee-allowance`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            employeeId: editingEmployeeUnified.id,
            holidayAllowance: editAllowance,
            reason: editReason || 'Modifica da admin dashboard'
          }),
        });

        const allowanceData = await allowanceResponse.json();
        if (!allowanceResponse.ok) {
          throw new Error(allowanceData.error || 'Failed to update vacation allowance');
        }
      }

      // Update role if changed
      if (editRole !== editingEmployeeUnified.role) {
        const roleResponse = await fetch(`${baseUrl}/.netlify/functions/update-employee-role`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            employeeId: editingEmployeeUnified.id,
            role: editRole,
            reason: editReason || 'Cambio ruolo da admin dashboard'
          }),
        });

        const roleData = await roleResponse.json();
        if (!roleResponse.ok) {
          throw new Error(roleData.error || 'Failed to update employee role');
        }
      }

      // Reset form and close dialog
      setEditingEmployeeUnified(null);
      setEditDepartment('');
      setEditAllowance(0);
      setEditReason('');
      setShowEditDialog(false);
      
      // Refresh data
      onRefresh();
    } catch (err) {
      console.error('Error updating employee:', err);
      // TODO: Show error toast
    } finally {
      setEditLoading(false);
    }
  };

  const getStatusBadge = (status: Employee['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">{t('dashboard.profile.status.active')}</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800">{t('dashboard.profile.status.pending')}</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">{t('dashboard.profile.status.inactive')}</Badge>;
      default:
        return <Badge variant="outline">{t('admin.employees.unknown')}</Badge>;
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
        {t('dashboard.profile.role.employee')}
      </Badge>
    );
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const pendingEmployees = employees.filter(emp => emp.status === 'pending');
  const activeEmployees = employees.filter(emp => emp.status === 'active');
  
  // Enhanced vacation metrics calculations
  const totalAvailable = employees.reduce((sum, emp) => sum + (emp.availableDays || (emp.holidayAllowance - (emp.holidaysUsed || 0))), 0);
  const totalTaken = employees.reduce((sum, emp) => sum + (emp.takenDays || 0), 0);
  const totalBooked = employees.reduce((sum, emp) => sum + (emp.bookedDays || 0), 0);
  const totalPending = employees.reduce((sum, emp) => sum + (emp.pendingDays || 0), 0);

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
            <span>{t('admin.employees.management')}</span>
          </h2>
          <p className="text-gray-600">
            {employees.length} {t('admin.employees.totalEmployees').toLowerCase()} • {activeEmployees.length} {t('admin.employees.activeStatus').toLowerCase()} • {pendingEmployees.length} {t('admin.employees.pendingStatus').toLowerCase()}
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

      {/* Quick Stats Cards with Enhanced Vacation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.employees.totalEmployees')}</p>
                <p className="text-2xl font-bold text-blue-600">{employees.length}</p>
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
                <p className="text-sm text-gray-600">{t('admin.employees.pendingApproval')}</p>
                <p className="text-2xl font-bold text-amber-600">{pendingEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CalendarCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.employees.availableDays')}</p>
                <p className="text-2xl font-bold text-green-600">{totalAvailable}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.employees.takenDays')}</p>
                <p className="text-2xl font-bold text-blue-600">{totalTaken}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CalendarDays className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.employees.bookedDays')}</p>
                <p className="text-2xl font-bold text-purple-600">{totalBooked}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Hourglass className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.employees.pendingApproval')}</p>
                <p className="text-2xl font-bold text-amber-600">{totalPending}</p>
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
                  placeholder={t('admin.employees.searchPlaceholderFull')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('admin.employees.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.employees.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('admin.employees.activeStatus')}</SelectItem>
                  <SelectItem value="pending">{t('admin.employees.pendingStatus')}</SelectItem>
                  <SelectItem value="inactive">{t('admin.employees.inactiveStatus')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.employees.allRoles')}</SelectItem>
                  <SelectItem value="employee">{t('admin.employees.employees')}</SelectItem>
                  <SelectItem value="admin">{t('admin.employees.administrators')}</SelectItem>
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
                  <TableHead>{t('admin.employees.employee')}</TableHead>
                  <TableHead>{t('admin.employees.status')}</TableHead>
                  <TableHead>{t('admin.employees.role')}</TableHead>
                  <TableHead>{t('admin.employees.department')}</TableHead>
                  <TableHead>{t('admin.employees.holidays')}</TableHead>
                  <TableHead className="text-right">{t('admin.employees.actions')}</TableHead>
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
                            <AvatarImage 
                              src={employee.avatarUrl || ''} 
                              alt={employee.name} 
                            />
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
                          <span className="text-sm text-gray-400">{t('admin.employees.noDepartment')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {/* Enhanced vacation metrics with temporal categorization */}
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center space-x-1">
                            <CalendarCheck className="h-3 w-3 text-green-600" />
                            <span className="font-medium text-green-700">{employee.availableDays || (employee.holidayAllowance - (employee.holidaysUsed || 0))}</span>
                            <span className="text-gray-600">{t('admin.employees.available')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3 text-blue-600" />
                            <span className="font-medium text-blue-700">{employee.takenDays || 0}</span>
                            <span className="text-gray-600">{t('admin.employees.taken')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CalendarDays className="h-3 w-3 text-purple-600" />
                            <span className="font-medium text-purple-700">{employee.bookedDays || 0}</span>
                            <span className="text-gray-600">{t('admin.employees.booked')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Hourglass className="h-3 w-3 text-amber-600" />
                            <span className="font-medium text-amber-700">{employee.pendingDays || 0}</span>
                            <span className="text-gray-600">{t('admin.employees.pendingDays')}</span>
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
                          
                          {/* For active/approved employees: allow reject */}
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
                          
                          {/* Modifica Dipendente Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(employee)}
                            title="Modifica dipendente"
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
                                <DialogTitle>{t('admin.employees.detailsTitle')}</DialogTitle>
                              </DialogHeader>
                              {selectedEmployee && (
                                <div className="space-y-4">
                                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                                    <Avatar className="h-12 w-12">
                                      <AvatarImage 
                                        src={selectedEmployee.avatarUrl || ''} 
                                        alt={selectedEmployee.name} 
                                      />
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
                                      <label className="font-medium text-gray-700">{t('admin.employees.status')}</label>
                                      <div className="mt-1">{getStatusBadge(selectedEmployee.status)}</div>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">{t('admin.employees.role')}</label>
                                      <div className="mt-1">{getRoleBadge(selectedEmployee.role)}</div>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">{t('admin.employees.department')}</label>
                                      <p className="mt-1 text-gray-900">
                                        {selectedEmployee.departmentName || t('admin.employees.none')}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">{t('admin.employees.registeredOn')}</label>
                                      <p className="mt-1 text-gray-900">
                                        {new Date(selectedEmployee.createdAt).toLocaleDateString('it-IT')}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">{t('admin.employees.holidayDays')}</label>
                                      <p className="mt-1 text-gray-900">
                                        {selectedEmployee.holidayAllowance} {t('admin.employees.perYear')}
                                      </p>
                                    </div>
                                    <div className="col-span-2">
                                      <label className="font-medium text-gray-700">{t('admin.employees.holidayStatus')}</label>
                                      <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                                        <div className="flex items-center space-x-2">
                                          <CalendarCheck className="h-4 w-4 text-green-600" />
                                          <span className="font-medium text-green-700">{selectedEmployee.availableDays || (selectedEmployee.holidayAllowance - (selectedEmployee.holidaysUsed || 0))}</span>
                                          <span className="text-gray-600">{t('admin.employees.available')}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <CheckCircle className="h-4 w-4 text-blue-600" />
                                          <span className="font-medium text-blue-700">{selectedEmployee.takenDays || 0}</span>
                                          <span className="text-gray-600">{t('admin.employees.alreadyTaken')}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <CalendarDays className="h-4 w-4 text-purple-600" />
                                          <span className="font-medium text-purple-700">{selectedEmployee.bookedDays || 0}</span>
                                          <span className="text-gray-600">{t('admin.employees.booked')}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Hourglass className="h-4 w-4 text-amber-600" />
                                          <span className="font-medium text-amber-700">{selectedEmployee.pendingDays || 0}</span>
                                          <span className="text-gray-600">{t('admin.employees.pendingDays')}</span>
                                        </div>
                                      </div>
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
              {t('admin.employees.statusChangeModal.title')}
            </DialogTitle>
          </DialogHeader>
          {confirmDialog.employee && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
                <div>
                  <h4 className="font-medium text-amber-900">{t('admin.employees.statusChangeModal.warningTitle')}</h4>
                  <p className="text-sm text-amber-700">
                    {t('admin.employees.statusChangeDescription')}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="font-medium text-gray-700">{t('admin.employees.statusChangeModal.employee')}</label>
                  <p className="text-gray-900">{confirmDialog.employee.name}</p>
                  <p className="text-sm text-gray-600">{confirmDialog.employee.email}</p>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">{t('admin.employees.currentStatus')}</label>
                  <div className="mt-1">{getStatusBadge(confirmDialog.employee.status)}</div>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">{t('admin.employees.statusChangeModal.newStatus')}</label>
                  <div className="mt-1">
                    {confirmDialog.action === 'approve' ? (
                      <Badge className="bg-green-100 text-green-800">{t('admin.employees.statusChangeModal.active')}</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">{t('admin.employees.statusChangeModal.rejected')}</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {t('admin.employees.statusChangeModal.note')}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ isOpen: false, employee: null, action: 'approve' })}
            >
              {t('admin.employees.statusChangeModal.cancel')}
            </Button>
            <Button 
              onClick={handleConfirmAction}
              className={confirmDialog.action === 'approve' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
              }
            >
              {confirmDialog.action === 'approve' ? t('admin.employees.statusChangeModal.confirmActivate') : t('admin.employees.statusChangeModal.confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Assignment Dialog */}
      <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.employees.assignDepartment')}</DialogTitle>
          </DialogHeader>
          {assigningEmployee && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={assigningEmployee.avatarUrl || ''} 
                    alt={assigningEmployee.name} 
                  />
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
                <Label htmlFor="department-select">{t('admin.employees.department')}</Label>
                <Select 
                  value={selectedDepartment} 
                  onValueChange={setSelectedDepartment}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('admin.employees.selectDepartment')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('admin.employees.noDepartment')}</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name} {dept.location && `(${dept.location})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-gray-600">
                {t('admin.employees.currentDepartment')} {assigningEmployee.departmentName || t('admin.employees.none')}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDepartmentDialog(false)}
              disabled={assignLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleAssignDepartment}
              disabled={assignLoading}
            >
              {assignLoading ? t('admin.employees.assigning') : t('admin.employees.assignDepartment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vacation Allowance Editing Dialog */}
      <Dialog open={showAllowanceDialog} onOpenChange={setShowAllowanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Giorni di Ferie</DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={editingEmployee.avatarUrl || ''} 
                    alt={editingEmployee.name} 
                  />
                  <AvatarFallback>
                    {getUserInitials(editingEmployee.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{editingEmployee.name}</h3>
                  <p className="text-sm text-gray-600">{editingEmployee.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="current-allowance">Giorni di ferie attuali</Label>
                  <div className="mt-1 p-3 bg-gray-100 rounded-lg">
                    <span className="font-medium">{editingEmployee.holidayAllowance} giorni all&apos;anno</span>
                    <div className="text-sm text-gray-600 mt-1">
                      Utilizzati: {editingEmployee.holidaysUsed} • 
                      Rimanenti: {(editingEmployee.holidayAllowance || 0) - (editingEmployee.holidaysUsed || 0)}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="new-allowance">Nuovi giorni di ferie</Label>
                  <Input
                    id="new-allowance"
                    type="number"
                    min="0"
                    max="365"
                    value={newAllowance}
                    onChange={(e) => setNewAllowance(parseInt(e.target.value) || 0)}
                    className="mt-1"
                    placeholder="Inserisci il nuovo numero di giorni"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {t('admin.employees.valueBetween')}
                  </div>
                </div>

                <div>
                  <Label htmlFor="allowance-reason">Motivo della modifica (opzionale)</Label>
                  <Input
                    id="allowance-reason"
                    value={allowanceReason}
                    onChange={(e) => setAllowanceReason(e.target.value)}
                    className="mt-1"
                    placeholder="Es: Aumento contrattuale, periodo di prova completato..."
                  />
                </div>

                {newAllowance !== editingEmployee.holidayAllowance && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Riepilogo modifica
                      </span>
                    </div>
                    <div className="text-sm text-blue-700 mt-1">
                      Da {editingEmployee.holidayAllowance} a {newAllowance} giorni 
                      ({newAllowance > (editingEmployee.holidayAllowance || 0) ? '+' : ''}{newAllowance - (editingEmployee.holidayAllowance || 0)} giorni)
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAllowanceDialog(false)}
              disabled={allowanceLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleUpdateAllowance}
              disabled={allowanceLoading || newAllowance === editingEmployee?.holidayAllowance}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {allowanceLoading ? 'Aggiornando...' : 'Aggiorna Giorni di Ferie'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unified Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.employees.editTitle')}</DialogTitle>
          </DialogHeader>
          {editingEmployeeUnified && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={editingEmployeeUnified.avatarUrl || ''} 
                    alt={editingEmployeeUnified.name} 
                  />
                  <AvatarFallback>
                    {getUserInitials(editingEmployeeUnified.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{editingEmployeeUnified.name}</h3>
                  <p className="text-sm text-gray-600">{editingEmployeeUnified.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Department Assignment */}
                <div>
                  <Label htmlFor="edit-department-select">{t('admin.employees.department')}</Label>
                  <Select 
                    value={editDepartment} 
                    onValueChange={setEditDepartment}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('admin.employees.selectDepartment')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('admin.employees.noDepartment')}</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name} {dept.location && `(${dept.location})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('admin.employees.currentDepartment')} {editingEmployeeUnified.departmentName || t('admin.employees.none')}
                  </p>
                </div>

                {/* Role Management */}
                <div>
                  <Label htmlFor="edit-role">{t('admin.employees.role')}</Label>
                  <div className="mt-1 p-3 bg-gray-100 rounded-lg mb-2">
                    <span className="font-medium">{t('admin.employees.currentRole')} {editingEmployeeUnified.role === 'admin' ? t('dashboard.profile.role.admin') : t('dashboard.profile.role.employee')}</span>
                    {editingEmployeeUnified.email === 'max.giurastante@omniaservices.net' && (
                      <div className="text-sm text-purple-600 mt-1 flex items-center">
                        <Shield className="h-3 w-3 mr-1" />
                        Super Amministratore - Non modificabile
                      </div>
                    )}
                  </div>
                  
                  <Select 
                    value={editRole} 
                    onValueChange={(value: 'admin' | 'employee') => setEditRole(value)}
                    disabled={editingEmployeeUnified.email === 'max.giurastante@omniaservices.net'}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('admin.employees.selectRole')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">{t('dashboard.profile.role.employee')}</SelectItem>
                      <SelectItem value="admin">{t('dashboard.profile.role.admin')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-sm text-gray-500 mt-1">
                    {editingEmployeeUnified.email === 'max.giurastante@omniaservices.net' 
                      ? 'Il Super Amministratore non può essere modificato' 
                      : t('admin.employees.adminFullAccess')}
                  </div>
                </div>

                {/* Vacation Allowance */}
                <div>
                  <Label htmlFor="edit-allowance">{t('admin.employees.holidayDays')}</Label>
                  <div className="mt-1 p-3 bg-gray-100 rounded-lg mb-2">
                    <span className="font-medium">{editingEmployeeUnified.holidayAllowance} {t('admin.employees.currentDays')}</span>
                    <div className="text-sm text-gray-600 mt-1">
                      {t('admin.employees.used')}: {editingEmployeeUnified.holidaysUsed} • 
                      {t('admin.employees.remaining')}: {(editingEmployeeUnified.holidayAllowance || 0) - (editingEmployeeUnified.holidaysUsed || 0)}
                    </div>
                  </div>
                  
                  <Input
                    id="edit-allowance"
                    type="number"
                    min="0"
                    max="365"
                    value={editAllowance}
                    onChange={(e) => setEditAllowance(parseInt(e.target.value) || 0)}
                    placeholder="Inserisci il nuovo numero di giorni"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {t('admin.employees.valueBetween')}
                  </div>
                </div>

                {/* Reason for changes */}
                <div>
                  <Label htmlFor="edit-reason">{t('admin.employees.reasonForChanges')}</Label>
                  <Input
                    id="edit-reason"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="mt-1"
                    placeholder={t('admin.employees.reasonPlaceholder')}
                  />
                </div>

                {/* Summary of changes */}
                {(editDepartment !== (editingEmployeeUnified.departmentId || '') || 
                  editAllowance !== editingEmployeeUnified.holidayAllowance ||
                  editRole !== editingEmployeeUnified.role) && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <Edit3 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Riepilogo modifiche
                      </span>
                    </div>
                    <div className="text-sm text-blue-700 mt-1 space-y-1">
                      {editDepartment !== (editingEmployeeUnified.departmentId || '') && (
                        <div>
                          {t('admin.employees.department')}: {editingEmployeeUnified.departmentName || t('admin.employees.none')} → {
                            editDepartment === 'none' ? t('admin.employees.none') : 
                            departments.find(d => d.id === editDepartment)?.name || t('admin.employees.unknown')
                          }
                        </div>
                      )}
                      {editRole !== editingEmployeeUnified.role && (
                        <div>
                          {t('admin.employees.role')}: {editingEmployeeUnified.role === 'admin' ? t('admin.employees.administrator') : t('admin.employees.employeeRole')} → {editRole === 'admin' ? t('admin.employees.administrator') : t('admin.employees.employeeRole')}
                        </div>
                      )}
                      {editAllowance !== editingEmployeeUnified.holidayAllowance && (
                        <div>
                          Giorni ferie: {editingEmployeeUnified.holidayAllowance} → {editAllowance} giorni
                          ({editAllowance > (editingEmployeeUnified.holidayAllowance || 0) ? '+' : ''}{editAllowance - (editingEmployeeUnified.holidayAllowance || 0)})
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowEditDialog(false)}
              disabled={editLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleUnifiedEdit}
              disabled={editLoading || (
                editDepartment === (editingEmployeeUnified?.departmentId || '') && 
                editAllowance === editingEmployeeUnified?.holidayAllowance &&
                editRole === editingEmployeeUnified?.role
              )}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editLoading ? t('admin.employees.saving') : t('admin.employees.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}