import { ReportData, MonthlyTrend, RequestsByType, RequestsByStatus } from './types';
import { calculateMonthlyTrends, getRequestsByType, getRequestsByStatus } from './report-data';

// OmniaGroup brand colors
export const OMNIA_COLORS = {
  primary: '#3B82F6',     // Blue
  secondary: '#10B981',   // Green
  accent: '#F59E0B',      // Amber
  danger: '#EF4444',      // Red
  purple: '#8B5CF6',      // Purple
  gray: '#6B7280',        // Gray
  light: {
    primary: '#DBEAFE',
    secondary: '#D1FAE5',
    accent: '#FEF3C7',
    danger: '#FEE2E2',
    purple: '#EDE9FE',
    gray: '#F3F4F6'
  }
};

// Chart configuration for consistent styling
export const CHART_CONFIG = {
  width: 400,
  height: 300,
  margin: { top: 20, right: 30, left: 20, bottom: 5 },
  fontSize: 12,
  gridColor: '#E5E7EB',
  textColor: '#374151'
};

// Chart data structures for different chart types
export interface PieChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface BarChartData {
  name: string;
  value: number;
  percentage?: number;
  color: string;
}

export interface LineChartData {
  month: string;
  requests: number;
  approvals: number;
  rejections: number;
  utilizationRate: number;
}

export interface DepartmentChartData {
  department: string;
  employees: number;
  utilizationRate: number;
  holidaysUsed: number;
  holidaysAllowed: number;
}

// Generate pie chart data for request status
export function generateRequestStatusPieChart(data: ReportData): PieChartData[] {
  const statusData = getRequestsByStatus(data.requests);
  const total = statusData.approved + statusData.pending + statusData.rejected;

  if (total === 0) {
    return [];
  }

  return [
    {
      name: 'Approvate',
      value: statusData.approved,
      percentage: (statusData.approved / total) * 100,
      color: OMNIA_COLORS.secondary
    },
    {
      name: 'In Attesa',
      value: statusData.pending,
      percentage: (statusData.pending / total) * 100,
      color: OMNIA_COLORS.accent
    },
    {
      name: 'Rifiutate',
      value: statusData.rejected,
      percentage: (statusData.rejected / total) * 100,
      color: OMNIA_COLORS.danger
    }
  ];
}

// Generate pie chart data for request types
export function generateRequestTypePieChart(data: ReportData): PieChartData[] {
  const typeData = getRequestsByType(data.requests);
  const total = typeData.vacation + typeData.sick + typeData.personal;

  if (total === 0) {
    return [];
  }

  return [
    {
      name: 'Ferie',
      value: typeData.vacation,
      percentage: (typeData.vacation / total) * 100,
      color: OMNIA_COLORS.primary
    },
    {
      name: 'Malattia',
      value: typeData.sick,
      percentage: (typeData.sick / total) * 100,
      color: OMNIA_COLORS.danger
    },
    {
      name: 'Permesso',
      value: typeData.personal,
      percentage: (typeData.personal / total) * 100,
      color: OMNIA_COLORS.purple
    }
  ];
}

// Generate bar chart data for department utilization
export function generateDepartmentBarChart(data: ReportData): BarChartData[] {
  return data.departmentStats.map(dept => ({
    name: dept.name.length > 15 ? `${dept.name.substring(0, 12)}...` : dept.name,
    value: dept.utilizationRate,
    percentage: dept.utilizationRate,
    color: dept.utilizationRate > 70 ? OMNIA_COLORS.secondary :
           dept.utilizationRate > 40 ? OMNIA_COLORS.accent :
           OMNIA_COLORS.danger
  })).sort((a, b) => b.value - a.value);
}

// Generate line chart data for monthly trends
export function generateMonthlyTrendLineChart(data: ReportData): LineChartData[] {
  const trends = calculateMonthlyTrends(data.requests, data.period);

  return trends.map(trend => ({
    month: trend.month.split(' ')[0].substring(0, 3), // Short month names
    requests: trend.requests,
    approvals: trend.approvals,
    rejections: trend.rejections,
    utilizationRate: trend.utilizationRate
  }));
}

// Generate employee performance chart data
export function generateEmployeePerformanceChart(data: ReportData): BarChartData[] {
  return data.employeePerformance
    .slice(0, 10) // Top 10 performers
    .map(emp => ({
      name: emp.name.length > 12 ? `${emp.name.split(' ')[0]} ${emp.name.split(' ')[1]?.charAt(0) || ''}.` : emp.name,
      value: emp.utilizationRate,
      percentage: emp.utilizationRate,
      color: emp.utilizationRate > 70 ? OMNIA_COLORS.secondary :
             emp.utilizationRate > 40 ? OMNIA_COLORS.accent :
             OMNIA_COLORS.danger
    }));
}

// Generate comprehensive department analysis chart
export function generateDepartmentAnalysisChart(data: ReportData): DepartmentChartData[] {
  return data.departmentStats.map(dept => ({
    department: dept.name,
    employees: dept.employeeCount,
    utilizationRate: dept.utilizationRate,
    holidaysUsed: dept.holidaysUsed,
    holidaysAllowed: dept.holidaysAllowed
  }));
}

// Generate summary statistics for overview charts
export interface SummaryChartData {
  total: number;
  available: number;
  used: number;
  pending: number;
  utilizationRate: number;
}

export function generateSummaryChart(data: ReportData): SummaryChartData {
  return {
    total: data.statistics.totalHolidaysAllowed,
    available: data.statistics.totalAvailable,
    used: data.statistics.totalTaken,
    pending: data.statistics.totalPending,
    utilizationRate: data.statistics.utilizationRate
  };
}

// Utility function to generate chart colors array
export function getColorPalette(count: number): string[] {
  const baseColors = [
    OMNIA_COLORS.primary,
    OMNIA_COLORS.secondary,
    OMNIA_COLORS.accent,
    OMNIA_COLORS.danger,
    OMNIA_COLORS.purple,
    OMNIA_COLORS.gray
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  // Generate additional colors if needed
  const colors = [...baseColors];
  for (let i = baseColors.length; i < count; i++) {
    const hue = (i * 137.508) % 360; // Golden angle approximation
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }

  return colors;
}

// Chart configuration for different chart types
export const PIE_CHART_CONFIG = {
  ...CHART_CONFIG,
  width: 300,
  height: 300,
  innerRadius: 50,
  outerRadius: 100,
  labelOffset: 120
};

export const BAR_CHART_CONFIG = {
  ...CHART_CONFIG,
  width: 500,
  height: 300,
  barWidth: 40,
  barSpacing: 10
};

export const LINE_CHART_CONFIG = {
  ...CHART_CONFIG,
  width: 600,
  height: 300,
  strokeWidth: 2,
  pointRadius: 4
};

// Function to convert chart data to Canvas/SVG for PDF embedding
export interface ChartImageData {
  type: 'pie' | 'bar' | 'line';
  data: any[];
  config: any;
  dataUrl?: string; // Base64 image data
}

// Chart titles and labels based on language
export const CHART_LABELS = {
  it: {
    requestStatus: 'Distribuzione Stato Richieste',
    requestTypes: 'Tipologie di Richieste',
    departmentUtilization: 'Utilizzo Ferie per Dipartimento',
    monthlyTrends: 'Trend Mensile Richieste',
    employeePerformance: 'Performance Top 10 Dipendenti',
    summaryOverview: 'Panoramica Generale Ferie'
  },
  en: {
    requestStatus: 'Request Status Distribution',
    requestTypes: 'Request Types',
    departmentUtilization: 'Holiday Utilization by Department',
    monthlyTrends: 'Monthly Request Trends',
    employeePerformance: 'Top 10 Employee Performance',
    summaryOverview: 'Holiday Overview Summary'
  },
  es: {
    requestStatus: 'Distribución de Estado de Solicitudes',
    requestTypes: 'Tipos de Solicitudes',
    departmentUtilization: 'Utilización de Vacaciones por Departamento',
    monthlyTrends: 'Tendencias Mensuales de Solicitudes',
    employeePerformance: 'Rendimiento Top 10 Empleados',
    summaryOverview: 'Resumen General de Vacaciones'
  }
};

// Get chart labels for specific language
export function getChartLabels(language: 'it' | 'en' | 'es' = 'it') {
  return CHART_LABELS[language] || CHART_LABELS.it;
}