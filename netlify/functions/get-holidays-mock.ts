import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { getHolidayStatus, loadFromMockStorage } from '../../lib/mock-storage';

// Default mock system settings - will be overridden by stored settings
const defaultMockSettings = {
  'holidays.visibility_mode': 'all_see_all', // 'all_see_all' allows employees to see all holidays when viewMode=all
  'holidays.show_names': 'true',
  'holidays.show_details': 'false'
};

// Function to load current system settings from storage
function getCurrentSettings() {
  const storedSettings = loadFromMockStorage('system-settings');
  if (storedSettings && storedSettings.settings) {
    // Merge stored settings with defaults
    return {
      ...defaultMockSettings,
      ...storedSettings.settings
    };
  }
  return defaultMockSettings;
}

// Mock employees data to get department information
const mockEmployees = [
  { id: 'e1', name: 'Mario Rossi', email: 'mario.rossi@ominiaservice.net', department: 'IT Development' },
  { id: 'e2', name: 'Giulia Bianchi', email: 'giulia.bianchi@ominiaservice.net', department: 'Marketing' },
  { id: 'e3', name: 'Luca Verdi', email: 'luca.verdi@ominiaservice.net', department: 'Sales' },
  { id: 'e4', name: 'Anna Neri', email: 'anna.neri@ominiaservice.net', department: 'HR' },
  { id: 'e5', name: 'Paolo Blu', email: 'paolo.blu@ominiaservice.net', department: 'Operations' },
  { id: 'e6', name: 'Sofia Rosa', email: 'sofia.rosa@ominiaservice.net', department: 'Design' },
  { id: 'e7', name: 'Marco Giallo', email: 'marco.giallo@ominiaservice.net', department: 'Finance' },
  { id: 'e8', name: 'Elena Viola', email: 'elena.viola@ominiaservice.net', department: 'Customer Service' },
  { id: 'e9', name: 'Andrea Verde', email: 'andrea.verde@ominiaservice.net', department: 'Legal' },
  { id: 'e10', name: 'Chiara Arancio', email: 'chiara.arancio@ominiaservice.net', department: 'R&D' },
  { id: 'e11', name: 'Francesco Grigio', email: 'francesco.grigio@ominiaservice.net', department: 'IT Support' },
  { id: 'e12', name: 'Valentina Oro', email: 'valentina.oro@ominiaservice.net', department: 'Accounting' },
  { id: 'e13', name: 'Roberto Argento', email: 'roberto.argento@ominiaservice.net', department: 'Security' },
  { id: 'e14', name: 'Silvia Bronzo', email: 'silvia.bronzo@ominiaservice.net', department: 'Logistics' },
  { id: 'e15', name: 'Davide Platino', email: 'davide.platino@ominiaservice.net', department: 'Quality Control' },
  { id: 'e16', name: 'Federica Rame', email: 'federica.rame@ominiaservice.net', department: 'Training' },
  { id: 'e17', name: 'Matteo Scarlatto', email: 'matteo.scarlatto@ominiaservice.net', department: 'Web Development' },
  { id: 'e18', name: 'Alessandra Blu', email: 'alessandra.blu@ominiaservice.net', department: 'Social Media' },
  { id: 'e19', name: 'Simone Verde', email: 'simone.verde@ominiaservice.net', department: 'Data Analysis' },
  { id: 'e20', name: 'Francesca Gialla', email: 'francesca.gialla@ominiaservice.net', department: 'Content Creation' }
];

// Function to get user's department by email
function getUserDepartment(email: string): string | null {
  const employee = mockEmployees.find(emp => emp.email === email);
  return employee ? employee.department : null;
}

// Mock holiday data for development - Updated with overlapping holidays
const mockHolidays = [
  // August holidays - current month
  {
    id: 'h1',
    employeeId: 'e1',
    employeeName: 'Mario Rossi',
    employeeEmail: 'mario.rossi@ominiaservice.net',
    department: 'IT Development',
    startDate: '2025-08-15',
    endDate: '2025-08-19',
    workingDays: 5,
    type: 'vacation',
    status: 'pending',
    notes: 'Vacanze estive',
    createdAt: '2025-08-01T10:00:00.000Z'
  },
  {
    id: 'h2',
    employeeId: 'e2',
    employeeName: 'Giulia Bianchi',
    employeeEmail: 'giulia.bianchi@ominiaservice.net',
    department: 'Marketing',
    startDate: '2025-08-22',
    endDate: '2025-08-26',
    workingDays: 5,
    type: 'vacation',
    status: 'approved',
    notes: 'Ferie estive',
    createdAt: '2025-08-05T14:30:00.000Z'
  },
  {
    id: 'h3',
    employeeId: 'e1',
    employeeName: 'Mario Rossi',
    employeeEmail: 'mario.rossi@ominiaservice.net',
    department: 'IT Development',
    startDate: '2025-08-08',
    endDate: '2025-08-08',
    workingDays: 1,
    type: 'sick',
    status: 'approved',
    notes: 'Malattia',
    createdAt: '2025-08-08T08:00:00.000Z'
  },

  // OVERLAPPING HOLIDAYS - Same period for testing (August 25-29)
  {
    id: 'h4',
    employeeId: 'e3',
    employeeName: 'Luca Verdi',
    employeeEmail: 'luca.verdi@ominiaservice.net',
    department: 'Sales',
    startDate: '2025-08-25',
    endDate: '2025-08-29',
    workingDays: 5,
    type: 'vacation',
    status: 'approved',
    notes: 'Fine agosto - Primo gruppo',
    createdAt: '2025-08-10T12:00:00.000Z'
  },
  {
    id: 'h5',
    employeeId: 'e4',
    employeeName: 'Anna Neri',
    employeeEmail: 'anna.neri@ominiaservice.net',
    department: 'HR',
    startDate: '2025-08-26',
    endDate: '2025-08-30',
    workingDays: 5,
    type: 'vacation',
    status: 'approved',
    notes: 'Fine agosto - Secondo gruppo',
    createdAt: '2025-08-11T09:00:00.000Z'
  },
  {
    id: 'h6',
    employeeId: 'e5',
    employeeName: 'Paolo Blu',
    employeeEmail: 'paolo.blu@ominiaservice.net',
    department: 'Operations',
    startDate: '2025-08-27',
    endDate: '2025-08-29',
    workingDays: 3,
    type: 'vacation',
    status: 'pending',
    notes: 'Fine agosto - Terzo gruppo',
    createdAt: '2025-08-12T15:00:00.000Z'
  },

  // July-August overlap
  {
    id: 'h7',
    employeeId: 'e6',
    employeeName: 'Sofia Rosa',
    employeeEmail: 'sofia.rosa@ominiaservice.net',
    department: 'Design',
    startDate: '2025-07-29',
    endDate: '2025-08-02',
    workingDays: 5,
    type: 'vacation',
    status: 'approved',
    notes: 'Ponte fine luglio',
    createdAt: '2025-07-15T09:00:00.000Z'
  },

  // September holidays
  {
    id: 'h8',
    employeeId: 'e7',
    employeeName: 'Marco Giallo',
    employeeEmail: 'marco.giallo@ominiaservice.net',
    department: 'Finance',
    startDate: '2025-09-02',
    endDate: '2025-09-06',
    workingDays: 5,
    type: 'vacation',
    status: 'approved',
    notes: 'Prima settimana settembre',
    createdAt: '2025-08-20T11:00:00.000Z'
  },
  {
    id: 'h9',
    employeeId: 'e8',
    employeeName: 'Elena Viola',
    employeeEmail: 'elena.viola@ominiaservice.net',
    department: 'Customer Service',
    startDate: '2025-09-15',
    endDate: '2025-09-19',
    workingDays: 5,
    type: 'vacation',
    status: 'pending',
    notes: 'Metà settembre',
    createdAt: '2025-08-28T14:00:00.000Z'
  },

  // More overlapping in July for previous month testing
  {
    id: 'h10',
    employeeId: 'e9',
    employeeName: 'Andrea Verde',
    employeeEmail: 'andrea.verde@ominiaservice.net',
    department: 'Legal',
    startDate: '2025-07-14',
    endDate: '2025-07-18',
    workingDays: 5,
    type: 'vacation',
    status: 'approved',
    notes: 'Metà luglio',
    createdAt: '2025-07-01T10:00:00.000Z'
  },
  {
    id: 'h11',
    employeeId: 'e10',
    employeeName: 'Chiara Arancio',
    employeeEmail: 'chiara.arancio@ominiaservice.net',
    department: 'R&D',
    startDate: '2025-07-16',
    endDate: '2025-07-17',
    workingDays: 2,
    type: 'personal',
    status: 'approved',
    notes: 'Giorni personali',
    createdAt: '2025-07-05T16:00:00.000Z'
  },

  // TEST: 6 OVERLAPPING HOLIDAYS - Same days (August 15-17) to test event limit
  {
    id: 'h12',
    employeeId: 'e11',
    employeeName: 'Francesco Grigio',
    employeeEmail: 'francesco.grigio@ominiaservice.net',
    department: 'IT Support',
    startDate: '2025-08-15',
    endDate: '2025-08-17',
    workingDays: 3,
    type: 'vacation',
    status: 'approved',
    notes: 'Test sovrapposto 1',
    createdAt: '2025-08-01T09:00:00.000Z'
  },
  {
    id: 'h13',
    employeeId: 'e12',
    employeeName: 'Valentina Oro',
    employeeEmail: 'valentina.oro@ominiaservice.net',
    department: 'Accounting',
    startDate: '2025-08-15',
    endDate: '2025-08-17',
    workingDays: 3,
    type: 'personal',
    status: 'approved',
    notes: 'Test sovrapposto 2',
    createdAt: '2025-08-01T10:00:00.000Z'
  },
  {
    id: 'h14',
    employeeId: 'e13',
    employeeName: 'Roberto Argento',
    employeeEmail: 'roberto.argento@ominiaservice.net',
    department: 'Security',
    startDate: '2025-08-16',
    endDate: '2025-08-17',
    workingDays: 2,
    type: 'sick',
    status: 'pending',
    notes: 'Test sovrapposto 3',
    createdAt: '2025-08-01T11:00:00.000Z'
  },
  {
    id: 'h15',
    employeeId: 'e14',
    employeeName: 'Silvia Bronzo',
    employeeEmail: 'silvia.bronzo@ominiaservice.net',
    department: 'Logistics',
    startDate: '2025-08-16',
    endDate: '2025-08-17',
    workingDays: 2,
    type: 'vacation',
    status: 'approved',
    notes: 'Test sovrapposto 4',
    createdAt: '2025-08-01T12:00:00.000Z'
  },
  {
    id: 'h16',
    employeeId: 'e15',
    employeeName: 'Davide Platino',
    employeeEmail: 'davide.platino@ominiaservice.net',
    department: 'Quality Control',
    startDate: '2025-08-17',
    endDate: '2025-08-17',
    workingDays: 1,
    type: 'personal',
    status: 'approved',
    notes: 'Test sovrapposto 5',
    createdAt: '2025-08-01T13:00:00.000Z'
  },
  {
    id: 'h17',
    employeeId: 'e16',
    employeeName: 'Federica Rame',
    employeeEmail: 'federica.rame@ominiaservice.net',
    department: 'Training',
    startDate: '2025-08-17',
    endDate: '2025-08-17',
    workingDays: 1,
    type: 'vacation',
    status: 'pending',
    notes: 'Test sovrapposto 6',
    createdAt: '2025-08-01T14:00:00.000Z'
  },

  // ADDITIONAL 20 EMPLOYEES FOR STICKY TESTING
  {
    id: 'h18',
    employeeId: 'e17',
    employeeName: 'Matteo Scarlatto',
    employeeEmail: 'matteo.scarlatto@ominiaservice.net',
    department: 'Web Development',
    startDate: '2025-08-12',
    endDate: '2025-08-14',
    workingDays: 3,
    type: 'vacation',
    status: 'approved',
    notes: 'Metà agosto',
    createdAt: '2025-08-01T15:00:00.000Z'
  },
  {
    id: 'h19',
    employeeId: 'e18',
    employeeName: 'Alessandra Blu',
    employeeEmail: 'alessandra.blu@ominiaservice.net',
    department: 'Social Media',
    startDate: '2025-08-20',
    endDate: '2025-08-21',
    workingDays: 2,
    type: 'personal',
    status: 'pending',
    notes: 'Giorni personali',
    createdAt: '2025-08-02T09:00:00.000Z'
  },
  {
    id: 'h20',
    employeeId: 'e19',
    employeeName: 'Simone Verde',
    employeeEmail: 'simone.verde@ominiaservice.net',
    department: 'Data Analysis',
    startDate: '2025-08-05',
    endDate: '2025-08-07',
    workingDays: 3,
    type: 'vacation',
    status: 'approved',
    notes: 'Inizio agosto',
    createdAt: '2025-08-01T16:00:00.000Z'
  },
  {
    id: 'h21',
    employeeId: 'e20',
    employeeName: 'Francesca Gialla',
    employeeEmail: 'francesca.gialla@ominiaservice.net',
    department: 'Content Creation',
    startDate: '2025-08-28',
    endDate: '2025-08-30',
    workingDays: 3,
    type: 'vacation',
    status: 'approved',
    notes: 'Fine agosto',
    createdAt: '2025-08-03T10:00:00.000Z'
  },
  {
    id: 'h22',
    employeeId: 'e21',
    employeeName: 'Lorenzo Rosso',
    employeeEmail: 'lorenzo.rosso@ominiaservice.net',
    department: 'DevOps',
    startDate: '2025-08-13',
    endDate: '2025-08-13',
    workingDays: 1,
    type: 'sick',
    status: 'approved',
    notes: 'Malattia',
    createdAt: '2025-08-13T08:30:00.000Z'
  },
  {
    id: 'h23',
    employeeId: 'e22',
    employeeName: 'Beatrice Bianca',
    employeeEmail: 'beatrice.bianca@ominiaservice.net',
    department: 'UX Design',
    startDate: '2025-08-19',
    endDate: '2025-08-23',
    workingDays: 5,
    type: 'vacation',
    status: 'pending',
    notes: 'Vacanze estive',
    createdAt: '2025-08-04T11:00:00.000Z'
  },
  {
    id: 'h24',
    employeeId: 'e23',
    employeeName: 'Gabriele Nero',
    employeeEmail: 'gabriele.nero@ominiaservice.net',
    department: 'System Admin',
    startDate: '2025-08-09',
    endDate: '2025-08-11',
    workingDays: 3,
    type: 'personal',
    status: 'approved',
    notes: 'Weekend lungo',
    createdAt: '2025-08-05T12:00:00.000Z'
  },
  {
    id: 'h25',
    employeeId: 'e24',
    employeeName: 'Martina Rosa',
    employeeEmail: 'martina.rosa@ominiaservice.net',
    department: 'Project Management',
    startDate: '2025-08-26',
    endDate: '2025-08-29',
    workingDays: 4,
    type: 'vacation',
    status: 'approved',
    notes: 'Ultima settimana agosto',
    createdAt: '2025-08-06T13:00:00.000Z'
  },
  {
    id: 'h26',
    employeeId: 'e25',
    employeeName: 'Alessandro Azzurro',
    employeeEmail: 'alessandro.azzurro@ominiaservice.net',
    department: 'Mobile Development',
    startDate: '2025-08-06',
    endDate: '2025-08-08',
    workingDays: 3,
    type: 'vacation',
    status: 'approved',
    notes: 'Ponte inizio agosto',
    createdAt: '2025-08-07T14:00:00.000Z'
  },
  {
    id: 'h27',
    employeeId: 'e26',
    employeeName: 'Cristina Viola',
    employeeEmail: 'cristina.viola@ominiaservice.net',
    department: 'Business Intelligence',
    startDate: '2025-08-14',
    endDate: '2025-08-16',
    workingDays: 3,
    type: 'vacation',
    status: 'pending',
    notes: 'Ferragosto',
    createdAt: '2025-08-08T15:00:00.000Z'
  },
  {
    id: 'h28',
    employeeId: 'e27',
    employeeName: 'Daniele Grigio',
    employeeEmail: 'daniele.grigio@ominiaservice.net',
    department: 'Cloud Infrastructure',
    startDate: '2025-08-21',
    endDate: '2025-08-22',
    workingDays: 2,
    type: 'personal',
    status: 'approved',
    notes: 'Giorni personali',
    createdAt: '2025-08-09T16:00:00.000Z'
  },
  {
    id: 'h29',
    employeeId: 'e28',
    employeeName: 'Eleonora Oro',
    employeeEmail: 'eleonora.oro@ominiaservice.net',
    department: 'Digital Marketing',
    startDate: '2025-08-27',
    endDate: '2025-08-28',
    workingDays: 2,
    type: 'vacation',
    status: 'approved',
    notes: 'Fine agosto',
    createdAt: '2025-08-10T17:00:00.000Z'
  },
  {
    id: 'h30',
    employeeId: 'e29',
    employeeName: 'Fabio Argento',
    employeeEmail: 'fabio.argento@ominiaservice.net',
    department: 'Backend Development',
    startDate: '2025-08-04',
    endDate: '2025-08-06',
    workingDays: 3,
    type: 'sick',
    status: 'approved',
    notes: 'Malattia',
    createdAt: '2025-08-04T08:00:00.000Z'
  },
  {
    id: 'h31',
    employeeId: 'e30',
    employeeName: 'Giorgia Bronzo',
    employeeEmail: 'giorgia.bronzo@ominiaservice.net',
    department: 'Product Management',
    startDate: '2025-08-18',
    endDate: '2025-08-20',
    workingDays: 3,
    type: 'vacation',
    status: 'pending',
    notes: 'Metà agosto',
    createdAt: '2025-08-11T09:00:00.000Z'
  },
  {
    id: 'h32',
    employeeId: 'e31',
    employeeName: 'Hugo Platino',
    employeeEmail: 'hugo.platino@ominiaservice.net',
    department: 'API Development',
    startDate: '2025-08-25',
    endDate: '2025-08-27',
    workingDays: 3,
    type: 'personal',
    status: 'approved',
    notes: 'Giorni personali',
    createdAt: '2025-08-12T10:00:00.000Z'
  },
  {
    id: 'h33',
    employeeId: 'e32',
    employeeName: 'Ilaria Rame',
    employeeEmail: 'ilaria.rame@ominiaservice.net',
    department: 'Frontend Development',
    startDate: '2025-08-10',
    endDate: '2025-08-12',
    workingDays: 3,
    type: 'vacation',
    status: 'approved',
    notes: 'Weekend lungo',
    createdAt: '2025-08-13T11:00:00.000Z'
  },
  {
    id: 'h34',
    employeeId: 'e33',
    employeeName: 'Jacopo Scuro',
    employeeEmail: 'jacopo.scuro@ominiaservice.net',
    department: 'Database Management',
    startDate: '2025-08-29',
    endDate: '2025-08-30',
    workingDays: 2,
    type: 'vacation',
    status: 'approved',
    notes: 'Fine agosto',
    createdAt: '2025-08-14T12:00:00.000Z'
  },
  {
    id: 'h35',
    employeeId: 'e34',
    employeeName: 'Katia Chiaro',
    employeeEmail: 'katia.chiaro@ominiaservice.net',
    department: 'Testing & QA',
    startDate: '2025-08-15',
    endDate: '2025-08-16',
    workingDays: 2,
    type: 'personal',
    status: 'pending',
    notes: 'Ferragosto',
    createdAt: '2025-08-15T13:00:00.000Z'
  },
  {
    id: 'h36',
    employeeId: 'e35',
    employeeName: 'Luca Brillante',
    employeeEmail: 'luca.brillante@ominiaservice.net',
    department: 'Tech Support',
    startDate: '2025-08-23',
    endDate: '2025-08-25',
    workingDays: 3,
    type: 'vacation',
    status: 'approved',
    notes: 'Fine agosto',
    createdAt: '2025-08-16T14:00:00.000Z'
  },
  {
    id: 'h37',
    employeeId: 'e36',
    employeeName: 'Monica Splendente',
    employeeEmail: 'monica.splendente@ominiaservice.net',
    department: 'Graphic Design',
    startDate: '2025-08-07',
    endDate: '2025-08-09',
    workingDays: 3,
    type: 'sick',
    status: 'approved',
    notes: 'Malattia',
    createdAt: '2025-08-07T07:00:00.000Z'
  }
];

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Verify authentication
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status;
    const viewMode = queryParams.viewMode || 'own';
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;

    // Load new holiday requests from mock storage and merge with mock data
    const newHolidayRequests = loadFromMockStorage('new-holiday-requests') || [];
    let allHolidays = [...mockHolidays, ...newHolidayRequests];
    let filteredHolidays = allHolidays;

    // Filter by date range if provided
    if (startDate && endDate) {
      const filterStart = new Date(startDate);
      const filterEnd = new Date(endDate);
      
      filteredHolidays = filteredHolidays.filter(holiday => {
        const holidayStart = new Date(holiday.startDate);
        const holidayEnd = new Date(holiday.endDate);
        
        // Include holidays that overlap with the requested range
        return (
          (holidayStart >= filterStart && holidayStart <= filterEnd) ||
          (holidayEnd >= filterStart && holidayEnd <= filterEnd) ||
          (holidayStart <= filterStart && holidayEnd >= filterEnd)
        );
      });
    }

    // Filter by status if provided
    if (status) {
      filteredHolidays = filteredHolidays.filter(h => h.status === status);
    }

    // Get current system settings from storage
    const currentSettings = getCurrentSettings();
    const visibilityMode = currentSettings['holidays.visibility_mode'];
    
    // Apply view mode filtering based on role and system settings
    if (userToken.role !== 'admin') {
      // Get user's department for department-based filtering
      const userDepartment = getUserDepartment(userToken.email);
      
      console.log(`User ${userToken.email} (${userToken.role}) - Department: ${userDepartment}, ViewMode: ${viewMode}, VisibilityMode: ${visibilityMode}`);

      if (viewMode === 'all') {
        // User requested to see all holidays - check system permissions
        if (visibilityMode === 'all_see_all') {
          // System allows all employees to see everyone's holidays
          console.log(`✅ User ${userToken.email} can see ALL holidays (system allows all_see_all)`);
          // Keep all holidays
        } else if (visibilityMode === 'department_only' && userDepartment) {
          // System allows department-level visibility only
          filteredHolidays = filteredHolidays.filter(h => 
            h.employeeId === userToken.userId || h.department === userDepartment
          );
          console.log(`✅ User ${userToken.email} can see department holidays only (${userDepartment})`);
        } else {
          // System restricts to admin_only - show only own holidays
          filteredHolidays = filteredHolidays.filter(h => h.employeeId === userToken.userId);
          console.log(`❌ User ${userToken.email} restricted to own holidays only (admin_only mode)`);
        }
      } else if (viewMode === 'team') {
        // User requested to see team/department holidays
        if (visibilityMode === 'all_see_all' || visibilityMode === 'department_only') {
          if (userDepartment) {
            // Show department holidays including own
            filteredHolidays = filteredHolidays.filter(h => h.department === userDepartment);
            console.log(`✅ User ${userToken.email} can see team holidays for department: ${userDepartment}`);
          } else {
            // User has no department - show only own holidays
            filteredHolidays = filteredHolidays.filter(h => h.employeeId === userToken.userId);
            console.log(`⚠️ User ${userToken.email} has no department - showing own holidays only`);
          }
        } else {
          // admin_only mode - restrict to own holidays
          filteredHolidays = filteredHolidays.filter(h => h.employeeId === userToken.userId);
          console.log(`❌ User ${userToken.email} restricted to own holidays (admin_only mode prevents team view)`);
        }
      } else if (viewMode === 'own' || !viewMode) {
        // Default: show only own holidays
        filteredHolidays = filteredHolidays.filter(h => h.employeeId === userToken.userId);
        console.log(`✅ User ${userToken.email} viewing own holidays only`);
      }
    } else {
      // Admin users can see everything regardless of system settings
      console.log(`✅ Admin user ${userToken.email} can see all holidays in ${viewMode} mode`);
    }

    console.log('Mock holidays final result:', {
      user: userToken.email,
      role: userToken.role,
      department: getUserDepartment(userToken.email),
      requestedViewMode: viewMode,
      systemVisibilityMode: visibilityMode,
      statusFilter: status,
      finalHolidayCount: filteredHolidays.length
    });

    // Apply status updates from shared mock storage
    const holidaysWithUpdatedStatus = filteredHolidays.map(holiday => {
      const updatedStatus = getHolidayStatus(holiday.id);
      console.log(`Holiday ${holiday.id} (${holiday.employeeName}): original=${holiday.status}, updated=${updatedStatus || 'none'}`);
      return {
        ...holiday,
        status: updatedStatus || holiday.status
      };
    });

    // Sort by creation date (newest first) to show recent requests at the top
    holidaysWithUpdatedStatus.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    // Return mock holiday data with updated statuses
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          holidays: holidaysWithUpdatedStatus,
          total: holidaysWithUpdatedStatus.length,
          pending: holidaysWithUpdatedStatus.filter(h => h.status === 'pending').length,
          approved: holidaysWithUpdatedStatus.filter(h => h.status === 'approved').length,
          rejected: holidaysWithUpdatedStatus.filter(h => h.status === 'rejected').length
        }
      })
    };

  } catch (error) {
    console.error('Get holidays mock error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Token')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno del server' })
    };
  }
};