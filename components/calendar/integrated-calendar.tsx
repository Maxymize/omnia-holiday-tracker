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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { MultiStepHolidayRequest } from "@/components/forms/multi-step-holiday-request"
import { TimelineView } from "./timeline-view"
import { cn } from "@/lib/utils"

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
  
  // State management
  const [events, setEvents] = useState<HolidayEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<string>('dayGridMonth')
  const [viewMode, setViewMode] = useState<'own' | 'team' | 'all'>('all')
  
  // Dialog states
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<HolidayEvent | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<{start?: Date; end?: Date} | null>(null)

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
        ? 'http://localhost:8888' 
        : window.location.origin

      const response = await fetch(`${baseUrl}/.netlify/functions/get-holidays-mock`, {
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
  }, [isAuthenticated, user])

  // Filter events based on view mode
  const filteredEvents = React.useMemo(() => {
    if (!user) return events

    switch (viewMode) {
      case 'own':
        // Show only current user's events (for now, mock by showing events with user's name)
        return events.filter(event => 
          event.resource.userName.toLowerCase().includes(user.name?.toLowerCase() || '') ||
          event.resource.userId === user.id
        )
      case 'team':
        // Show team events (for now, mock by excluding current user)
        return events.filter(event => 
          !event.resource.userName.toLowerCase().includes(user.name?.toLowerCase() || '') &&
          event.resource.userId !== user.id
        )
      case 'all':
      default:
        // Show all events
        return events
    }
  }, [events, viewMode, user])

  // Effect to fetch holidays when dependencies change
  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

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

  // Custom toolbar component
  const CustomToolbar = ({ label, onNavigate, onView, view: currentView, onViewChange }: any) => {
    const viewLabels: Record<string, string> = {
      'timeline': 'Timeline',
      'dayGridMonth': t('dashboard.calendar.monthView'),
      'timeGridWeek': t('dashboard.calendar.weekView'),
      'listMonth': 'Lista'
    }

    return (
      <div className="flex flex-col gap-4 p-4 border-b bg-gradient-to-r from-blue-50 to-emerald-50">
        {/* Top Row - Navigation and Date */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Navigation Controls and Date */}
          <div className="flex items-center gap-3">
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
              {['timeline', 'dayGridMonth', 'timeGridWeek', 'listMonth'].map((viewType) => (
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
            {/* Holiday Visibility Toggle */}
            {showTeamHolidays && (
              <div className="flex items-center rounded-lg border bg-white/50 p-1">
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
          <div className="h-[580px] sm:h-[680px] relative w-full max-w-full overflow-hidden box-border">
            {/* Always render CustomToolbar for all views */}
            <CustomToolbar 
              label={format(currentDate, "MMMM yyyy", { locale: getDateFnsLocale() })}
              onNavigate={handleNavigate}
              onView={handleViewChange}
              onViewChange={handleViewChange}
              view={view}
            />
            
            {view === 'timeline' ? (
              <div className="w-full max-w-full overflow-hidden box-border" style={{ height: 'calc(100% - 180px)' }}>
                <TimelineView 
                  events={filteredEvents}
                  currentDate={currentDate}
                  onEventClick={handleEventClick}
                  onApproveEvent={async (eventId) => {
                    console.log('Approve event:', eventId)
                  }}
                  onRejectEvent={async (eventId) => {
                    console.log('Reject event:', eventId)
                  }}
                />
              </div>
            ) : (
              <div className="fullcalendar-container" style={{ height: 'calc(100% - 180px)' }}>
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                    initialView={view === 'timeline' ? 'dayGridMonth' : view}
                    height="100%"
                    events={filteredEvents.map(event => ({
                      id: event.id,
                      title: event.title,
                      start: event.start,
                      end: event.end,
                      allDay: event.allDay,
                      backgroundColor: getStatusColor(event.resource.status),
                      borderColor: getStatusColor(event.resource.status),
                      textColor: 'white'
                    }))}
                    eventClick={handleEventClick}
                    select={handleDateSelect}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    weekends={true}
                    headerToolbar={false} // We use custom toolbar
                    locale={locale}
                    firstDay={1} // Monday
                    eventDisplay="block"
                    displayEventTime={false}
                    eventClassNames="holiday-event"
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

      {/* FullCalendar Custom CSS */}
      <style jsx global>{`
        .fullcalendar-container .fc {
          font-family: inherit;
        }
        
        .fullcalendar-container .fc-event {
          border-radius: 4px;
          border: none;
          font-size: 11px;
          font-weight: 600;
          padding: 1px 4px;
        }
        
        .fullcalendar-container .fc-event-title {
          font-weight: 600;
          color: white;
        }
        
        .fullcalendar-container .fc-daygrid-event {
          margin: 1px 0;
        }
        
        .fullcalendar-container .fc-day-today {
          background-color: #f0f9ff !important;
        }
        
        .holiday-event {
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        @media (max-width: 640px) {
          .fullcalendar-container .fc-event {
            font-size: 10px;
            padding: 1px 2px;
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
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {t('dashboard.calendar.legend')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-emerald-500"></div>
          <span className="text-xs">{t('dashboard.calendar.legend.approved')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-amber-500"></div>
          <span className="text-xs">{t('dashboard.calendar.legend.pending')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-xs">{t('dashboard.calendar.legend.rejected')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gray-500"></div>
          <span className="text-xs">Cancelled</span>
        </div>
        
        <hr className="my-3" />
        
        <div className="flex items-center space-x-2">
          <span className="text-sm">🏖️</span>
          <span className="text-xs">{t('dashboard.calendar.legend.vacation')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm">🏥</span>
          <span className="text-xs">{t('dashboard.calendar.legend.sick')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm">👤</span>
          <span className="text-xs">{t('dashboard.calendar.legend.personal')}</span>
        </div>
      </CardContent>
    </Card>
  )
}