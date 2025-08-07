'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Users,
  Download,
  Filter,
  PieChart,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Employee, PendingHolidayRequest } from '@/lib/hooks/useAdminData';

interface AdminReportsProps {
  employees: Employee[];
  requests: PendingHolidayRequest[];
  loading: boolean;
  error: string | null;
}

export function AdminReports({ employees, requests, loading, error }: AdminReportsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Calculate statistics
  const statistics = useMemo(() => {
    const activeEmployees = employees.filter(emp => emp.status === 'active');
    const totalHolidaysUsed = employees.reduce((sum, emp) => sum + emp.holidaysUsed, 0);
    const totalHolidaysAllowed = employees.reduce((sum, emp) => sum + emp.holidayAllowance, 0);
    const averageHolidaysUsed = activeEmployees.length > 0 ? totalHolidaysUsed / activeEmployees.length : 0;
    
    const approvedRequests = requests.filter(req => req.status === 'approved');
    const pendingRequests = requests.filter(req => req.status === 'pending');
    const rejectedRequests = requests.filter(req => req.status === 'rejected');
    
    const approvalRate = requests.length > 0 ? (approvedRequests.length / requests.length) * 100 : 0;
    
    return {
      totalEmployees: employees.length,
      activeEmployees: activeEmployees.length,
      pendingEmployees: employees.filter(emp => emp.status === 'pending').length,
      totalHolidaysUsed,
      totalHolidaysAllowed,
      averageHolidaysUsed,
      utilizationRate: totalHolidaysAllowed > 0 ? (totalHolidaysUsed / totalHolidaysAllowed) * 100 : 0,
      totalRequests: requests.length,
      approvedRequests: approvedRequests.length,
      pendingRequests: pendingRequests.length,
      rejectedRequests: rejectedRequests.length,
      approvalRate
    };
  }, [employees, requests]);

  // Department statistics
  const departmentStats = useMemo(() => {
    const deptMap = new Map();
    
    employees.forEach(emp => {
      const dept = emp.departmentName || 'Nessun dipartimento';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, {
          name: dept,
          employeeCount: 0,
          holidaysUsed: 0,
          holidaysAllowed: 0,
          requests: 0
        });
      }
      
      const deptData = deptMap.get(dept);
      deptData.employeeCount++;
      deptData.holidaysUsed += emp.holidaysUsed;
      deptData.holidaysAllowed += emp.holidayAllowance;
    });

    requests.forEach(req => {
      const dept = req.department || 'Nessun dipartimento';
      if (deptMap.has(dept)) {
        deptMap.get(dept).requests++;
      }
    });

    return Array.from(deptMap.values()).map(dept => ({
      ...dept,
      utilizationRate: dept.holidaysAllowed > 0 ? (dept.holidaysUsed / dept.holidaysAllowed) * 100 : 0
    }));
  }, [employees, requests]);

  // Employee performance data
  const employeePerformance = useMemo(() => {
    return employees
      .filter(emp => emp.status === 'active')
      .map(emp => ({
        ...emp,
        utilizationRate: emp.holidayAllowance > 0 ? (emp.holidaysUsed / emp.holidayAllowance) * 100 : 0,
        requestCount: requests.filter(req => req.employeeId === emp.id).length
      }))
      .sort((a, b) => b.utilizationRate - a.utilizationRate);
  }, [employees, requests]);

  const getUtilizationColor = (rate: number) => {
    if (rate < 30) return 'text-red-600 bg-red-100';
    if (rate < 70) return 'text-amber-600 bg-amber-100';
    return 'text-green-600 bg-green-100';
  };

  const getUtilizationLabel = (rate: number) => {
    if (rate < 30) return 'Basso';
    if (rate < 70) return 'Medio';
    return 'Alto';
  };

  if (loading && employees.length === 0) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
            <BarChart3 className="h-6 w-6" />
            <span>Report e Analisi</span>
          </h2>
          <p className="text-gray-600">
            Statistiche dettagliate sull&apos;utilizzo delle ferie e le performance dei dipendenti
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Questo mese</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Anno</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Esporta
          </Button>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Dipendenti Attivi</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.activeEmployees}</p>
                <p className="text-xs text-gray-500">
                  {statistics.pendingEmployees} in attesa
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Giorni Utilizzati</p>
                <p className="text-2xl font-bold text-green-600">{statistics.totalHolidaysUsed}</p>
                <p className="text-xs text-gray-500">
                  su {statistics.totalHolidaysAllowed} disponibili
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tasso Utilizzo</p>
                <p className="text-2xl font-bold text-purple-600">
                  {statistics.utilizationRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  Media: {statistics.averageHolidaysUsed.toFixed(1)} giorni
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tasso Approvazione</p>
                <p className="text-2xl font-bold text-amber-600">
                  {statistics.approvalRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {statistics.approvedRequests} su {statistics.totalRequests}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Analisi per Dipartimento</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentStats.map((dept, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{dept.name}</h4>
                      <p className="text-sm text-gray-600">
                        {dept.employeeCount} dipendenti • {dept.requests} richieste
                      </p>
                    </div>
                    <Badge className={getUtilizationColor(dept.utilizationRate)}>
                      {dept.utilizationRate.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Utilizzo ferie</span>
                      <span>{dept.holidaysUsed} / {dept.holidaysAllowed} giorni</span>
                    </div>
                    <Progress value={dept.utilizationRate} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Request Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Stato Richieste</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {statistics.approvedRequests}
                  </div>
                  <div className="text-sm text-gray-600">Approvate</div>
                </div>
                
                <div className="p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold text-amber-600">
                    {statistics.pendingRequests}
                  </div>
                  <div className="text-sm text-gray-600">In attesa</div>
                </div>
                
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {statistics.rejectedRequests}
                  </div>
                  <div className="text-sm text-gray-600">Rifiutate</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tasso di approvazione</span>
                  <span>{statistics.approvalRate.toFixed(1)}%</span>
                </div>
                <Progress value={statistics.approvalRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Dipendenti</CardTitle>
          <p className="text-sm text-gray-600">
            Utilizzo delle ferie per dipendente (ordinato per tasso di utilizzo)
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dipendente</TableHead>
                  <TableHead>Dipartimento</TableHead>
                  <TableHead>Giorni Utilizzati</TableHead>
                  <TableHead>Giorni Disponibili</TableHead>
                  <TableHead>Tasso Utilizzo</TableHead>
                  <TableHead>Richieste</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeePerformance.slice(0, 10).map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-600">{employee.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {employee.departmentName || 'Nessuno'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{employee.holidaysUsed}</span>
                    </TableCell>
                    <TableCell>
                      <span>{employee.holidayAllowance}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge className={getUtilizationColor(employee.utilizationRate)}>
                          {employee.utilizationRate.toFixed(1)}%
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {getUtilizationLabel(employee.utilizationRate)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{employee.requestCount}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {employeePerformance.length > 10 && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm">
                Visualizza tutti ({employeePerformance.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}