import * as fs from 'fs';
import * as path from 'path';

// File-based storage for mock data (since Netlify Functions don't share memory)
// This simulates a database for development purposes
const TEMP_DIR = '/tmp';
const HOLIDAY_STATUS_FILE = path.join(TEMP_DIR, 'holiday-status.json');
const EMPLOYEE_STATUS_FILE = path.join(TEMP_DIR, 'employee-status.json');
const NEW_REQUESTS_FILE = path.join(TEMP_DIR, 'new-requests.json');

// Load holiday status updates from file
function loadHolidayStatusMap(): Map<string, {
  status: string;
  approvedBy: string;
  approvedAt: string;
  notes?: string;
}> {
  try {
    if (fs.existsSync(HOLIDAY_STATUS_FILE)) {
      const data = fs.readFileSync(HOLIDAY_STATUS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.warn('Failed to load holiday status map:', error);
  }
  return new Map();
}

// Save holiday status updates to file
function saveHolidayStatusMap(map: Map<string, any>) {
  try {
    const obj = Object.fromEntries(map);
    fs.writeFileSync(HOLIDAY_STATUS_FILE, JSON.stringify(obj, null, 2));
  } catch (error) {
    console.warn('Failed to save holiday status map:', error);
  }
}

// Function to get updated status for a holiday
export function getHolidayStatus(holidayId: string): string | undefined {
  const map = loadHolidayStatusMap();
  const statusData = map.get(holidayId);
  console.log(`Getting status for ${holidayId}: ${statusData?.status || 'not found'}`);
  return statusData?.status;
}

// Function to update holiday status
export function updateHolidayStatus(holidayId: string, status: string, approvedBy: string, notes?: string) {
  const map = loadHolidayStatusMap();
  map.set(holidayId, {
    status,
    approvedBy,
    approvedAt: new Date().toISOString(),
    notes
  });
  saveHolidayStatusMap(map);
  console.log(`Updated status for ${holidayId} to ${status}`);
}

// Load employee status updates from file
function loadEmployeeStatusMap(): Map<string, {
  status: string;
  approvedBy: string;
  approvedAt: string;
  reason?: string;
}> {
  try {
    if (fs.existsSync(EMPLOYEE_STATUS_FILE)) {
      const data = fs.readFileSync(EMPLOYEE_STATUS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.warn('Failed to load employee status map:', error);
  }
  return new Map();
}

// Save employee status updates to file
function saveEmployeeStatusMap(map: Map<string, any>) {
  try {
    const obj = Object.fromEntries(map);
    fs.writeFileSync(EMPLOYEE_STATUS_FILE, JSON.stringify(obj, null, 2));
  } catch (error) {
    console.warn('Failed to save employee status map:', error);
  }
}

// Function to get updated status for an employee
export function getEmployeeStatus(employeeId: string): string | undefined {
  const map = loadEmployeeStatusMap();
  const statusData = map.get(employeeId);
  console.log(`Getting employee status for ${employeeId}: ${statusData?.status || 'not found'}`);
  return statusData?.status;
}

// Function to update employee status
export function updateEmployeeStatus(employeeId: string, status: string, approvedBy: string, reason?: string) {
  const map = loadEmployeeStatusMap();
  map.set(employeeId, {
    status,
    approvedBy,
    approvedAt: new Date().toISOString(),
    reason
  });
  saveEmployeeStatusMap(map);
  console.log(`Updated employee status for ${employeeId} to ${status}`);
}

// Store new holiday requests created during session
export const newHolidayRequests: any[] = [];

// Clear all mock data (useful for testing)
export function clearMockData() {
  try {
    if (fs.existsSync(HOLIDAY_STATUS_FILE)) {
      fs.unlinkSync(HOLIDAY_STATUS_FILE);
    }
    if (fs.existsSync(EMPLOYEE_STATUS_FILE)) {
      fs.unlinkSync(EMPLOYEE_STATUS_FILE);
    }
    if (fs.existsSync(NEW_REQUESTS_FILE)) {
      fs.unlinkSync(NEW_REQUESTS_FILE);
    }
  } catch (error) {
    console.warn('Failed to clear mock data:', error);
  }
}