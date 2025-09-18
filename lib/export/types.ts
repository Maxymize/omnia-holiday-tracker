import { Employee, PendingHolidayRequest } from '@/lib/hooks/useAdminData';

export interface ReportPeriod {
  type: 'month' | 'quarter' | 'year' | 'previousYear' | 'custom' | 'last30' | 'last60' | 'last90';
  label: string;
  startDate: Date;
  endDate: Date;
}

export interface ReportData {
  period: ReportPeriod;
  employees: Employee[];
  requests: PendingHolidayRequest[];
  statistics: ReportStatistics;
  departmentStats: DepartmentStats[];
  employeePerformance: EmployeePerformance[];
  metadata: ReportMetadata;
}

export interface ReportStatistics {
  totalEmployees: number;
  activeEmployees: number;
  pendingEmployees: number;
  totalAvailable: number;
  totalTaken: number;
  totalBooked: number;
  totalPending: number;
  totalHolidaysUsed: number;
  totalHolidaysAllowed: number;
  averageHolidaysUsed: number;
  utilizationRate: number;
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  approvalRate: number;
}

export interface DepartmentStats {
  name: string;
  employeeCount: number;
  holidaysUsed: number;
  holidaysAllowed: number;
  requests: number;
  utilizationRate: number;
}

export interface EmployeePerformance {
  id: string;
  name: string;
  email: string;
  departmentName?: string;
  holidaysUsed: number;
  holidayAllowance: number;
  utilizationRate: number;
  requestCount: number;
  availableDays?: number;
  takenDays?: number;
  bookedDays?: number;
  pendingDays?: number;
  status: 'active' | 'pending' | 'inactive';
}

export interface ReportMetadata {
  generatedAt: Date;
  generatedBy: {
    name: string;
    email: string;
  };
  language: 'it' | 'en' | 'es';
  version: string;
  companyName: string;
  companyLogo?: string; // Base64 or URL to company logo
  systemSettings?: Record<string, any>; // Include system settings for customization
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'both';
  includeCharts: boolean;
  includeEmployeeDetails: boolean;
  includeDepartmentAnalysis: boolean;
  includeRequestHistory: boolean;
  period: ReportPeriod;
}

export interface PDFExportOptions extends ExportOptions {
  orientation: 'portrait' | 'landscape';
  pageSize: 'a4' | 'a3' | 'letter';
  includeCoverPage: boolean;
  includeSignature: boolean;
}

export interface ExcelExportOptions extends ExportOptions {
  includeFormulas: boolean;
  includePivotTables: boolean;
  includeConditionalFormatting: boolean;
  separateSheets: boolean;
}

export interface ReportSection {
  id: string;
  title: string;
  order: number;
  enabled: boolean;
  getData: (data: ReportData) => any;
  renderPDF?: (doc: any, data: any, options: PDFExportOptions) => void;
  renderExcel?: (workbook: any, data: any, options: ExcelExportOptions) => void;
}

export type HolidayType = 'vacation' | 'sick' | 'personal';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface RequestsByType {
  vacation: number;
  sick: number;
  personal: number;
}

export interface RequestsByStatus {
  pending: number;
  approved: number;
  rejected: number;
}

export interface MonthlyTrend {
  month: string;
  requests: number;
  approvals: number;
  rejections: number;
  utilizationRate: number;
}