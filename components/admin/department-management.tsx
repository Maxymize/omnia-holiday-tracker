'use client';

import { useState, useMemo } from 'react';
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
  RefreshCw
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  
  // Form states
  const [newDepartment, setNewDepartment] = useState({
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

  const handleCreateDepartment = async () => {
    if (!newDepartment.name.trim()) return;

    setCreateLoading(true);
    try {
      // TODO: Call API to create department
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:8888'
        : window.location.origin;

      const response = await fetch(`${baseUrl}/.netlify/functions/departments/create-department`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newDepartment.name,
          location: newDepartment.location || undefined,
          managerId: newDepartment.managerId || undefined
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
            <span>Gestione Dipartimenti</span>
          </h2>
          <p className="text-gray-600">
            {departments.length} dipartimenti • {employees.length} dipendenti totali
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Dipartimento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea Nuovo Dipartimento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dept-name">Nome Dipartimento *</Label>
                  <Input
                    id="dept-name"
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="es. Risorse Umane"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="dept-location">Ubicazione</Label>
                  <Input
                    id="dept-location"
                    value={newDepartment.location}
                    onChange={(e) => setNewDepartment(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="es. Milano, Roma"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="dept-manager">Manager</Label>
                  <Select 
                    value={newDepartment.managerId} 
                    onValueChange={(value) => setNewDepartment(prev => ({ ...prev, managerId: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleziona un manager (opzionale)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nessun manager</SelectItem>
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
                  Annulla
                </Button>
                <Button 
                  onClick={handleCreateDepartment}
                  disabled={createLoading || !newDepartment.name.trim()}
                >
                  {createLoading ? 'Creando...' : 'Crea Dipartimento'}
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
                <p className="text-sm text-gray-600">Dipartimenti Totali</p>
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
                <p className="text-sm text-gray-600">Con Manager</p>
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
                <p className="text-sm text-gray-600">Dipendenti Totali</p>
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
                <p className="text-sm text-gray-600">Media per Dipartimento</p>
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
                  placeholder="Cerca dipartimenti per nome, ubicazione o manager..."
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
                  <TableHead>Dipartimento</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Ubicazione</TableHead>
                  <TableHead>Dipendenti</TableHead>
                  <TableHead>Creato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {loading ? 'Caricamento dipartimenti...' : 'Nessun dipartimento trovato'}
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
                              <div className="text-sm text-gray-600">Manager</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Nessun manager</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {department.location ? (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{department.location}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Non specificata</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{department.employeeCount}</span>
                          <span className="text-sm text-gray-600">dipendenti</span>
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
                            onClick={() => {/* TODO: Edit department */}}
                          >
                            <Edit className="h-4 w-4" />
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
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Dettagli Dipartimento</DialogTitle>
                              </DialogHeader>
                              {selectedDepartment && (
                                <div className="space-y-4">
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
                                      <label className="font-medium text-gray-700">Manager</label>
                                      <p className="mt-1 text-gray-900">
                                        {selectedDepartment.managerName || 'Nessuno'}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">Ubicazione</label>
                                      <p className="mt-1 text-gray-900">
                                        {selectedDepartment.location || 'Non specificata'}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">Dipendenti</label>
                                      <p className="mt-1 text-gray-900">{selectedDepartment.employeeCount}</p>
                                    </div>
                                    <div>
                                      <label className="font-medium text-gray-700">Creato il</label>
                                      <p className="mt-1 text-gray-900">
                                        {formatDate(selectedDepartment.createdAt)}
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
    </div>
  );
}