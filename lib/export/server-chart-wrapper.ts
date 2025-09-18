/**
 * Server-only chart generation wrapper
 * This module should ONLY be imported in Netlify Functions
 * to prevent Next.js from trying to resolve canvas dependencies
 * during client-side compilation.
 */

import { ReportData } from './types';

// Only import chart dependencies in server environment
let chartGenerator: any = null;

async function initializeChartGenerator() {
  if (chartGenerator) {
    return chartGenerator;
  }

  console.log('🔧 SERVER CHART WRAPPER: Initializing chart generator...');
  try {
    chartGenerator = await import('./advanced-chart-generator');
    console.log('✅ SERVER CHART WRAPPER: Chart generator loaded successfully');
    return chartGenerator;
  } catch (error) {
    console.error('❌ SERVER CHART WRAPPER: Failed to load chart generator:', error);
    throw error;
  }
}

export async function generateDepartmentChart(data: ReportData): Promise<Buffer> {
  const generator = await initializeChartGenerator();
  return generator.generateDepartmentChart(data);
}

export async function generateTrendsChart(data: ReportData): Promise<Buffer> {
  console.log('🎯 SERVER CHART WRAPPER: generateTrendsChart called');
  const generator = await initializeChartGenerator();
  return generator.generateTrendsChart(data);
}

export async function generateRequestStatusChart(data: ReportData): Promise<Buffer> {
  const generator = await initializeChartGenerator();
  return generator.generateRequestStatusChart(data);
}

export async function generateMonthlyTrendsChart(data: ReportData, language: string): Promise<Buffer> {
  console.log('🎯 SERVER CHART WRAPPER: generateMonthlyTrendsChart called');
  const generator = await initializeChartGenerator();
  return generator.generateMonthlyTrendsChart(data, language);
}

export async function generateStatusPieChart(data: ReportData, language: string): Promise<Buffer> {
  console.log('🎯 SERVER CHART WRAPPER: generateStatusPieChart called');
  const generator = await initializeChartGenerator();
  return generator.generateStatusPieChart(data, language);
}

export async function generateDepartmentBarChart(data: ReportData, language?: string): Promise<Buffer> {
  console.log('🎯 SERVER CHART WRAPPER: generateDepartmentBarChart called');
  const generator = await initializeChartGenerator();
  return generator.generateDepartmentBarChart(data, language);
}

export async function generateEmployeePerformanceChart(data: ReportData, language?: string): Promise<Buffer> {
  console.log('🎯 SERVER CHART WRAPPER: generateEmployeePerformanceChart called');
  const generator = await initializeChartGenerator();
  return generator.generateEmployeePerformanceChart(data, language);
}

// Export color constants that were previously imported
export const ADVANCED_COLORS = {
  primary: '#2563EB',
  secondary: '#059669',
  accent: '#DC2626',
  warning: '#D97706',
  text: '#1F2937',
  lightText: '#6B7280',
  background: '#F8FAFC',
  border: '#E2E8F0',
  success: '#10B981'
};