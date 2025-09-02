'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
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
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  Hourglass
} from 'lucide-react';
import { Employee, PendingHolidayRequest } from '@/lib/hooks/useAdminData';

interface AdminReportsProps {
  employees: Employee[];
  requests: PendingHolidayRequest[];
  loading: boolean;
  error: string | null;
}

export function AdminReports({ employees, requests, loading, error }: AdminReportsProps) {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Helper function to safely get numeric value
  const safeNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? 0 : num;
  };

  // Helper function to format percentage
  const safePercentage = (numerator: number, denominator: number): number => {
    if (denominator === 0 || !isFinite(denominator) || !isFinite(numerator)) {
      return 0;
    }
    const result = (numerator / denominator) * 100;
    return isNaN(result) || !isFinite(result) ? 0 : result;
  };

  // Calculate statistics with enhanced vacation metrics
  const statistics = useMemo(() => {
    const activeEmployees = employees.filter(emp => emp.status === 'active');
    
    // Enhanced vacation metrics calculations
    const totalAvailable = employees.reduce((sum, emp) => sum + safeNumber(emp.availableDays || (emp.holidayAllowance - (emp.holidaysUsed || 0))), 0);
    const totalTaken = employees.reduce((sum, emp) => sum + safeNumber(emp.takenDays || 0), 0);
    const totalBooked = employees.reduce((sum, emp) => sum + safeNumber(emp.bookedDays || 0), 0);
    const totalPending = employees.reduce((sum, emp) => sum + safeNumber(emp.pendingDays || 0), 0);
    
    // Legacy calculations for backward compatibility
    const totalHolidaysUsed = employees.reduce((sum, emp) => sum + safeNumber(emp.holidaysUsed), 0);
    const totalHolidaysAllowed = employees.reduce((sum, emp) => sum + safeNumber(emp.holidayAllowance), 0);
    const averageHolidaysUsed = activeEmployees.length > 0 ? totalHolidaysUsed / activeEmployees.length : 0;
    
    const approvedRequests = requests.filter(req => req.status === 'approved');
    const pendingRequests = requests.filter(req => req.status === 'pending');
    const rejectedRequests = requests.filter(req => req.status === 'rejected');
    
    const approvalRate = safePercentage(approvedRequests.length, requests.length);
    
    return {
      totalEmployees: employees.length,
      activeEmployees: activeEmployees.length,
      pendingEmployees: employees.filter(emp => emp.status === 'pending').length,
      // Enhanced vacation metrics
      totalAvailable,
      totalTaken,
      totalBooked,
      totalPending,
      // Legacy metrics
      totalHolidaysUsed,
      totalHolidaysAllowed,
      averageHolidaysUsed: safeNumber(averageHolidaysUsed),
      utilizationRate: safePercentage(totalHolidaysUsed, totalHolidaysAllowed),
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
      const dept = emp.departmentName || t('admin.reports.departments.noDepartment');
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
      deptData.holidaysUsed += safeNumber(emp.holidaysUsed);
      deptData.holidaysAllowed += safeNumber(emp.holidayAllowance);
    });

    requests.forEach(req => {
      const dept = req.department || t('admin.reports.departments.noDepartment');
      if (deptMap.has(dept)) {
        deptMap.get(dept).requests++;
      }
    });

    return Array.from(deptMap.values()).map(dept => ({
      ...dept,
      utilizationRate: safePercentage(dept.holidaysUsed, dept.holidaysAllowed)
    }));
  }, [employees, requests]);

  // Employee performance data
  const employeePerformance = useMemo(() => {
    return employees
      .filter(emp => emp.status === 'active')
      .map(emp => ({
        ...emp,
        holidaysUsed: safeNumber(emp.holidaysUsed),
        holidayAllowance: safeNumber(emp.holidayAllowance),
        utilizationRate: safePercentage(safeNumber(emp.holidaysUsed), safeNumber(emp.holidayAllowance)),
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
    if (rate < 30) return t('admin.reports.performance.low');
    if (rate < 70) return t('admin.reports.performance.optimal');
    return t('admin.reports.performance.high');
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
            <span>{t('admin.reports.title')}</span>
          </h2>
          <p className="text-gray-600">
            {t('admin.reports.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{t('admin.reports.actions.month')}</SelectItem>
              <SelectItem value="quarter">{t('admin.reports.actions.quarter')}</SelectItem>
              <SelectItem value="year">{t('admin.reports.actions.year')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t('admin.reports.actions.export')}
          </Button>
        </div>
      </div>

      {/* Enhanced Overview Statistics with Temporal Vacation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.reports.stats.activeEmployees')}</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.activeEmployees}</p>
                <p className="text-xs text-gray-500">
                  {statistics.pendingEmployees} {t('admin.reports.departments.pending').toLowerCase()}
                </p>
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
                <p className="text-sm text-gray-600">{t('admin.reports.stats.availableDays')}</p>
                <p className="text-2xl font-bold text-green-600">{statistics.totalAvailable}</p>
                <p className="text-xs text-gray-500">{t('admin.reports.stats.requestsLabel')}</p>
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
                <p className="text-sm text-gray-600">{t('admin.reports.stats.usedDays')}</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.totalTaken}</p>
                <p className="text-xs text-gray-500">{t('admin.reports.stats.daysLabel')}</p>
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
                <p className="text-sm text-gray-600">{t('admin.reports.stats.totalHolidays')}</p>
                <p className="text-2xl font-bold text-purple-600">{statistics.totalBooked}</p>
                <p className="text-xs text-gray-500">{t('admin.reports.requestStatus.approved').toLowerCase()}</p>
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
                <p className="text-sm text-gray-600">{t('admin.reports.stats.pendingRequests')}</p>
                <p className="text-2xl font-bold text-amber-600">{statistics.totalPending}</p>
                <p className="text-xs text-gray-500">{t('admin.reports.stats.daysLabel')} {t('admin.reports.requestStatus.pending').toLowerCase()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('admin.reports.performance.usageRate')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {safeNumber(statistics.utilizationRate).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {t('admin.reports.stats.average')}: {safeNumber(statistics.averageHolidaysUsed).toFixed(1)} {t('admin.reports.departments.days')}
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
              <span>{t('admin.reports.departments.title')}</span>
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
                        {dept.employeeCount} {t('admin.reports.departments.employees').toLowerCase()} • {dept.requests} {t('admin.reports.departments.requests')}
                      </p>
                    </div>
                    <Badge className={getUtilizationColor(dept.utilizationRate)}>
                      {safeNumber(dept.utilizationRate).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{t('admin.reports.departments.holidayUsage')}</span>
                      <span>{dept.holidaysUsed} / {dept.holidaysAllowed} {t('admin.reports.departments.days')}</span>
                    </div>
                    <Progress value={safeNumber(dept.utilizationRate)} className="h-2" />
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
              <span>{t('admin.reports.requestStatus.title')}</span>
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
                  <div className="text-sm text-gray-600">{t('admin.reports.requestStatus.approved')}</div>
                </div>
                
                <div className="p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold text-amber-600">
                    {statistics.pendingRequests}
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.reports.requestStatus.pending')}</div>
                </div>
                
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {statistics.rejectedRequests}
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.reports.requestStatus.rejected')}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('admin.reports.departments.approvalRate')}</span>
                  <span>{safeNumber(statistics.approvalRate).toFixed(1)}%</span>
                </div>
                <Progress value={safeNumber(statistics.approvalRate)} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.reports.performance.title')}</CardTitle>
          <p className="text-sm text-gray-600">
            {t('admin.reports.performance.subtitle')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.reports.performance.employee')}</TableHead>
                  <TableHead>{t('admin.reports.performance.department')}</TableHead>
                  <TableHead>{t('admin.reports.performance.status')}</TableHead>
                  <TableHead>{t('admin.reports.performance.usageRate')}</TableHead>
                  <TableHead>{t('admin.reports.stats.requestsLabel')}</TableHead>
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
                        {employee.departmentName || t('admin.reports.departments.noDepartment')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                        <div className="flex items-center space-x-1">
                          <CalendarCheck className="h-3 w-3 text-green-600" />
                          <span className="font-medium text-green-700">{employee.availableDays || (employee.holidayAllowance - employee.holidaysUsed)}</span>
                          <span className="text-gray-600">{t('admin.reports.departments.available')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3 text-blue-600" />
                          <span className="font-medium text-blue-700">{employee.takenDays || 0}</span>
                          <span className="text-gray-600">{t('admin.reports.departments.taken')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CalendarDays className="h-3 w-3 text-purple-600" />
                          <span className="font-medium text-purple-700">{employee.bookedDays || 0}</span>
                          <span className="text-gray-600">{t('admin.reports.departments.booked')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Hourglass className="h-3 w-3 text-amber-600" />
                          <span className="font-medium text-amber-700">{employee.pendingDays || 0}</span>
                          <span className="text-gray-600">{t('admin.reports.departments.pendingShort')}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge className={getUtilizationColor(employee.utilizationRate)}>
                          {safeNumber(employee.utilizationRate).toFixed(1)}%
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
                {t('admin.reports.performance.viewAll')} ({employeePerformance.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}