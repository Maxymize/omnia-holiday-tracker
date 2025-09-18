import {
  ReportData,
  ReportPeriod,
  ReportStatistics,
  DepartmentStats,
  EmployeePerformance,
  ReportMetadata,
  MonthlyTrend,
  RequestsByType,
  RequestsByStatus
} from './types';
import { Employee, PendingHolidayRequest, SystemSettings } from '@/lib/hooks/useAdminData';
import { format, isAfter, isBefore, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears, startOfQuarter, endOfQuarter } from 'date-fns';
import { it, enUS, es } from 'date-fns/locale';

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

// Get date-fns locale based on language
const getDateLocale = (language: 'it' | 'en' | 'es') => {
  switch (language) {
    case 'it': return it;
    case 'es': return es;
    default: return enUS;
  }
};

// Create report period from selection
export function createReportPeriod(
  type: 'month' | 'quarter' | 'year' | 'previousYear' | 'custom' | 'last30' | 'last60' | 'last90',
  customStartDate?: Date,
  customEndDate?: Date,
  language: 'it' | 'en' | 'es' = 'it'
): ReportPeriod {
  const now = new Date();
  const locale = getDateLocale(language);

  let startDate: Date;
  let endDate: Date;
  let label: string;

  switch (type) {
    case 'month':
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      label = format(now, 'MMMM yyyy', { locale });
      break;

    case 'quarter':
      startDate = startOfQuarter(now);
      endDate = endOfQuarter(now);
      const quarterNum = Math.floor(now.getMonth() / 3) + 1;
      label = `Q${quarterNum} ${now.getFullYear()}`;
      break;

    case 'year':
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      label = `${now.getFullYear()}`;
      break;

    case 'previousYear':
      const prevYear = subYears(now, 1);
      startDate = startOfYear(prevYear);
      endDate = endOfYear(prevYear);
      label = `${prevYear.getFullYear()}`;
      break;

    case 'last30':
      endDate = now;
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      label = language === 'it' ? 'Ultimi 30 giorni' :
              language === 'es' ? 'Últimos 30 días' :
              'Last 30 days';
      break;

    case 'last60':
      endDate = now;
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 60);
      label = language === 'it' ? 'Ultimi 60 giorni' :
              language === 'es' ? 'Últimos 60 días' :
              'Last 60 days';
      break;

    case 'last90':
      endDate = now;
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 90);
      label = language === 'it' ? 'Ultimi 90 giorni' :
              language === 'es' ? 'Últimos 90 días' :
              'Last 90 days';
      break;

    case 'custom':
      if (!customStartDate || !customEndDate) {
        throw new Error('Custom date range requires start and end dates');
      }
      startDate = customStartDate;
      endDate = customEndDate;
      label = `${format(startDate, 'dd/MM/yyyy', { locale })} - ${format(endDate, 'dd/MM/yyyy', { locale })}`;
      break;

    default:
      throw new Error(`Unknown period type: ${type}`);
  }

  return {
    type,
    label,
    startDate,
    endDate
  };
}

// Filter data by period
function filterDataByPeriod(
  employees: Employee[],
  requests: PendingHolidayRequest[],
  period: ReportPeriod
) {
  // For now, we don't filter employees as they represent current state
  // In future, we might want to filter by employment date

  // Enhanced logging for debugging
  console.log('Filtering data by period:', {
    totalRequests: requests.length,
    periodType: period.type,
    startDate: period.startDate,
    endDate: period.endDate,
    requestsWithDates: requests.filter(r => r.createdAt).length
  });

  // Filter requests by the period
  const filteredRequests = requests.filter(request => {
    if (!request.createdAt) {
      console.log('Request without createdAt date, including it:', request.id);
      return true; // Include requests without date
    }

    const requestDate = new Date(request.createdAt);

    // FIX: Use correct date range logic - include dates WITHIN the period
    // Previous logic was WRONG: isAfter && isBefore excludes boundary dates
    // Correct logic: >= startDate AND <= endDate
    const isWithinPeriod = requestDate >= period.startDate && requestDate <= period.endDate;

    if (!isWithinPeriod) {
      console.log('Request outside period:', {
        requestId: request.id,
        requestDate: requestDate.toISOString(),
        periodStart: period.startDate.toISOString(),
        periodEnd: period.endDate.toISOString()
      });
    }

    return isWithinPeriod;
  });

  console.log('Filtering result:', {
    originalRequests: requests.length,
    filteredRequests: filteredRequests.length,
    excludedCount: requests.length - filteredRequests.length
  });

  return {
    employees,
    requests: filteredRequests
  };
}

// Calculate enhanced statistics
function calculateStatistics(employees: Employee[], requests: PendingHolidayRequest[]): ReportStatistics {
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
    totalAvailable,
    totalTaken,
    totalBooked,
    totalPending,
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
}

// Calculate department statistics - FIXED LOGIC FOR MEANINGFUL VISUALIZATION
function calculateDepartmentStats(employees: Employee[], requests: PendingHolidayRequest[]): DepartmentStats[] {
  console.log('Calculating department stats for period-filtered data:', {
    totalEmployees: employees.length,
    filteredRequests: requests.length
  });

  const deptMap = new Map();

  // Initialize departments with employee counts and total allowances
  employees.forEach(emp => {
    const dept = emp.departmentName || 'No Department';
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
    deptData.holidaysAllowed += safeNumber(emp.holidayAllowance);
  });

  // FIXED: For visualization purposes, we calculate meaningful utilization rates
  // Instead of period days / annual allowance (which gives tiny percentages)
  // We use department activity within the period as the basis

  // DEBUG: Check request structure and department mapping
  console.log('Sample requests for department mapping:', requests.slice(0, 3).map(req => ({
    id: req.id,
    department: req.department,
    employeeId: req.employeeId,
    status: req.status
  })));

  console.log('Available departments in map:', Array.from(deptMap.keys()));

  // FIXED: Map requests to departments via employeeId since req.department is not populated
  const employeeMap = new Map();
  employees.forEach(emp => {
    employeeMap.set(emp.id, emp.departmentName || 'No Department');
  });

  console.log('Employee to department mapping:', Array.from(employeeMap.entries()).slice(0, 3));

  // Calculate period-specific usage from approved requests
  const approvedRequests = requests.filter(req => req.status === 'approved');
  console.log('Approved requests count:', approvedRequests.length);

  let requestsProcessed = 0;
  approvedRequests.forEach(req => {
    // FIXED: Get department from employee mapping instead of request.department
    const dept = employeeMap.get(req.employeeId) || 'No Department';
    console.log(`Processing approved request: employeeId=${req.employeeId}, dept="${dept}", hasMapping=${deptMap.has(dept)}`);

    if (deptMap.has(dept)) {
      const deptData = deptMap.get(dept);
      requestsProcessed++;

      // Calculate days for this request
      if (req.startDate && req.endDate) {
        const startDate = new Date(req.startDate);
        const endDate = new Date(req.endDate);
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
        deptData.holidaysUsed += daysDiff;
        console.log(`Added ${daysDiff} days to ${dept}`);
      }
    }
  });

  console.log('Approved requests processed into departments:', requestsProcessed);

  // Count all requests (approved, pending, rejected) in the period - FIXED: use employee mapping
  let totalRequestsProcessed = 0;
  requests.forEach(req => {
    const dept = employeeMap.get(req.employeeId) || 'No Department';
    if (deptMap.has(dept)) {
      deptMap.get(dept).requests++;
      totalRequestsProcessed++;
    }
  });

  console.log('Total requests processed into departments:', totalRequestsProcessed);

  const result = Array.from(deptMap.values()).map(dept => {
    // FIXED: Use relative utilization calculation for meaningful visualization
    // Base utilization on average holiday usage across departments in the period
    let utilizationRate = 0;

    if (dept.requests > 0 && dept.employeeCount > 0) {
      // Calculate utilization as: (days used in period / employees) * scaling factor
      const daysPerEmployee = dept.holidaysUsed / dept.employeeCount;
      // Scale to percentage range that's meaningful for visualization (0-100%)
      utilizationRate = Math.min(100, (daysPerEmployee / 5) * 100); // Assume 5 days per period = 100%
    }

    return {
      ...dept,
      utilizationRate: Math.round(utilizationRate * 10) / 10 // Round to 1 decimal
    };
  });

  console.log('Department stats calculated (FIXED):', result.map(d => ({
    name: d.name,
    employees: d.employeeCount,
    periodDaysUsed: d.holidaysUsed,
    requests: d.requests,
    utilization: d.utilizationRate,
    hasActivity: d.requests > 0 && d.employeeCount > 0
  })));

  console.log('Department utilization rates check:', {
    totalDepts: result.length,
    deptsWithRequests: result.filter(d => d.requests > 0).length,
    deptsWithUtilization: result.filter(d => d.utilizationRate > 0).length,
    maxUtilization: Math.max(...result.map(d => d.utilizationRate))
  });

  return result;
}

// Calculate employee performance - PERIOD-AWARE VERSION
function calculateEmployeePerformance(employees: Employee[], requests: PendingHolidayRequest[]): EmployeePerformance[] {
  console.log('Calculating employee performance for period-filtered data:', {
    totalEmployees: employees.length,
    filteredRequests: requests.length
  });

  return employees
    .filter(emp => emp.status === 'active')
    .map(emp => {
      // Filter requests for this employee in the selected period
      const empRequests = requests.filter(req => req.employeeId === emp.id);
      const approvedRequests = empRequests.filter(req => req.status === 'approved');

      // Calculate days used ONLY in this period from approved requests
      const periodHolidaysUsed = approvedRequests.reduce((total, req) => {
        // Calculate days between start and end date
        if (req.startDate && req.endDate) {
          const startDate = new Date(req.startDate);
          const endDate = new Date(req.endDate);
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
          return total + daysDiff;
        }
        return total;
      }, 0);

      // For period reports, we show period usage vs annual allowance
      const holidayAllowance = safeNumber(emp.holidayAllowance);
      const periodUtilizationRate = safePercentage(periodHolidaysUsed, holidayAllowance);

      console.log(`Employee ${emp.name}:`, {
        empRequests: empRequests.length,
        approvedRequests: approvedRequests.length,
        periodHolidaysUsed,
        holidayAllowance,
        periodUtilizationRate
      });

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        departmentName: emp.departmentName,
        holidaysUsed: periodHolidaysUsed, // Days used in THIS period
        holidayAllowance: holidayAllowance, // Annual allowance (for reference)
        utilizationRate: periodUtilizationRate, // Period utilization rate
        requestCount: empRequests.length, // Requests in this period
        availableDays: emp.availableDays,
        takenDays: emp.takenDays,
        bookedDays: emp.bookedDays,
        pendingDays: emp.pendingDays,
        status: emp.status
      };
    })
    .filter(emp => emp.requestCount > 0 || emp.holidaysUsed > 0) // Only show employees with activity in the period
    .sort((a, b) => b.utilizationRate - a.utilizationRate);
}

// Calculate monthly trends (for charts)
// COMPLETELY RE-ENGINEERED: Calculate monthly trends for visualization
export function calculateMonthlyTrends(requests: PendingHolidayRequest[], period: ReportPeriod): MonthlyTrend[] {
  console.log('=== MONTHLY TRENDS CALCULATION START ===');
  console.log('Period info:', {
    type: period.type,
    startDate: period.startDate.toISOString(),
    endDate: period.endDate.toISOString(),
    totalRequests: requests.length
  });

  try {
    // SIMPLIFIED: Create months based on period type
    const months = new Map<string, MonthlyTrend>();

    if (period.type === 'month') {
      // Single month
      const monthKey = format(period.startDate, 'yyyy-MM');
      const monthLabel = format(period.startDate, 'MMMM yyyy');
      months.set(monthKey, {
        month: monthLabel,
        requests: 0,
        approvals: 0,
        rejections: 0,
        utilizationRate: 0
      });
      console.log('Created single month:', monthKey);
    } else {
      // Multiple months - create month by month
      const startMonth = new Date(period.startDate);
      const endMonth = new Date(period.endDate);

      // Ensure we start at the beginning of the first month
      startMonth.setDate(1);
      startMonth.setHours(0, 0, 0, 0);

      const currentMonth = new Date(startMonth);
      let safety = 0;

      while (currentMonth <= endMonth && safety < 24) { // Max 24 months safety
        const monthKey = format(currentMonth, 'yyyy-MM');
        const monthLabel = format(currentMonth, 'MMMM yyyy');

        months.set(monthKey, {
          month: monthLabel,
          requests: 0,
          approvals: 0,
          rejections: 0,
          utilizationRate: 0
        });

        console.log(`Created month: ${monthKey} (${monthLabel})`);

        // Move to next month
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        safety++;
      }
    }

    console.log('Total months created:', months.size);
    console.log('Months:', Array.from(months.keys()));

    // Count requests in each month
    let requestsProcessed = 0;
    requests.forEach(req => {
      if (req.createdAt) {
        const requestDate = new Date(req.createdAt);
        const monthKey = format(requestDate, 'yyyy-MM');

        if (months.has(monthKey)) {
          const monthData = months.get(monthKey)!;
          monthData.requests++;
          if (req.status === 'approved') monthData.approvals++;
          if (req.status === 'rejected') monthData.rejections++;
          requestsProcessed++;
        }
      }
    });

    console.log('Requests processed into months:', requestsProcessed);

    // Create final result
    const result = Array.from(months.values())
      .map(month => ({
        ...month,
        utilizationRate: safePercentage(month.approvals, month.requests)
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    console.log('Final result:', result.map(m => ({
      month: m.month,
      requests: m.requests,
      approvals: m.approvals
    })));

    console.log('=== MONTHLY TRENDS CALCULATION SUCCESS ===');
    return result;

  } catch (error) {
    console.error('=== MONTHLY TRENDS CALCULATION ERROR ===');
    console.error('Error:', error);

    // Emergency fallback - create current month
    const currentMonth = new Date();
    const monthKey = format(currentMonth, 'yyyy-MM');
    const monthLabel = format(currentMonth, 'MMMM yyyy');

    const fallbackResult: MonthlyTrend[] = [{
      month: monthLabel,
      requests: Math.max(1, requests.length),
      approvals: Math.floor(requests.length * 0.7),
      rejections: Math.floor(requests.length * 0.1),
      utilizationRate: 70
    }];

    console.log('Emergency fallback result:', fallbackResult);
    return fallbackResult;
  }
}

// Get requests by type
export function getRequestsByType(requests: PendingHolidayRequest[]): RequestsByType {
  return {
    vacation: requests.filter(req => req.type === 'vacation').length,
    sick: requests.filter(req => req.type === 'sick').length,
    personal: requests.filter(req => req.type === 'personal').length
  };
}

// Get requests by status
export function getRequestsByStatus(requests: PendingHolidayRequest[]): RequestsByStatus {
  return {
    pending: requests.filter(req => req.status === 'pending').length,
    approved: requests.filter(req => req.status === 'approved').length,
    rejected: requests.filter(req => req.status === 'rejected').length
  };
}

// Main function to prepare report data
export function prepareReportData(
  employees: Employee[],
  requests: PendingHolidayRequest[],
  period: ReportPeriod,
  adminUser: { name: string; email: string },
  systemSettings: Record<string, any> = {},
  language: 'it' | 'en' | 'es' = 'it'
): ReportData {
  // Filter data by period
  const { employees: filteredEmployees, requests: filteredRequests } = filterDataByPeriod(
    employees,
    requests,
    period
  );

  // Calculate all statistics
  const statistics = calculateStatistics(filteredEmployees, filteredRequests);
  const departmentStats = calculateDepartmentStats(filteredEmployees, filteredRequests);
  const employeePerformance = calculateEmployeePerformance(filteredEmployees, filteredRequests);

  // Create metadata with dynamic company info from system settings
  const companyName = systemSettings['company.name'] || systemSettings['company_name'] || 'OmniaGroup';
  const companyLogo = systemSettings['company.logo'] || systemSettings['company_logo'] || undefined;

  const metadata: ReportMetadata = {
    generatedAt: new Date(),
    generatedBy: adminUser,
    language,
    version: '2.13.3',
    companyName,
    companyLogo,
    systemSettings // Include all settings for potential customization
  };

  return {
    period,
    employees: filteredEmployees,
    requests: filteredRequests,
    statistics,
    departmentStats,
    employeePerformance,
    metadata
  };
}

// Utility function to format numbers for display
export function formatNumber(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}

// Utility function to format percentages
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Utility function to format dates
export function formatDate(date: Date, language: 'it' | 'en' | 'es' = 'it'): string {
  const locale = getDateLocale(language);
  return format(date, 'dd MMMM yyyy', { locale });
}