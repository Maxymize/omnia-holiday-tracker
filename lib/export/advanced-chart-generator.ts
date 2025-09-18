// IMPORTANT: This module should ONLY be imported in server-side environments (Netlify Functions)
// It will fail in browser/client environments due to 'canvas' dependency

import { ReportData, DepartmentStats, EmployeePerformance } from './types';
import { calculateMonthlyTrends, getRequestsByType, getRequestsByStatus } from './report-data';

// Conditional imports for server-side only
let ChartJSNodeCanvas: any;
let ChartConfiguration: any;
let ChartData: any;

let chartJSNodeCanvas: any;
let pieChartCanvas: any;

// Only import and initialize in server environment
if (typeof window === 'undefined') {
  try {
    console.log('🔧 CHART GENERATOR: Initializing server-side chart dependencies...');

    const chartjsNodeCanvasModule = require('chartjs-node-canvas');
    ChartJSNodeCanvas = chartjsNodeCanvasModule.ChartJSNodeCanvas;

    // Import Chart.js components and register them
    const { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement, TimeScale } = require('chart.js');

    // Register Chart.js components
    Chart.register(
      CategoryScale,
      LinearScale,
      BarElement,
      Title,
      Tooltip,
      Legend,
      ArcElement,
      LineElement,
      PointElement,
      TimeScale
    );

    console.log('✅ CHART GENERATOR: Chart.js components registered successfully');

    // Chart.js Node Canvas configuration
    chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 800,
      height: 400,
      backgroundColour: 'white',
      chartCallback: (ChartJS: any) => {
        // Additional Chart.js configuration if needed
        ChartJS.defaults.responsive = false;
        ChartJS.defaults.animation = false;
      }
    });

    // Separate canvas for pie charts to ensure circular shape
    pieChartCanvas = new ChartJSNodeCanvas({
      width: 500,
      height: 500,
      backgroundColour: 'white',
      chartCallback: (ChartJS: any) => {
        ChartJS.defaults.responsive = false;
        ChartJS.defaults.animation = false;
      }
    });

    console.log('✅ CHART GENERATOR: Server-side chart dependencies initialized successfully');
  } catch (error) {
    console.error('❌ CHART GENERATOR: Failed to load chart.js dependencies in server environment:', error);
    chartJSNodeCanvas = null;
    pieChartCanvas = null;
  }
} else {
  console.log('⚠️ CHART GENERATOR: Browser environment detected - chart generation disabled');
}

// OmniaGroup color palette - professional and modern
export const ADVANCED_COLORS = {
  primary: '#2563EB',      // Modern blue
  secondary: '#059669',     // Emerald green
  accent: '#DC2626',        // Red
  warning: '#D97706',       // Amber
  purple: '#7C3AED',        // Violet
  pink: '#DB2777',          // Pink
  teal: '#0D9488',          // Teal
  gray: '#64748B',          // Slate gray
  gradients: {
    blue: ['#3B82F6', '#1E40AF'],
    green: ['#10B981', '#059669'],
    red: ['#EF4444', '#DC2626'],
    purple: ['#8B5CF6', '#7C3AED'],
    orange: ['#F59E0B', '#D97706']
  }
};

// Base chart options for consistency
const basePluginOptions = {
  legend: {
    position: 'bottom' as const,
    labels: {
      padding: 20,
      usePointStyle: true,
      font: {
        size: 12,
        family: 'Helvetica'
      }
    }
  },
  tooltip: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    titleColor: 'white',
    bodyColor: 'white',
    borderColor: '#374151',
    borderWidth: 1,
    cornerRadius: 8,
    displayColors: true
  }
};

// Base options for charts without scales (pie, doughnut)
const baseOptionsNoScales = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: basePluginOptions
};

// Base options for charts with scales (bar, line)
const baseOptionsWithScales = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: basePluginOptions,
  elements: {
    point: {
      radius: 4,
      hoverRadius: 6
    },
    line: {
      tension: 0.4
    }
  }
};

// Generate pie chart for request status distribution
export async function generateStatusPieChart(data: ReportData, language: 'it' | 'en' | 'es' = 'it'): Promise<Buffer> {
  // Safety check for server-side environment
  if (!pieChartCanvas) {
    throw new Error('Chart generation not available - server environment required');
  }
  const requestsByStatus = getRequestsByStatus(data.requests);

  const labels = getStatusLabels(language);
  const chartData: any = {
    labels: [
      labels.approved,
      labels.pending,
      labels.rejected
    ],
    datasets: [{
      data: [
        requestsByStatus.approved,
        requestsByStatus.pending,
        requestsByStatus.rejected
      ],
      backgroundColor: [
        ADVANCED_COLORS.secondary,
        ADVANCED_COLORS.warning,
        ADVANCED_COLORS.accent
      ],
      borderColor: 'white',
      borderWidth: 2,
      hoverOffset: 10
    }]
  };

  const configuration: any = {
    type: 'pie',
    data: chartData,
    options: {
      ...baseOptionsNoScales,
      aspectRatio: 1,
      maintainAspectRatio: true,
      plugins: {
        ...baseOptionsNoScales.plugins,
        title: {
          display: true,
          text: getChartTitle('requestStatus', language),
          font: {
            size: 16,
            weight: 'bold'
          },
          color: '#1F2937',
          padding: {
            top: 10,
            bottom: 20
          }
        }
      }
    }
  };

  return await pieChartCanvas.renderToBuffer(configuration);
}

// Generate department utilization bar chart
export async function generateDepartmentBarChart(data: ReportData, language: 'it' | 'en' | 'es' = 'it'): Promise<Buffer> {
  // Safety check for server-side environment
  if (!chartJSNodeCanvas) {
    throw new Error('Chart generation not available - server environment required');
  }
  // Safety check: ensure we have department data
  if (!data.departmentStats || data.departmentStats.length === 0) {
    throw new Error('No department data available for chart generation');
  }

  // Get departments with real data and activity in the period
  const sortedDepartments = data.departmentStats
    .filter(dept => dept.employeeCount > 0) // Only departments with employees
    .sort((a, b) => b.utilizationRate - a.utilizationRate)
    .slice(0, 8); // Top 8 departments

  console.log('Department chart data (FIXED):', sortedDepartments.map(d => ({
    name: d.name,
    employees: d.employeeCount,
    utilizationRate: d.utilizationRate,
    requests: d.requests,
    daysUsed: d.holidaysUsed
  })));

  console.log('Department chart validation:', {
    totalDepts: sortedDepartments.length,
    hasData: sortedDepartments.some(d => d.utilizationRate > 0),
    allUtilizations: sortedDepartments.map(d => d.utilizationRate)
  });

  // Safety check after filtering
  if (sortedDepartments.length === 0) {
    throw new Error('No valid departments found after filtering');
  }

  // Additional check: if all utilization rates are 0, still generate chart but with warning
  const hasNonZeroData = sortedDepartments.some(d => d.utilizationRate > 0);
  if (!hasNonZeroData) {
    console.warn('WARNING: All departments have 0% utilization, but generating chart anyway');
  }

  const chartData: any = {
    labels: sortedDepartments.map(dept => dept.name),
    datasets: [{
      label: getDatasetLabel('utilizationRate', language),
      data: sortedDepartments.map(dept => dept.utilizationRate),
      backgroundColor: sortedDepartments.map((_, index) =>
        index % 2 === 0 ? ADVANCED_COLORS.primary : ADVANCED_COLORS.secondary
      ),
      borderColor: sortedDepartments.map((_, index) =>
        index % 2 === 0 ? '#1E40AF' : '#047857'
      ),
      borderWidth: 1,
      borderRadius: 6,
      borderSkipped: false
    }]
  };

  const configuration: any = {
    type: 'bar',
    data: chartData,
    options: {
      ...baseOptionsWithScales,
      plugins: {
        ...baseOptionsWithScales.plugins,
        title: {
          display: true,
          text: getChartTitle('departmentUtilization', language),
          font: {
            size: 16,
            weight: 'bold'
          },
          color: '#1F2937',
          padding: {
            top: 10,
            bottom: 20
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value: any) {
              return value + '%';
            },
            font: {
              size: 11
            }
          },
          grid: {
            color: '#E5E7EB'
          }
        },
        x: {
          ticks: {
            font: {
              size: 11
            },
            maxRotation: 45
          },
          grid: {
            display: false
          }
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

// Generate monthly trends line chart
export async function generateMonthlyTrendsChart(data: ReportData, language: 'it' | 'en' | 'es' = 'it'): Promise<Buffer> {
  // Safety check for server-side environment
  if (!chartJSNodeCanvas) {
    throw new Error('Chart generation not available - server environment required');
  }
  console.log('🔥 TRENDS CHART GENERATION STARTED 🔥');
  console.log('Input validation:', {
    hasData: !!data,
    hasRequests: !!data?.requests,
    requestsLength: data?.requests?.length || 0,
    hasPeriod: !!data?.period,
    periodType: data?.period?.type,
    language: language
  });

  let monthlyTrends;
  try {
    monthlyTrends = calculateMonthlyTrends(data.requests, data.period);
  } catch (trendsError) {
    console.error('🚨 TRENDS CALCULATION ERROR:', trendsError);
    throw new Error(`Monthly trends calculation failed: ${trendsError instanceof Error ? trendsError.message : 'Unknown error'}`);
  }

  console.log('🔥 TRENDS CALCULATION COMPLETED, PROCEEDING TO CHART 🔥');

  // Enhanced logging to understand data flow
  console.log('Monthly Trends Chart Generation (FIXED):', {
    totalRequests: data.requests.length,
    periodType: data.period.type,
    periodLabel: data.period.label,
    startDate: data.period.startDate,
    endDate: data.period.endDate,
    monthlyTrendsLength: monthlyTrends.length,
    hasData: monthlyTrends.some(m => m.requests > 0),
    allTrends: monthlyTrends // Show all months for debugging
  });

  // Safety check for empty data
  if (monthlyTrends.length === 0) {
    throw new Error('No monthly trends data available for the selected period');
  }

  // Determine chart type based on number of months
  const isSingleMonth = monthlyTrends.length === 1;
  const chartType = isSingleMonth ? 'bar' : 'line';

  console.log(`Using ${chartType} chart for ${monthlyTrends.length} month(s)`);

  // Create chart data with different configurations for bar vs line charts
  const chartData = isSingleMonth ? {
    // Bar chart configuration for single month
    labels: monthlyTrends.map(trend => trend.month),
    datasets: [
      {
        label: getDatasetLabel('requests', language),
        data: monthlyTrends.map(trend => trend.requests),
        backgroundColor: ADVANCED_COLORS.primary,
        borderColor: ADVANCED_COLORS.primary,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      },
      {
        label: getDatasetLabel('approvals', language),
        data: monthlyTrends.map(trend => trend.approvals),
        backgroundColor: ADVANCED_COLORS.secondary,
        borderColor: ADVANCED_COLORS.secondary,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  } : {
    // Line chart configuration for multiple months
    labels: monthlyTrends.map(trend => trend.month),
    datasets: [
      {
        label: getDatasetLabel('requests', language),
        data: monthlyTrends.map(trend => trend.requests),
        borderColor: ADVANCED_COLORS.primary,
        backgroundColor: ADVANCED_COLORS.primary + '20',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: ADVANCED_COLORS.primary,
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: getDatasetLabel('approvals', language),
        data: monthlyTrends.map(trend => trend.approvals),
        borderColor: ADVANCED_COLORS.secondary,
        backgroundColor: ADVANCED_COLORS.secondary + '20',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: ADVANCED_COLORS.secondary,
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  // Create separate configurations for different chart types
  if (isSingleMonth) {
    // Bar chart configuration for single month
    const barConfiguration: any = {
      type: 'bar',
      data: chartData,
      options: {
        ...baseOptionsWithScales,
        plugins: {
          ...baseOptionsWithScales.plugins,
          title: {
            display: true,
            text: getChartTitle('monthlyTrends', language),
            font: {
              size: 16,
              weight: 'bold'
            },
            color: '#1F2937',
            padding: {
              top: 10,
              bottom: 20
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            min: 0,
            ticks: {
              stepSize: 1, // Smaller steps for single month
              callback: function(value: any) {
                return value.toString();
              },
              font: {
                size: 11
              }
            },
            grid: {
              color: '#E5E7EB'
            },
            title: {
              display: true,
              text: language === 'it' ? 'Numero' : language === 'es' ? 'Número' : 'Count',
              font: {
                size: 12
              }
            }
          },
          x: {
            ticks: {
              font: {
                size: 12 // Larger font for single month
              },
              maxRotation: 0, // No rotation for single month
              minRotation: 0
            },
            grid: {
              color: '#E5E7EB',
              display: false
            },
            title: {
              display: true,
              text: language === 'it' ? 'Mese' : language === 'es' ? 'Mes' : 'Month',
              font: {
                size: 12
              }
            }
          }
        }
      }
    };

    return await chartJSNodeCanvas.renderToBuffer(barConfiguration);
  } else {
    // Line chart configuration for multiple months
    const lineConfiguration: any = {
      type: 'line',
      data: chartData,
      options: {
        ...baseOptionsWithScales,
        plugins: {
          ...baseOptionsWithScales.plugins,
          title: {
            display: true,
            text: getChartTitle('monthlyTrends', language),
            font: {
              size: 16,
              weight: 'bold'
            },
            color: '#1F2937',
            padding: {
              top: 10,
              bottom: 20
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            min: 0,
            ticks: {
              stepSize: 5,
              callback: function(value: any) {
                return value.toString();
              },
              font: {
                size: 11
              }
            },
            grid: {
              color: '#E5E7EB'
            },
            title: {
              display: true,
              text: language === 'it' ? 'Numero' : language === 'es' ? 'Número' : 'Count',
              font: {
                size: 12
              }
            }
          },
          x: {
            ticks: {
              font: {
                size: 10
              },
              maxRotation: 45,
              minRotation: 0
            },
            grid: {
              color: '#E5E7EB',
              display: false
            },
            title: {
              display: true,
              text: language === 'it' ? 'Mese' : language === 'es' ? 'Mes' : 'Month',
              font: {
                size: 12
              }
            }
          }
        }
      }
    };

    return await chartJSNodeCanvas.renderToBuffer(lineConfiguration);
  }
}

// Generate employee performance horizontal bar chart
export async function generateEmployeePerformanceChart(data: ReportData, language: 'it' | 'en' | 'es' = 'it'): Promise<Buffer> {
  // Safety check for server-side environment
  if (!chartJSNodeCanvas) {
    throw new Error('Chart generation not available - server environment required');
  }
  const topEmployees = data.employeePerformance
    .filter(emp => emp.status === 'active')
    .sort((a, b) => b.utilizationRate - a.utilizationRate)
    .slice(0, 10);

  const chartData: any = {
    labels: topEmployees.map(emp => emp.name.split(' ').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ')),
    datasets: [{
      label: getDatasetLabel('utilizationRate', language),
      data: topEmployees.map(emp => emp.utilizationRate),
      backgroundColor: ADVANCED_COLORS.gradients.blue[0],
      borderColor: ADVANCED_COLORS.gradients.blue[1],
      borderWidth: 1,
      borderRadius: 6,
      borderSkipped: false
    }]
  };

  const configuration: any = {
    type: 'bar',
    data: chartData,
    options: {
      ...baseOptionsWithScales,
      indexAxis: 'y',
      plugins: {
        ...baseOptionsWithScales.plugins,
        title: {
          display: true,
          text: getChartTitle('topEmployees', language),
          font: {
            size: 16,
            weight: 'bold'
          },
          color: '#1F2937',
          padding: {
            top: 10,
            bottom: 20
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value: any) {
              return value + '%';
            },
            font: {
              size: 11
            }
          },
          grid: {
            color: '#E5E7EB'
          }
        },
        y: {
          ticks: {
            font: {
              size: 10
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}

// Generate holiday types donut chart
export async function generateHolidayTypesChart(data: ReportData, language: 'it' | 'en' | 'es' = 'it'): Promise<Buffer> {
  // Safety check for server-side environment
  if (!pieChartCanvas) {
    throw new Error('Chart generation not available - server environment required');
  }
  const requestsByType = getRequestsByType(data.requests);

  const labels = getTypeLabels(language);
  const chartData: any = {
    labels: [
      labels.vacation,
      labels.sick,
      labels.personal
    ],
    datasets: [{
      data: [
        requestsByType.vacation,
        requestsByType.sick,
        requestsByType.personal
      ],
      backgroundColor: [
        ADVANCED_COLORS.primary,
        ADVANCED_COLORS.accent,
        ADVANCED_COLORS.purple
      ],
      borderColor: 'white',
      borderWidth: 3,
      hoverOffset: 15
    }]
  };

  const configuration: any = {
    type: 'doughnut',
    data: chartData,
    options: {
      ...baseOptionsNoScales,
      aspectRatio: 1,
      maintainAspectRatio: true,
      cutout: '60%',
      plugins: {
        ...baseOptionsNoScales.plugins,
        title: {
          display: true,
          text: getChartTitle('holidayTypes', language),
          font: {
            size: 16,
            weight: 'bold'
          },
          color: '#1F2937',
          padding: {
            top: 10,
            bottom: 20
          }
        }
      }
    }
  };

  return await pieChartCanvas.renderToBuffer(configuration);
}

// Utility functions for translations
function getStatusLabels(language: 'it' | 'en' | 'es') {
  const translations = {
    it: { approved: 'Approvate', pending: 'In Attesa', rejected: 'Rifiutate' },
    en: { approved: 'Approved', pending: 'Pending', rejected: 'Rejected' },
    es: { approved: 'Aprobadas', pending: 'Pendientes', rejected: 'Rechazadas' }
  };
  return translations[language];
}

function getTypeLabels(language: 'it' | 'en' | 'es') {
  const translations = {
    it: { vacation: 'Ferie', sick: 'Malattia', personal: 'Permessi' },
    en: { vacation: 'Vacation', sick: 'Sick Leave', personal: 'Personal' },
    es: { vacation: 'Vacaciones', sick: 'Enfermedad', personal: 'Personal' }
  };
  return translations[language];
}

function getChartTitle(type: keyof typeof chartTitleTranslations.it, language: 'it' | 'en' | 'es') {
  const chartTitleTranslations = {
    it: {
      requestStatus: 'Distribuzione Richieste per Stato',
      departmentUtilization: 'Utilizzo Ferie per Dipartimento (%)',
      monthlyTrends: 'Tendenze Mensili Richieste',
      topEmployees: 'Top 10 Dipendenti per Utilizzo Ferie (%)',
      holidayTypes: 'Distribuzione per Tipo di Ferie'
    },
    en: {
      requestStatus: 'Request Distribution by Status',
      departmentUtilization: 'Holiday Utilization by Department (%)',
      monthlyTrends: 'Monthly Request Trends',
      topEmployees: 'Top 10 Employees by Holiday Usage (%)',
      holidayTypes: 'Distribution by Holiday Type'
    },
    es: {
      requestStatus: 'Distribución de Solicitudes por Estado',
      departmentUtilization: 'Utilización de Vacaciones por Departamento (%)',
      monthlyTrends: 'Tendencias Mensuales de Solicitudes',
      topEmployees: 'Top 10 Empleados por Uso de Vacaciones (%)',
      holidayTypes: 'Distribución por Tipo de Vacaciones'
    }
  };
  return chartTitleTranslations[language][type] || '';
}

function getDatasetLabel(type: keyof typeof datasetTranslations.it, language: 'it' | 'en' | 'es') {
  const datasetTranslations = {
    it: {
      utilizationRate: 'Tasso di Utilizzo (%)',
      requests: 'Richieste',
      approvals: 'Approvazioni'
    },
    en: {
      utilizationRate: 'Utilization Rate (%)',
      requests: 'Requests',
      approvals: 'Approvals'
    },
    es: {
      utilizationRate: 'Tasa de Utilización (%)',
      requests: 'Solicitudes',
      approvals: 'Aprobaciones'
    }
  };
  return datasetTranslations[language][type] || '';
}

// Export chart configuration for reuse
export const CHART_DIMENSIONS = {
  width: 800,
  height: 400,
  smallWidth: 600,
  smallHeight: 300
};