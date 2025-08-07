import { differenceInBusinessDays, addDays, isWithinInterval, startOfDay, endOfDay } from "date-fns"

export interface HolidayEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    userId: string
    userName: string
    type: "vacation" | "sick" | "personal"
    status: "pending" | "approved" | "rejected" | "cancelled"
    workingDays: number
    notes?: string
    createdAt: string
    approvedBy?: string
  }
}

export interface OverlapDetectionResult {
  hasOverlap: boolean
  conflictingEvents: HolidayEvent[]
  overlappingDays: number
  canProceed: boolean
  warningMessage?: string
}

/**
 * Detects overlapping holidays for a specific user and date range
 */
export function detectHolidayOverlaps(
  events: HolidayEvent[],
  userId: string,
  startDate: Date,
  endDate: Date,
  excludeEventId?: string
): OverlapDetectionResult {
  // Filter events for the specific user, excluding cancelled/rejected requests
  const userEvents = events.filter(event => 
    event.resource.userId === userId && 
    event.resource.status !== 'rejected' &&
    event.resource.status !== 'cancelled' &&
    (!excludeEventId || event.id !== excludeEventId)
  )

  // Find conflicting events
  const conflictingEvents = userEvents.filter(event => {
    const eventStart = startOfDay(event.start)
    const eventEnd = startOfDay(event.end)
    const requestStart = startOfDay(startDate)
    const requestEnd = startOfDay(endDate)
    
    // Check for any overlap
    return (
      // Request starts within existing event
      isWithinInterval(requestStart, { start: eventStart, end: eventEnd }) ||
      // Request ends within existing event  
      isWithinInterval(requestEnd, { start: eventStart, end: eventEnd }) ||
      // Request completely contains existing event
      (requestStart <= eventStart && requestEnd >= eventEnd) ||
      // Existing event completely contains request
      (eventStart <= requestStart && eventEnd >= requestEnd)
    )
  })

  const hasOverlap = conflictingEvents.length > 0

  let overlappingDays = 0
  let canProceed = true
  let warningMessage: string | undefined

  if (hasOverlap) {
    // Calculate total overlapping business days
    conflictingEvents.forEach(event => {
      const overlapStart = new Date(Math.max(startDate.getTime(), event.start.getTime()))
      const overlapEnd = new Date(Math.min(endDate.getTime(), event.end.getTime()))
      
      if (overlapStart <= overlapEnd) {
        const businessDays = differenceInBusinessDays(overlapEnd, overlapStart) + 1
        overlappingDays = Math.max(overlappingDays, businessDays)
      }
    })

    // Determine if user can proceed
    const hasApprovedOverlap = conflictingEvents.some(event => event.resource.status === 'approved')
    const hasPendingOverlap = conflictingEvents.some(event => event.resource.status === 'pending')

    if (hasApprovedOverlap) {
      canProceed = false
      warningMessage = "Non puoi richiedere ferie che si sovrappongono con richieste già approvate."
    } else if (hasPendingOverlap) {
      canProceed = true
      warningMessage = "Attenzione: le date si sovrappongono con richieste in attesa di approvazione."
    }
  }

  return {
    hasOverlap,
    conflictingEvents,
    overlappingDays,
    canProceed,
    warningMessage
  }
}

/**
 * Calculate working days between two dates (excluding weekends)
 */
export function calculateWorkingDays(startDate: Date, endDate: Date): number {
  return differenceInBusinessDays(endDate, startDate) + 1
}

/**
 * Get the color class for a holiday status
 */
export function getStatusColorClass(status: HolidayEvent['resource']['status']): string {
  switch (status) {
    case 'approved':
      return 'bg-green-100 border-green-600 text-green-800'
    case 'pending':
      return 'bg-orange-100 border-orange-600 text-orange-800'
    case 'rejected':
      return 'bg-red-100 border-red-600 text-red-800'
    case 'cancelled':
      return 'bg-gray-100 border-gray-600 text-gray-600'
    default:
      return 'bg-gray-100 border-gray-600 text-gray-600'
  }
}

/**
 * Get the emoji icon for a holiday type
 */
export function getTypeIcon(type: HolidayEvent['resource']['type']): string {
  switch (type) {
    case 'vacation':
      return '🏖️'
    case 'sick':
      return '🏥'
    case 'personal':
      return '👤'
    default:
      return '📅'
  }
}

/**
 * Get the status icon for a holiday status
 */
export function getStatusIcon(status: HolidayEvent['resource']['status']): string {
  switch (status) {
    case 'approved':
      return '✅'
    case 'pending':
      return '⏳'
    case 'rejected':
      return '❌'
    case 'cancelled':
      return '🚫'
    default:
      return ''
  }
}

/**
 * Check if a date falls within a holiday period
 */
export function isDateInHoliday(date: Date, event: HolidayEvent): boolean {
  const checkDate = startOfDay(date)
  const eventStart = startOfDay(event.start)
  const eventEnd = startOfDay(event.end)
  
  return isWithinInterval(checkDate, { start: eventStart, end: eventEnd })
}

/**
 * Get all holidays for a specific date
 */
export function getHolidaysForDate(date: Date, events: HolidayEvent[]): HolidayEvent[] {
  return events.filter(event => isDateInHoliday(date, event))
}

/**
 * Group events by status for analytics
 */
export function groupEventsByStatus(events: HolidayEvent[]): Record<string, HolidayEvent[]> {
  return events.reduce((groups, event) => {
    const status = event.resource.status
    if (!groups[status]) {
      groups[status] = []
    }
    groups[status].push(event)
    return groups
  }, {} as Record<string, HolidayEvent[]>)
}

/**
 * Calculate holiday statistics for a user
 */
export interface HolidayStats {
  totalRequests: number
  approvedDays: number
  pendingDays: number
  rejectedRequests: number
  upcomingHolidays: HolidayEvent[]
}

export function calculateUserHolidayStats(
  events: HolidayEvent[],
  userId: string,
  year?: number
): HolidayStats {
  const currentYear = year || new Date().getFullYear()
  const today = new Date()
  
  // Filter user events for the specified year
  const userEvents = events.filter(event => 
    event.resource.userId === userId &&
    event.start.getFullYear() === currentYear
  )

  const approvedEvents = userEvents.filter(e => e.resource.status === 'approved')
  const pendingEvents = userEvents.filter(e => e.resource.status === 'pending')
  const rejectedEvents = userEvents.filter(e => e.resource.status === 'rejected')
  
  const upcomingHolidays = approvedEvents.filter(event => event.start > today)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 5) // Next 5 holidays

  return {
    totalRequests: userEvents.length,
    approvedDays: approvedEvents.reduce((sum, event) => sum + event.resource.workingDays, 0),
    pendingDays: pendingEvents.reduce((sum, event) => sum + event.resource.workingDays, 0),
    rejectedRequests: rejectedEvents.length,
    upcomingHolidays
  }
}

/**
 * Validate date range for holiday requests
 */
export interface DateValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export function validateHolidayDateRange(
  startDate: Date,
  endDate: Date,
  options: {
    allowPastDates?: boolean
    maxFutureDays?: number
    maxConsecutiveDays?: number
  } = {}
): DateValidationResult {
  const {
    allowPastDates = false,
    maxFutureDays = 365,
    maxConsecutiveDays = 30
  } = options

  const errors: string[] = []
  const warnings: string[] = []
  const today = startOfDay(new Date())

  // Basic date validation
  if (startDate >= endDate) {
    errors.push("La data di inizio deve essere precedente alla data di fine")
  }

  // Past date validation
  if (!allowPastDates && startDate < today) {
    errors.push("Non puoi richiedere ferie per date passate")
  }

  // Future date validation
  const maxFutureDate = addDays(today, maxFutureDays)
  if (endDate > maxFutureDate) {
    errors.push(`Non puoi richiedere ferie oltre ${maxFutureDays} giorni nel futuro`)
  }

  // Consecutive days validation
  const totalDays = differenceInBusinessDays(endDate, startDate) + 1
  if (totalDays > maxConsecutiveDays) {
    warnings.push(`Stai richiedendo ${totalDays} giorni consecutivi. Il massimo consigliato è ${maxConsecutiveDays} giorni.`)
  }

  // Weekend warnings
  const dayOfWeekStart = startDate.getDay()
  const dayOfWeekEnd = endDate.getDay()
  
  if (dayOfWeekStart === 0 || dayOfWeekStart === 6) {
    warnings.push("La data di inizio cade nel weekend")
  }
  
  if (dayOfWeekEnd === 0 || dayOfWeekEnd === 6) {
    warnings.push("La data di fine cade nel weekend")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}