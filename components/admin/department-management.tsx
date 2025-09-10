'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Plus, 
  Search,
  Users,
  UserPlus,
  Edit,
  Trash2,
  Crown,
  MapPin,
  MoreHorizontal,
  AlertTriangle,
  RefreshCw,
  UserX
} from 'lucide-react';
import { Department, Employee } from '@/lib/hooks/useAdminData';

interface DepartmentManagementProps {
  departments: Department[];
  employees: Employee[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function DepartmentManagement({ 
  departments, 
  employees, 
  loading, 
  error, 
  onRefresh 
}: DepartmentManagementProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [unassignLoading, setUnassignLoading] = useState<string | null>(null);
  
  // Form states
  const [newDepartment, setNewDepartment] = useState({
    name: '',
    location: '',
    managerId: ''
  });

  const [editDepartment, setEditDepartment] = useState({
    name: '',
    location: '',
    managerId: ''
  });

  // Filter departments
  const filteredDepartments = useMemo(() => {
    return departments.filter(dept => 
      !searchTerm || 
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.managerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [departments, searchTerm]);

  // Get available managers (active employees)
  const availableManagers = useMemo(() => {
    return employees.filter(emp => emp.status === 'active');
  }, [employees]);

  // Get employees for selected department
  const selectedDepartmentEmployees = useMemo(() => {
    if (!selectedDepartment) return [];
    
    // Debug: log to understand the structure
    console.log('Selected Department:', selectedDepartment);
    console.log('Employees:', employees);
    
    return employees.filter(emp => {
      // Check if employee is assigned to this department by departmentId
      const hasMatchingDepartment = emp.departmentId === selectedDepartment.id;
      
      if (hasMatchingDepartment) {
        console.log('Matching employee:', emp);
      }
      
      return hasMatchingDepartment;
    });
  }, [employees, selectedDepartment]);

  const handleCreateDepartment = async () => {
    if (!newDepartment.name.trim()) return;

    setCreateLoading(true);
    try {
      // TODO: Call API to create department
      const baseUrl = window.location.origin;

      const response = await fetch(`${baseUrl}/.netlify/functions/create-department`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          name: newDepartment.name,
          location: newDepartment.location || undefined,
          managerId: (newDepartment.managerId && newDepartment.managerId !== 'none') ? newDepartment.managerId : undefined
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create department');
      }

      // Reset form and close dialog
      setNewDepartment({ name: '', location: '', managerId: '' });
      setShowCreateDialog(false);
      
      // Refresh data
      onRefresh();
    } catch (err) {
      console.error('Error creating department:', err);
      // TODO: Show error toast
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditDepartment = async () => {
    if (!editingDepartment || !editDepartment.name.trim()) return;

    setEditLoading(true);
    try {
      const baseUrl = window.location.origin;

      const response = await fetch(`${baseUrl}/.netlify/functions/update-department`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          departmentId: editingDepartment.id,
          name: editDepartment.name,
          location: editDepartment.location || undefined,
          managerId: (editDepartment.managerId && editDepartment.managerId !== 'none') ? editDepartment.managerId : undefined
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update department');
      }

      // Reset form and close dialog
      setEditDepartment({ name: '', location: '', managerId: '' });
      setEditingDepartment(null);
      setShowEditDialog(false);
      
      // Refresh data
      onRefresh();
    } catch (err) {
      console.error('Error updating department:', err);
      // TODO: Show error toast
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteDepartment = async (department: Department) => {
    if (department.employeeCount > 0) {
      alert(t('admin.departments.deleteConfirm.cantDelete').replace('{name}', department.name).replace('{count}', department.employeeCount.toString()));
      return;
    }

    if (!confirm(t('admin.departments.deleteConfirm.confirmMessage').replace('{name}', department.name))) {
      return;
    }

    setDeleteLoading(department.id);
    try {
      const baseUrl = window.location.origin;

      const response = await fetch(`${baseUrl}/.netlify/functions/delete-department`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          departmentId: department.id
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete department');
      }

      // Refresh data
      onRefresh();
    } catch (err) {
      console.error('Error deleting department:', err);
      const errorMessage = err instanceof Error ? err.message : t('admin.departments.deleteConfirm.unknownError');
      alert(t('admin.departments.deleteConfirm.deleteError').replace('{error}', errorMessage));
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleUnassignEmployee = async (employeeId: string, employeeName: string) => {
    if (!confirm(t('admin.departments.unassignEmployee.confirmMessage').replace('{name}', employeeName))) {
      return;
    }

    setUnassignLoading(employeeId);
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
          employeeId: employeeId,
          departmentId: null // Unassign by setting department to null
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to unassign employee');
      }

      // Refresh data
      onRefresh();
    } catch (err) {
      console.error('Error unassigning employee:', err);
      const errorMessage = err instanceof Error ? err.message : t('admin.departments.unassignEmployee.unknownError');
      alert(t('admin.departments.unassignEmployee.error').replace('{error}', errorMessage));
    } finally {
      setUnassignLoading(null);
    }
  };

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department);
    setEditDepartment({
      name: department.name,
      location: department.location || '',
      managerId: department.managerId || ''
    });
    setShowEditDialog(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading && departments.length === 0) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Building2 className="h-6 w-6" />
            <span>{t('admin.departments.title')}</span>
          </h2>
          <p className="text-gray-600">
            {departments.length} {t('admin.departments.totalDepartments').toLowerCase()} • {employees.length} {t('admin.departments.totalEmployees')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('admin.departments.refresh')}
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.departments.newDepartment')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.departments.createDialog.title')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dept-name">{t('admin.departments.createDialog.nameLabel')}</Label>
                  <Input
                    id="dept-name"
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('admin.departments.createDialog.namePlaceholder')}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="dept-location">{t('admin.departments.createDialog.locationLabel')}</Label>
                  <Input
                    id="dept-location"
                    value={newDepartment.location}
                    onChange={(e) => setNewDepartment(prev => ({ ...prev, location: e.target.value }))}
                    placeholder={t('admin.departments.createDialog.locationPlaceholder')}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="dept-manager">{t('admin.departments.createDialog.managerLabel')}</Label>
                  <Select 
                    value={newDepartment.managerId} 
                    onValueChange={(value) => setNewDepartment(prev => ({ ...prev, managerId: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('admin.departments.createDialog.managerPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('admin.departments.createDialog.noManagerOption')}</SelectItem>
                      {availableManagers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name} ({manager.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  disabled={createLoading}
                >
                  {t('admin.departments.createDialog.cancel')}
                </Button>
                <Button 
                  onClick={handleCreateDepartment}
                  disabled={createLoading || !newDepartment.name.trim()}
                >
                  {createLoading ? t('admin.departments.createDialog.creating') : t('admin.departments.createDialog.create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Department Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.departments.editDialog.title')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-dept-name">{t('admin.departments.editDialog.nameLabel')}</Label>
                  <Input
                    id="edit-dept-name"
                    value={editDepartment.name}
                    onChange={(e) => setEditDepartment(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('admin.departments.editDialog.namePlaceholder')}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-dept-location">{t('admin.departments.editDialog.locationLabel')}</Label>
                  <Input
                    id="edit-dept-location"
                    value={editDepartment.location}
                    onChange={(e) => setEditDepartment(prev => ({ ...prev, location: e.target.value }))}
                    placeholder={t('admin.departments.editDialog.locationPlaceholder')}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-dept-manager">{t('admin.departments.editDialog.managerLabel')}</Label>
                  <Select 
                    value={editDepartment.managerId} 
                    onValueChange={(value) => setEditDepartment(prev => ({ ...prev, managerId: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('admin.departments.editDialog.managerPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('admin.departments.editDialog.noManagerOption')}</SelectItem>
                      {availableManagers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name} ({manager.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditDialog(false)}
                  disabled={editLoading}
                >
                  {t('admin.departments.editDialog.cancel')}
                </Button>
                <Button 
                  onClick={handleEditDepartment}
                  disabled={editLoading || !editDepartment.name.trim()}
                >
                  {editLoading ? t('admin.departments.editDialog.saving') : t('admin.departments.editDialog.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.departments.totalDepartments')}</p>
                <p className="text-2xl font-bold text-blue-600">{departments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Crown className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.departments.withManager')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {departments.filter(d => d.managerId).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.departments.totalEmployees')}</p>
                <p className="text-2xl font-bold text-purple-600">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <UserPlus className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.departments.averagePerDepartment')}</p>
                <p className="text-2xl font-bold text-amber-600">
                  {departments.length > 0 ? Math.round(employees.length / departments.length) : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('admin.departments.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Departments Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.departments.department')}</TableHead>
                  <TableHead>{t('admin.departments.manager')}</TableHead>
                  <TableHead>{t('admin.departments.location')}</TableHead>
                  <TableHead>{t('admin.departments.employees')}</TableHead>
                  <TableHead>{t('admin.departments.created')}</TableHead>
                  <TableHead className="text-right">{t('admin.departments.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {loading ? t('admin.departments.loading') : t('admin.departments.notFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDepartments.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Building2 className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{department.name}</div>
                            <div className="text-sm text-gray-600">ID: {department.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {department.managerName ? (
                          <div className="flex items-center space-x-2">
                            <Crown className="h-4 w-4 text-amber-500" />
                            <div>
                              <div className="font-medium text-gray-900">{department.managerName}</div>
                              <div className="text-sm text-gray-600">{t('admin.departments.manager')}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">{t('admin.departments.noManager')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {department.location ? (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{department.location}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">{t('admin.departments.notSpecified')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{department.employeeCount}</span>
                          <span className="text-sm text-gray-600">{t('admin.departments.employeesText')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDate(department.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(department)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteDepartment(department)}
                            disabled={deleteLoading === department.id || department.employeeCount > 0}
                            className={department.employeeCount > 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-red-50 hover:text-red-600 hover:border-red-200"}
                          >
                            {deleteLoading === department.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedDepartment(department)}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg lg:max-w-xl">
                              <DialogHeader>
                                <DialogTitle>{t('admin.departments.detailsDialog.title')}</DialogTitle>
                              </DialogHeader>
                              {selectedDepartment && (
                                <div className="space-y-6">
                                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                      <Building2 className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                      <h3 className="font-semibold text-lg">{selectedDepartment.name}</h3>
                                      <p className="text-sm text-gray-600">ID: {selectedDepartment.id}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <label className="font-medium text-gray-700">{t('admin.departments.detailsDialog.manager')}</label>
                                      <p className="mt-1 text-gray-900">
                                        {selectedDepartment.managerName || t('admin.departments.detailsDialog.none')}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">{t('admin.departments.detailsDialog.location')}</label>
                                      <p className="mt-1 text-gray-900">
                                        {selectedDepartment.location || t('admin.departments.detailsDialog.notSpecified')}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">{t('admin.departments.detailsDialog.employees')}</label>
                                      <p className="mt-1 text-gray-900">{selectedDepartment.employeeCount}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">{t('admin.departments.detailsDialog.createdOn')}</label>
                                      <p className="mt-1 text-gray-900">
                                        {formatDate(selectedDepartment.createdAt)}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Employees List */}
                                  {selectedDepartmentEmployees.length > 0 && (
                                    <div className="space-y-3">
                                      <label className="font-medium text-gray-700 text-sm">
                                        {t('admin.departments.detailsDialog.assignedEmployees')} ({selectedDepartmentEmployees.length})
                                      </label>
                                      <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {selectedDepartmentEmployees.map((employee) => (
                                          <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                            <div className="flex items-center space-x-3">
                                              <div className="p-2 bg-blue-100 rounded-full">
                                                <Users className="h-4 w-4 text-blue-600" />
                                              </div>
                                              <div>
                                                <p className="font-medium text-sm text-gray-900">{employee.name}</p>
                                                <p className="text-xs text-gray-600">{employee.email}</p>
                                              </div>
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleUnassignEmployee(employee.id, employee.name)}
                                              disabled={unassignLoading === employee.id}
                                              className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                            >
                                              {unassignLoading === employee.id ? (
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <UserX className="h-4 w-4" />
                                              )}
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {selectedDepartmentEmployees.length === 0 && (
                                    <div className="text-center py-4 text-gray-500 text-sm">
                                      {t('admin.departments.detailsDialog.noEmployees')}
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
    </div>
  );
}