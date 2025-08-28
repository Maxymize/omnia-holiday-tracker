"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { format, parseISO, addDays } from "date-fns"
import { it, enUS, es } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  AlertTriangle,
  Eye,
  EyeOff,
  Users,
  User,
  Globe
} from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useTranslation } from "@/lib/i18n/provider"
import { useSystemSettings } from "@/lib/hooks/useSystemSettings"
import { MultiStepHolidayRequest } from "@/components/forms/multi-step-holiday-request"
import { TimelineView } from "./timeline-view"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/utils/toast"
import { DateRangeFilter, buildDateFilterParams, calculateDateRange } from "@/lib/utils/date-filters"

interface HolidayEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
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

interface HolidayOverlap {
  hasOverlap: boolean
  overlappingEvents: HolidayEvent[]
  message: string
}

interface IntegratedCalendarProps {
  className?: string
  showTeamHolidays?: boolean
  onHolidayCreated?: () => void
}

export function IntegratedCalendar({
  className,
  showTeamHolidays = true,
  onHolidayCreated,
}: IntegratedCalendarProps) {
  const { user, isAuthenticated, isAdmin } = useAuth()
  const { t, locale } = useTranslation()
  const { canSeeAllHolidays, canSeeDepartmentHolidays, loading: settingsLoading } = useSystemSettings()
  
  // State management
  const [events, setEvents] = useState<HolidayEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<string>('dayGridMonth')
  const [viewMode, setViewMode] = useState<'own' | 'team' | 'all'>('all')
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('next3Months')
  
  // Dialog states
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<HolidayEvent | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<{start?: Date; end?: Date} | null>(null)
  const [dayEventsDialog, setDayEventsDialog] = useState<{date: Date; events: HolidayEvent[]} | null>(null)

  // Get date-fns locale
  const getDateFnsLocale = () => {
    switch (locale) {
      case 'it': return it
      case 'es': return es
      default: return enUS
    }
  }

  // Fetch holidays data
  const fetchHolidays = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('accessToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : window.location.origin

      // Build URL with date filter parameters
      const dateParams = buildDateFilterParams(dateFilter);
      const urlParams = new URLSearchParams(`viewMode=${viewMode}`);
      
      if (dateParams) {
        const dateParamsObj = new URLSearchParams(dateParams);
        dateParamsObj.forEach((value, key) => {
          urlParams.set(key, value);
        });
      }

      const response = await fetch(`${baseUrl}/.netlify/functions/get-holidays?${urlParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        const transformedEvents: HolidayEvent[] = data.data.holidays.map((holiday: any) => {
          const startDate = parseISO(holiday.startDate)
          // FullCalendar expects the end date to be the day AFTER for all-day events
          const endDate = addDays(parseISO(holiday.endDate), 1)
          
          const getEventIcon = (type: string) => {
            switch (type) {
              case 'vacation': return '🏖️'
              case 'sick': return '🏥'
              case 'personal': return '👤'
              default: return '📅'
            }
          }

          return {
            id: holiday.id,
            title: `${getEventIcon(holiday.type)} ${holiday.employeeName}`,
            start: startDate,
            end: endDate,
            allDay: true,
            resource: {
              userId: holiday.employeeId,
              userName: holiday.employeeName,
              type: holiday.type,
              status: holiday.status,
              workingDays: holiday.workingDays || 1,
              notes: holiday.notes,
              createdAt: holiday.createdAt || new Date().toISOString(),
              approvedBy: holiday.approvedBy
            }
          }
        })
        
        setEvents(transformedEvents)
        setError(null)
      } else {
        throw new Error(data.error || 'Failed to fetch holidays')
      }
    } catch (error) {
      console.error('Error fetching holidays:', error)
      setError(error instanceof Error ? error.message : 'Failed to load holidays')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user, viewMode, dateFilter])

  // Events are already filtered by the backend based on system settings and viewMode
  // No need for additional client-side filtering - trust the backend logic
  const filteredEvents = events

  // Effect to fetch holidays when dependencies change
  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

  // Effect to refresh data when switching to list view
  useEffect(() => {
    if (view === 'listMonth') {
      // Small delay to ensure the view has switched
      const timeoutId = setTimeout(() => {
        fetchHolidays()
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [view, fetchHolidays])

  // Effect to auto-correct viewMode when system settings don't allow it
  useEffect(() => {
    if (!settingsLoading && !isAdmin) {
      if (viewMode === 'all' && !canSeeAllHolidays()) {
        // User is trying to view all but system doesn't allow it
        if (canSeeDepartmentHolidays()) {
          setViewMode('team'); // Fall back to team view if allowed
        } else {
          setViewMode('own'); // Fall back to own holidays only
        }
      } else if (viewMode === 'team' && !canSeeDepartmentHolidays()) {
        // User is trying to view team but system doesn't allow it
        setViewMode('own'); // Fall back to own holidays only
      }
    }
  }, [settingsLoading, isAdmin, viewMode, canSeeAllHolidays, canSeeDepartmentHolidays])

  // Effect to add click handlers to "more" links after FullCalendar renders
  useEffect(() => {
    const handleMoreLinkClick = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      if (target && target.classList.contains('fc-more-link')) {
        // Find the parent day cell to get the date
        const dayCell = target.closest('.fc-daygrid-day');
        if (dayCell) {
          const dateAttr = dayCell.getAttribute('data-date');
          if (dateAttr) {
            const clickedDate = new Date(dateAttr + 'T12:00:00'); // Add time to avoid timezone issues
            
            const eventsForDate = filteredEvents.filter(event => {
              const eventStart = new Date(event.start.getTime());
              // For all-day events, FullCalendar sets end to the day AFTER, so we need to subtract 1 day
              // But for comparison, we need to check if the clicked date falls within the actual event range
              const eventEndActual = new Date(event.end.getTime() - 24 * 60 * 60 * 1000);
              
              // Create date-only versions for comparison (ignore time)
              const clickedDateOnly = new Date(clickedDate.getFullYear(), clickedDate.getMonth(), clickedDate.getDate());
              const eventStartOnly = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
              const eventEndOnly = new Date(eventEndActual.getFullYear(), eventEndActual.getMonth(), eventEndActual.getDate());
              
              return clickedDateOnly >= eventStartOnly && clickedDateOnly <= eventEndOnly;
            });
            
            if (eventsForDate.length > 0) {
              setDayEventsDialog({
                date: clickedDate,
                events: eventsForDate
              });
            }
          }
        }
      }
    };

    // Add event listeners to the calendar container
    const calendarContainer = document.querySelector('.fullcalendar-container');
    if (calendarContainer) {
      calendarContainer.addEventListener('click', handleMoreLinkClick, true);
      
      return () => {
        calendarContainer.removeEventListener('click', handleMoreLinkClick, true);
      };
    }
  }, [filteredEvents]) // Re-run when events change

  // Get status color for events
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10b981' // Green
      case 'pending': return '#f59e0b'  // Amber
      case 'rejected': return '#ef4444' // Red
      case 'cancelled': return '#6b7280' // Gray
      default: return '#3b82f6' // Blue
    }
  }

  // Generate label based on view and filter
  const getToolbarLabel = () => {
    // For list view with active date filter, show filter description
    if (view === 'list') {
      switch (dateFilter) {
        case 'yearToDate':
          return t('dashboard.calendar.dateFilters.yearToDate');
        case 'last12Months':
          return t('dashboard.calendar.dateFilters.last12Months');
        case 'last6Months':
          return t('dashboard.calendar.dateFilters.last6Months');
        case 'last3Months':
          return t('dashboard.calendar.dateFilters.last3Months');
        case 'next3Months':
          return t('dashboard.calendar.dateFilters.next3Months');
        case 'next6Months':
          return t('dashboard.calendar.dateFilters.next6Months');
        case 'next12Months':
          return t('dashboard.calendar.dateFilters.next12Months');
        default:
          return format(currentDate, "MMMM yyyy", { locale: getDateFnsLocale() });
      }
    }
    // Default: show current month/year
    return format(currentDate, "MMMM yyyy", { locale: getDateFnsLocale() });
  }

  // Custom toolbar component
  const CustomToolbar = ({ label, onNavigate, onView, view: currentView, onViewChange, dateFilter, setDateFilter }: any) => {
    const viewLabels: Record<string, string> = {
      'timeline': 'Timeline',
      'dayGridMonth': t('dashboard.calendar.monthView'),
      'timeGridWeek': t('dashboard.calendar.weekView'),
      'list': 'Lista'
    }

    return (
      <div className="flex flex-col gap-4 p-4 border-b bg-gradient-to-r from-blue-50 to-emerald-50">
        {/* Top Row - Navigation and Date */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Navigation Controls and Date */}
          <div className="flex items-center gap-3">
            {/* Hide navigation controls for list view with active filter */}
            {currentView !== 'list' && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate("prev")}
                  className="h-9 w-9 p-0 hover:bg-blue-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate("today")}
                  className="px-4 h-9"
                >
                  {t('dashboard.calendar.today')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate("next")}
                  className="h-9 w-9 p-0 hover:bg-blue-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Current Date/Period - More prominent */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 px-2">{label}</h2>
          </div>

          {/* New Request Button - More prominent on mobile */}
          <Button
            onClick={() => setShowNewRequestDialog(true)}
            size="default"
            className="sm:hidden bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('dashboard.calendar.newRequest')}
          </Button>
        </div>

        {/* Bottom Row - View Controls and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* View Toggle Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border bg-white/50 p-1">
              {['timeline', 'dayGridMonth', 'timeGridWeek', 'list'].map((viewType) => (
                <Button
                  key={viewType}
                  variant={currentView === viewType ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewChange(viewType)}
                  className={`px-3 h-8 ${
                    currentView === viewType 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {viewLabels[viewType] || viewType}
                </Button>
              ))}
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Date Range Filter - Only for List view */}
            {currentView === 'list' && (
              <div className="flex items-center gap-2">
                <Select 
                  value={dateFilter} 
                  onValueChange={(value) => setDateFilter(value as DateRangeFilter)}
                >
                  <SelectTrigger className="w-48 h-8 bg-white/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yearToDate">{t('dashboard.calendar.dateFilters.yearToDate')}</SelectItem>
                    <SelectItem value="last12Months">{t('dashboard.calendar.dateFilters.last12Months')}</SelectItem>
                    <SelectItem value="last6Months">{t('dashboard.calendar.dateFilters.last6Months')}</SelectItem>
                    <SelectItem value="last3Months">{t('dashboard.calendar.dateFilters.last3Months')}</SelectItem>
                    <SelectItem value="next3Months">{t('dashboard.calendar.dateFilters.next3Months')}</SelectItem>
                    <SelectItem value="next6Months">{t('dashboard.calendar.dateFilters.next6Months')}</SelectItem>
                    <SelectItem value="next12Months">{t('dashboard.calendar.dateFilters.next12Months')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Holiday Visibility Toggle */}
            {showTeamHolidays && !settingsLoading && (
              <div className="flex items-center rounded-lg border bg-white/50 p-1">
                {/* Le mie ferie - sempre visibile */}
                <Button
                  variant={viewMode === 'own' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('own')}
                  className={`px-3 h-8 ${
                    viewMode === 'own' 
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <User className="h-3 w-3 mr-1" />
                  {t('dashboard.calendar.myHolidays')}
                </Button>
                
                {/* Ferie del team - visibile solo se admin o se il sistema lo consente */}
                {(isAdmin || canSeeDepartmentHolidays()) && (
                  <Button
                    variant={viewMode === 'team' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('team')}
                    className={`px-3 h-8 ${
                      viewMode === 'team' 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {t('dashboard.calendar.teamHolidays')}
                  </Button>
                )}
                
                {/* Tutti - visibile solo se admin o se il sistema consente "all_see_all" */}
                {(isAdmin || canSeeAllHolidays()) && (
                  <Button
                    variant={viewMode === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('all')}
                    className={`px-3 h-8 ${
                      viewMode === 'all' 
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <Globe className="h-3 w-3 mr-1" />
                    {t('dashboard.calendar.allHolidays')}
                  </Button>
                )}
              </div>
            )}

            {/* New Request Button - Desktop */}
            <Button
              onClick={() => setShowNewRequestDialog(true)}
              size="default"
              className="hidden sm:flex bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.calendar.newRequest')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Handle event click
  const handleEventClick = (info: any) => {
    const event = filteredEvents.find(e => e.id === info.event.id)
    if (event) {
      setSelectedEvent(event)
    }
  }

  // Handle date selection
  const handleDateSelect = (selectInfo: any) => {
    setSelectedDateRange({
      start: selectInfo.start,
      end: selectInfo.end
    })
    setShowNewRequestDialog(true)
  }

  // Store FullCalendar API ref
  const calendarRef = React.useRef<any>(null)

  // Handle navigation
  const handleNavigate = (action: string) => {
    if (view === 'timeline') {
      // Handle timeline navigation
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()
      let newDate = new Date(currentDate)
      
      switch (action) {
        case 'prev':
          newDate.setMonth(currentMonth - 1)
          break
        case 'next':
          newDate.setMonth(currentMonth + 1)
          break
        case 'today':
          newDate = new Date()
          break
      }
      setCurrentDate(newDate)
      return
    }
    
    // Handle FullCalendar navigation using ref
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      switch (action) {
        case 'prev':
          calendarApi.prev()
          break
        case 'next':
          calendarApi.next()
          break
        case 'today':
          calendarApi.today()
          break
      }
      setCurrentDate(calendarApi.getDate())
    }
  }

  // Handle view change
  const handleViewChange = (newView: string) => {
    setView(newView)
    
    // If switching to timeline, no need to change FullCalendar view
    if (newView === 'timeline') {
      return
    }
    
    // For FullCalendar views, update the calendar using ref
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      calendarApi.changeView(newView)
    }
  }

  // Handle approve/reject actions
  const handleApproveReject = async (eventId: string, action: 'approve' | 'reject') => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        toast.error('Sessione scaduta. Effettua nuovamente il login.')
        return
      }

      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : window.location.origin

      // Use real database endpoint
      const response = await fetch(`${baseUrl}/.netlify/functions/approve-reject-holiday`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          holidayId: eventId,
          action: action
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Errore durante ${action === 'approve' ? 'l\'approvazione' : 'il rifiuto'}`)
      }

      if (data.success) {
        // Show success toast
        toast.success(
          action === 'approve' 
            ? '✅ Richiesta ferie approvata con successo'
            : '❌ Richiesta ferie rifiutata'
        )

        // Refresh holidays to show updated status
        await fetchHolidays()
      }
    } catch (error) {
      console.error(`Error ${action}ing holiday:`, error)
      toast.error(
        `Errore durante ${action === 'approve' ? 'l\'approvazione' : 'il rifiuto'}: ${error instanceof Error ? error.message : 'Si è verificato un errore. Riprova.'}`
      )
    }
  }

  // Get calendar messages for localization
  const getCalendarMessages = () => {
    return {
      today: t('dashboard.calendar.today'),
      month: t('dashboard.calendar.monthView'),
      week: t('dashboard.calendar.weekView'),
      day: t('dashboard.calendar.dayView'),
      list: 'Lista'
    }
  }

  // Loading state
  if (loading) {
    return (
      <Card className={cn(className, "w-full max-w-full overflow-hidden")}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={cn(className, "w-full max-w-full overflow-hidden")}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96 flex-col space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Errore nel caricamento del calendario
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchHolidays} variant="outline">
                Riprova
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={cn(className, "w-full max-w-full overflow-hidden")}>
        <CardContent className="p-0 w-full max-w-full box-border">
          <div className={cn(
            "relative w-full max-w-full box-border",
            view === 'timeline' ? "min-h-[580px] overflow-hidden" : "h-[580px] sm:h-[680px] overflow-hidden"
          )}>
            {/* Always render CustomToolbar for all views */}
            <CustomToolbar 
              label={getToolbarLabel()}
              onNavigate={handleNavigate}
              onView={handleViewChange}
              onViewChange={handleViewChange}
              view={view}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
            />
            
            {view === 'timeline' ? (
              <div className="w-full h-full overflow-hidden">
                <TimelineView 
                  events={filteredEvents}
                  currentDate={currentDate}
                  onEventClick={handleEventClick}
                  onApproveEvent={async (eventId) => {
                    await handleApproveReject(eventId, 'approve')
                  }}
                  onRejectEvent={async (eventId) => {
                    await handleApproveReject(eventId, 'reject')
                  }}
                />
              </div>
            ) : (
              <div className="fullcalendar-container" style={{ height: 'calc(100% - 180px)' }}>
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                    initialView={view === 'timeline' ? 'dayGridMonth' : view === 'list' ? 'listYear' : view}
                    height="100%"
                    events={(() => {
                      const mappedEvents = filteredEvents.map(event => ({
                        id: event.id,
                        title: event.title,
                        start: event.start,
                        end: event.end,
                        allDay: event.allDay,
                        backgroundColor: getStatusColor(event.resource.status),
                        borderColor: getStatusColor(event.resource.status),
                        textColor: 'white',
                        extendedProps: {
                          employeeName: event.resource.userName,
                          status: event.resource.status,
                          type: event.resource.type,
                          workingDays: event.resource.workingDays,
                          notes: event.resource.notes
                        }
                      }))
                      return mappedEvents
                    })()}
                    eventClick={handleEventClick}
                    select={handleDateSelect}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={5} // Show up to 5 events, then +N more
                    dayMaxEventRows={5} // Limit rows to prevent calendar becoming too tall
                    weekends={true}
                    headerToolbar={false} // We use custom toolbar
                    locale={locale}
                    firstDay={1} // Monday
                    eventDisplay="block"
                    displayEventTime={false}
                    eventClassNames="holiday-event"
                    moreLinkClick="none" // Disable all popover behavior
                    eventDidMount={(info) => {
                      // Add tooltip with full information
                      const { employeeName, status, type, workingDays, notes } = info.event.extendedProps;
                      const startDate = format(info.event.start!, 'dd/MM/yyyy', { locale: getDateFnsLocale() });
                      const endDate = format(info.event.end ? new Date(info.event.end.getTime() - 24 * 60 * 60 * 1000) : info.event.start!, 'dd/MM/yyyy', { locale: getDateFnsLocale() });
                      
                      const tooltipContent = `
                        ${employeeName}
                        ${t(`holidays.request.types.${type}`)}
                        ${startDate} - ${endDate}
                        ${workingDays} ${workingDays === 1 ? 'giorno' : 'giorni'}
                        Stato: ${t(`dashboard.calendar.legend.${status}`)}
                        ${notes ? `Note: ${notes}` : ''}
                      `.trim();
                      
                      info.el.title = tooltipContent;
                    }}
                    datesSet={(dateInfo) => {
                      // Update current date when calendar view changes
                      setCurrentDate(dateInfo.view.currentStart)
                    }}
                  />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* New Holiday Request Dialog */}
      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle>{t('holidays.request.title')}</DialogTitle>
            <DialogDescription>
              Compila il modulo per richiedere un nuovo periodo di ferie
            </DialogDescription>
          </DialogHeader>
          <MultiStepHolidayRequest
            defaultValues={{
              startDate: selectedDateRange?.start,
              endDate: selectedDateRange?.end,
            }}
            existingHolidays={filteredEvents.map(event => ({
              startDate: event.start.toISOString(),
              endDate: event.end.toISOString(),
              status: event.resource.status
            }))}
            onSubmit={async (data) => {
              // Handle form submission here if needed
              console.log('Holiday request submitted:', data)
              setShowNewRequestDialog(false)
              setSelectedDateRange(null)
              fetchHolidays()
              if (onHolidayCreated) {
                onHolidayCreated()
              }
            }}
            onCancel={() => {
              setShowNewRequestDialog(false)
              setSelectedDateRange(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dettagli Ferie</DialogTitle>
            <DialogDescription>
              Informazioni complete sulla richiesta di ferie selezionata
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {selectedEvent.resource.type === 'vacation' && '🏖️'}
                  {selectedEvent.resource.type === 'sick' && '🏥'}
                  {selectedEvent.resource.type === 'personal' && '👤'}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{selectedEvent.resource.userName}</h3>
                  <p className="text-sm text-gray-600">
                    {t(`holidays.request.types.${selectedEvent.resource.type}`)}
                  </p>
                </div>
                <StatusBadge status={selectedEvent.resource.status} />
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">Date:</span>
                  <p className="text-sm">
                    {format(selectedEvent.start, 'dd MMM yyyy', { locale: getDateFnsLocale() })} - {format(new Date(selectedEvent.end.getTime() - 24 * 60 * 60 * 1000), 'dd MMM yyyy', { locale: getDateFnsLocale() })}
                  </p>
                </div>
                
                {selectedEvent.resource.notes && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Note:</span>
                    <p className="text-sm">{selectedEvent.resource.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Chiudi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Day Events Dialog */}
      <Dialog open={!!dayEventsDialog} onOpenChange={() => setDayEventsDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Ferie del {dayEventsDialog && format(dayEventsDialog.date, 'dd MMMM yyyy', { locale: getDateFnsLocale() })}
            </DialogTitle>
            <DialogDescription>
              Elenco completo di tutti i dipendenti in ferie in questa data
            </DialogDescription>
          </DialogHeader>
          {dayEventsDialog && (
            <div className="space-y-3">
              {dayEventsDialog.events.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    setDayEventsDialog(null);
                    setSelectedEvent(event);
                  }}
                >
                  <div className="text-lg">
                    {event.resource.type === 'vacation' && '🏖️'}
                    {event.resource.type === 'sick' && '🏥'}
                    {event.resource.type === 'personal' && '👤'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{event.resource.userName}</h4>
                    <p className="text-xs text-gray-600">
                      {t(`holidays.request.types.${event.resource.type}`)}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge status={event.resource.status} />
                  </div>
                </div>
              ))}
              
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setDayEventsDialog(null)}>
                  Chiudi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* FullCalendar Custom CSS */}
      <style jsx global>{`
        .fullcalendar-container .fc {
          font-family: inherit;
        }
        
        .fullcalendar-container .fc-event {
          border-radius: 3px;
          border: none;
          font-size: 10px;
          font-weight: 600;
          padding: 1px 3px;
          margin: 1px 0;
          min-height: 16px;
          line-height: 1.2;
          cursor: pointer;
        }
        
        .fullcalendar-container .fc-event-title {
          font-weight: 600;
          color: white;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .fullcalendar-container .fc-daygrid-event {
          margin: 1px 0;
          min-height: 16px;
        }
        
        .fullcalendar-container .fc-daygrid-day-events {
          margin: 1px;
        }
        
        .fullcalendar-container .fc-day-today {
          background-color: #f0f9ff !important;
        }
        
        .fullcalendar-container .fc-more-link {
          font-size: 10px;
          color: #374151;
          font-weight: 500;
          padding: 1px 4px;
          border-radius: 2px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          margin: 1px 0;
        }
        
        .fullcalendar-container .fc-more-link:hover {
          background: #e5e7eb;
          text-decoration: none;
        }
        
        /* Hide all FullCalendar popovers - we use custom dialogs */
        .fullcalendar-container .fc-popover {
          display: none !important;
        }
        
        .fullcalendar-container .fc-popover-header {
          display: none !important;
        }
        
        .fullcalendar-container .fc-popover-body {
          display: none !important;
        }
        
        .holiday-event {
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        /* Improve day cell spacing */
        .fullcalendar-container .fc-daygrid-day-frame {
          min-height: 80px;
        }
        
        .fullcalendar-container .fc-daygrid-day-top {
          padding: 4px;
        }
        
        .fullcalendar-container .fc-daygrid-day-number {
          padding: 2px 4px;
          font-size: 13px;
          font-weight: 500;
        }
        
        @media (max-width: 640px) {
          .fullcalendar-container .fc-event {
            font-size: 9px;
            padding: 1px 2px;
            min-height: 14px;
          }
          
          .fullcalendar-container .fc-daygrid-day-frame {
            min-height: 70px;
          }
          
          .fullcalendar-container .fc-more-link {
            font-size: 9px;
          }
        }
      `}</style>
    </>
  )
}

// Calendar Legend Component
export function CalendarLegend() {
  const { t } = useTranslation()
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {t('dashboard.calendar.legend')}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        {/* Status Colors in one row */}
        <div className="flex items-center space-x-4 mb-2">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded bg-emerald-500"></div>
            <span className="text-xs">{t('dashboard.calendar.legendDetails.approved')}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded bg-amber-500"></div>
            <span className="text-xs">{t('dashboard.calendar.legendDetails.pending')}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded bg-red-500"></div>
            <span className="text-xs">{t('dashboard.calendar.legendDetails.rejected')}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded bg-gray-500"></div>
            <span className="text-xs">Cancelled</span>
          </div>
        </div>
        
        {/* Holiday Types in one row */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <span className="text-sm">🏖️</span>
            <span className="text-xs">{t('dashboard.calendar.legendDetails.vacation')}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-sm">🏥</span>
            <span className="text-xs">{t('dashboard.calendar.legendDetails.sick')}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-sm">👤</span>
            <span className="text-xs">{t('dashboard.calendar.legendDetails.personal')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}