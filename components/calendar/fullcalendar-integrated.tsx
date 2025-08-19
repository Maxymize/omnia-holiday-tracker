"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { format, parseISO, addDays, differenceInBusinessDays } from "date-fns"
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
  User
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

interface FullCalendarEvent {
  id: string
  title: string
  start: string | Date
  end: string | Date
  allDay: boolean
  backgroundColor?: string
  borderColor?: string
  extendedProps: {
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
  conflictingEvents: HolidayEvent[]
  overlappingDays: number
}

interface FullCalendarIntegratedProps {
  className?: string
  showAddButton?: boolean
  defaultView?: 'dayGridMonth' | 'timeGridWeek' | 'listWeek' | 'timeline'
  showTeamHolidays?: boolean
  onHolidayCreated?: () => void
}

export function FullCalendarIntegrated({
  className,
  showAddButton = true,
  defaultView = 'dayGridMonth',
  showTeamHolidays = true,
  onHolidayCreated,
}: FullCalendarIntegratedProps) {
  const { user, isAuthenticated, isAdmin } = useAuth()
  const { t, locale } = useTranslation()
  const calendarRef = useRef<FullCalendar>(null)
  
  // State management
  const [events, setEvents] = useState<FullCalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState(defaultView)
  const [viewMode, setViewMode] = useState<'own' | 'team' | 'all'>('all')
  
  // Dialog states
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false)
  const [showEventDetailsDialog, setShowEventDetailsDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<HolidayEvent | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date; end: Date } | null>(null)
  const [overlapWarning, setOverlapWarning] = useState<HolidayOverlap | null>(null)

  // Get locale for date-fns
  const getDateFnsLocale = () => {
    switch (locale) {
      case 'it': return it
      case 'es': return es
      default: return enUS
    }
  }

  // Get status colors for events
  const getStatusColors = (status: string) => {
    switch (status) {
      case 'approved': 
        return { backgroundColor: '#10b981', borderColor: '#059669' } // Green
      case 'pending': 
        return { backgroundColor: '#f59e0b', borderColor: '#d97706' } // Amber
      case 'rejected': 
        return { backgroundColor: '#ef4444', borderColor: '#dc2626' } // Red
      case 'cancelled': 
        return { backgroundColor: '#6b7280', borderColor: '#4b5563' } // Gray
      default: 
        return { backgroundColor: '#3b82f6', borderColor: '#2563eb' } // Blue
    }
  }

  // Transform holiday data to FullCalendar format
  const transformHolidaysToEvents = useCallback((holidays: any[]): FullCalendarEvent[] => {
    return holidays.map((holiday) => {
      const startDate = parseISO(holiday.startDate)
      const endDate = addDays(parseISO(holiday.endDate), 1) // FullCalendar uses exclusive end dates
      const colors = getStatusColors(holiday.status)
      
      // Create event icon based on type
      const getEventIcon = (type: string) => {
        switch (type) {
          case 'vacation': return '🏖️'
          case 'sick': return '🏥'
          case 'personal': return '👤'
          default: return '📅'
        }
      }

      const event: FullCalendarEvent = {
        id: holiday.id,
        title: `${getEventIcon(holiday.type)} ${holiday.employeeName}`,
        start: startDate,
        end: endDate,
        allDay: true,
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        extendedProps: {
          userId: holiday.employeeId,
          userName: holiday.employeeName,
          type: holiday.type,
          status: holiday.status,
          workingDays: holiday.workingDays,
          notes: holiday.notes,
          createdAt: holiday.createdAt,
          approvedBy: holiday.approvedBy
        }
      }
      
      console.log('✅ FullCalendar event created:', {
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        backgroundColor: event.backgroundColor,
        extendedProps: event.extendedProps
      })
      
      return event
    })
  }, [])

  // Fetch holidays from API
  const fetchHolidays = useCallback(async () => {
    if (!isAuthenticated || !user) return

    try {
      setLoading(true)
      const token = localStorage.getItem('accessToken')
      
      // Calculate date range for current view
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      
      const params = new URLSearchParams({
        startDate: startOfMonth,
        endDate: endOfMonth,
        viewMode: viewMode,
        limit: '100'
      })

      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : window.location.origin

      const response = await fetch(`${baseUrl}/.netlify/functions/get-holidays?${params}`, {
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
        const transformedEvents = transformHolidaysToEvents(data.data.holidays)
        console.log(`📅 FullCalendar loaded ${transformedEvents.length} events`)
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
  }, [isAuthenticated, user, viewMode, transformHolidaysToEvents])

  // Effect to fetch holidays when dependencies change
  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

  // Detect overlapping holidays for a date range
  const detectOverlaps = useCallback((startDate: Date, endDate: Date): HolidayOverlap | null => {
    if (!user) return null

    // Convert FullCalendar events back to HolidayEvent format for overlap detection
    const userHolidays: HolidayEvent[] = events
      .filter(event => 
        event.extendedProps.userId === user.id && 
        event.extendedProps.status !== 'rejected' &&
        event.extendedProps.status !== 'cancelled'
      )
      .map(event => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start),
        end: new Date(event.end),
        allDay: event.allDay,
        resource: event.extendedProps
      }))

    const conflictingEvents = userHolidays.filter(event => {
      const eventStart = event.start
      const eventEnd = addDays(event.end, -1) // Convert back to inclusive end date
      
      return (
        (startDate >= eventStart && startDate <= eventEnd) ||
        (endDate >= eventStart && endDate <= eventEnd) ||
        (startDate <= eventStart && endDate >= eventEnd)
      )
    })

    if (conflictingEvents.length > 0) {
      const overlappingDays = Math.max(
        ...conflictingEvents.map(event => {
          const overlapStart = new Date(Math.max(startDate.getTime(), event.start.getTime()))
          const overlapEnd = new Date(Math.min(endDate.getTime(), addDays(event.end, -1).getTime()))
          return differenceInBusinessDays(overlapEnd, overlapStart) + 1
        })
      )

      return {
        conflictingEvents,
        overlappingDays
      }
    }

    return null
  }, [events, user])

  // Handle date selection
  const handleDateSelect = useCallback((selectInfo: any) => {
    if (!showAddButton) return

    const startDate = new Date(selectInfo.start)
    const endDate = new Date(selectInfo.end)
    
    // Check for overlaps
    const overlap = detectOverlaps(startDate, endDate)
    if (overlap) {
      setOverlapWarning(overlap)
      return
    }

    setSelectedDateRange({ start: startDate, end: endDate })
    setShowNewRequestDialog(true)

    // Clear selection
    const calendarApi = selectInfo.view.calendar
    calendarApi.unselect()
  }, [showAddButton, detectOverlaps])

  // Handle event click
  const handleEventClick = useCallback((clickInfo: any) => {
    const event = clickInfo.event
    const holidayEvent: HolidayEvent = {
      id: event.id,
      title: event.title,
      start: new Date(event.start),
      end: new Date(event.end),
      allDay: event.allDay,
      resource: event.extendedProps
    }
    
    setSelectedEvent(holidayEvent)
    setShowEventDetailsDialog(true)
  }, [])

  // Custom event content renderer
  const renderEventContent = useCallback((eventInfo: any) => {
    const { event } = eventInfo
    
    return (
      <div className="fc-event-custom">
        <div className="fc-event-title">{event.title}</div>
        {event.extendedProps.workingDays && (
          <div className="fc-event-subtitle text-xs opacity-80">
            {event.extendedProps.workingDays} giorni
          </div>
        )}
      </div>
    )
  }, [])

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">{t('common.loading')}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-50 rounded-lg animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>{t('common.error')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchHolidays} variant="outline" size="sm">
            Riprova
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={cn(className, "w-full max-w-full overflow-hidden")}>
        <CardContent className="p-4">
          {/* Custom Toolbar */}
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-4 p-4 border-b bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg">
            {/* View Mode Selector */}
            {(isAdmin || showTeamHolidays) && (
              <Select value={viewMode} onValueChange={(value: 'own' | 'team' | 'all') => setViewMode(value)}>
                <SelectTrigger className="w-full sm:w-auto min-w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && (
                    <SelectItem value="all">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-3 w-3" />
                        <span>Tutte le ferie</span>
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="own">
                    <div className="flex items-center space-x-2">
                      <User className="h-3 w-3" />
                      <span>Le mie ferie</span>
                    </div>
                  </SelectItem>
                  {showTeamHolidays && (
                    <SelectItem value="team">
                      <div className="flex items-center space-x-2">
                        <Users className="h-3 w-3" />
                        <span>Le ferie del team</span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}

            {/* Calendar View Buttons */}
            <div className="flex rounded-lg border overflow-hidden">
              <Button
                variant={currentView === 'dayGridMonth' ? "default" : "ghost"}
                size="sm"
                className="rounded-none border-0 text-xs px-3 h-8 rounded-l-md"
                onClick={() => {
                  setCurrentView('dayGridMonth')
                  calendarRef.current?.getApi().changeView('dayGridMonth')
                }}
              >
                Mese
              </Button>
              <Button
                variant={currentView === 'timeGridWeek' ? "default" : "ghost"}
                size="sm"
                className="rounded-none border-0 text-xs px-3 h-8"
                onClick={() => {
                  setCurrentView('timeGridWeek')
                  calendarRef.current?.getApi().changeView('timeGridWeek')
                }}
              >
                Settimana
              </Button>
              <Button
                variant={currentView === 'listWeek' ? "default" : "ghost"}
                size="sm"
                className="rounded-none border-0 text-xs px-3 h-8 rounded-r-md"
                onClick={() => {
                  setCurrentView('listWeek')
                  calendarRef.current?.getApi().changeView('listWeek')
                }}
              >
                Lista
              </Button>
            </div>
            
            {/* Add Holiday Button */}
            {showAddButton && (
              <Button 
                onClick={() => setShowNewRequestDialog(true)} 
                size="sm"
                className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-3 w-3 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('dashboard.calendar.newRequest')}</span>
                <span className="sm:hidden">Nuovo</span>
              </Button>
            )}
          </div>

          {/* FullCalendar Component */}
          <div className="fullcalendar-container h-[600px]">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView={currentView}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: '' // We use custom toolbar above
              }}
              height="100%"
              locale={locale}
              events={events}
              selectable={showAddButton}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              dayHeaderFormat={{ weekday: 'short' }}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
              allDaySlot={true}
              allDayText="Tutto il giorno"
              nowIndicator={true}
              eventDisplay="block"
              displayEventTime={false} // Hide time for all-day events
            />
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
            existingHolidays={events.map(event => ({
              startDate: new Date(event.start).toISOString(),
              endDate: new Date(event.end).toISOString(),
              status: event.extendedProps.status
            }))}
            onSubmit={async (data) => {
              try {
                const baseUrl = process.env.NODE_ENV === 'development' 
                  ? 'http://localhost:3000' 
                  : window.location.origin

                const token = localStorage.getItem('accessToken')
                
                const response = await fetch(`${baseUrl}/.netlify/functions/holidays/create-request`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    startDate: data.startDate.toISOString().split('T')[0],
                    endDate: data.endDate.toISOString().split('T')[0],
                    type: data.type,
                    notes: data.notes || '',
                    workingDays: data.workingDays
                  }),
                })

                if (!response.ok) {
                  const errorData = await response.json()
                  throw new Error(errorData.error || 'Errore durante la creazione della richiesta')
                }

                setShowNewRequestDialog(false)
                setSelectedDateRange(null)
                fetchHolidays()
                onHolidayCreated?.()
              } catch (error) {
                console.error('Error creating holiday request:', error)
                throw error
              }
            }}
            onCancel={() => {
              setShowNewRequestDialog(false)
              setSelectedDateRange(null)
            }}
            isLoading={false}
            className="border-0 shadow-none"
          />
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={showEventDetailsDialog} onOpenChange={setShowEventDetailsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dettagli Ferie</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-700">Dipendente:</label>
                  <p>{selectedEvent.resource.userName}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Tipo:</label>
                  <p>{t(`holidays.request.types.${selectedEvent.resource.type}`)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Stato:</label>
                  <div className="mt-1">
                    <StatusBadge status={selectedEvent.resource.status} />
                  </div>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Giorni lavorativi:</label>
                  <p>{selectedEvent.resource.workingDays}</p>
                </div>
                <div className="col-span-2">
                  <label className="font-medium text-gray-700">Periodo:</label>
                  <p>
                    {format(selectedEvent.start, "dd MMMM yyyy", { locale: getDateFnsLocale() })} - {" "}
                    {format(addDays(selectedEvent.end, -1), "dd MMMM yyyy", { locale: getDateFnsLocale() })}
                  </p>
                </div>
                {selectedEvent.resource.notes && (
                  <div className="col-span-2">
                    <label className="font-medium text-gray-700">Note:</label>
                    <p className="text-gray-600 mt-1">{selectedEvent.resource.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Overlap Warning Dialog */}
      <Dialog open={!!overlapWarning} onOpenChange={() => setOverlapWarning(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Sovrapposizione Rilevata</span>
            </DialogTitle>
          </DialogHeader>
          {overlapWarning && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Le date selezionate si sovrappongono con {overlapWarning.conflictingEvents.length} richieste esistenti.
              </p>
              <div className="space-y-2">
                {overlapWarning.conflictingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{t(`holidays.request.types.${event.resource.type}`)}</p>
                      <p className="text-xs text-gray-600">
                        {format(event.start, "dd/MM/yyyy")} - {format(addDays(event.end, -1), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <StatusBadge status={event.resource.status} />
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setOverlapWarning(null)} className="flex-1">
                  Annulla
                </Button>
                <Button 
                  onClick={() => {
                    setOverlapWarning(null)
                    setShowNewRequestDialog(true)
                  }}
                  className="flex-1"
                >
                  Continua Comunque
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .fullcalendar-container .fc {
          font-family: inherit;
        }
        
        .fullcalendar-container .fc-theme-standard .fc-scrollgrid {
          border: 1px solid #e5e7eb;
        }
        
        .fullcalendar-container .fc-event {
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 11px;
          font-weight: 600;
          margin: 1px 0;
        }
        
        .fullcalendar-container .fc-event-custom {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .fullcalendar-container .fc-daygrid-day {
          min-height: 100px;
        }
        
        .fullcalendar-container .fc-col-header-cell {
          background-color: #f9fafb;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.025em;
        }
        
        .fullcalendar-container .fc-day-today {
          background-color: #fef3c7 !important;
        }
        
        .fullcalendar-container .fc-button {
          background-color: #3b82f6;
          border-color: #3b82f6;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
        }
        
        .fullcalendar-container .fc-button:hover {
          background-color: #2563eb;
          border-color: #2563eb;
        }
        
        .fullcalendar-container .fc-button:disabled {
          background-color: #9ca3af;
          border-color: #9ca3af;
        }
        
        .fullcalendar-container .fc-list-event-title {
          font-weight: 500;
        }
        
        .fullcalendar-container .fc-list-day-text {
          font-weight: 600;
          color: #374151;
        }
        
        @media (max-width: 640px) {
          .fullcalendar-container .fc-daygrid-day {
            min-height: 80px;
          }
          
          .fullcalendar-container .fc-event {
            font-size: 10px;
            padding: 1px 2px;
          }
          
          .fullcalendar-container .fc-button {
            font-size: 11px;
            padding: 2px 6px;
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
        <CardTitle className="text-sm">Legenda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Status Legend */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Stati</h4>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-50 border-2 border-orange-600 rounded"></div>
                <span className="text-xs">{t('dashboard.calendar.legend.pending')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-600 rounded"></div>
                <span className="text-xs">{t('dashboard.calendar.legend.approved')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-50 border-2 border-red-600 rounded"></div>
                <span className="text-xs">{t('dashboard.calendar.legend.rejected')}</span>
              </div>
            </div>
          </div>

          {/* Type Legend */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Tipi</h4>
            <div className="space-y-1">
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}