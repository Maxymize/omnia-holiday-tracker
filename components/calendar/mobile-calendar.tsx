"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { format, parseISO, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns"
import { it, enUS, es } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  AlertTriangle,
  User,
  Users,
  Eye
} from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useI18n } from "@/lib/i18n/provider"
import { MultiStepHolidayRequest } from "@/components/forms/multi-step-holiday-request"
import { useMobileGestures } from "@/lib/hooks/useMobileGestures"
import { cn } from "@/lib/utils"

interface HolidayEvent {
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

interface MobileCalendarProps {
  className?: string
  showAddButton?: boolean
  showTeamHolidays?: boolean
  onHolidayCreated?: () => void
  defaultView?: 'monthly' | 'timeline' | 'weekly' | 'list'
}

export function MobileCalendar({
  className,
  showAddButton = true,  
  showTeamHolidays = true,
  onHolidayCreated,
  defaultView = 'timeline'
}: MobileCalendarProps) {
  const { user, isAuthenticated, isAdmin } = useAuth()
  const { t, locale } = useI18n()
  
  // State management
  const [events, setEvents] = useState<HolidayEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'own' | 'team' | 'all'>(isAdmin ? 'all' : 'own')
  const [mobileView, setMobileView] = useState<'monthly' | 'timeline' | 'weekly' | 'list'>(defaultView)
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false)
  const [showDayEventsDialog, setShowDayEventsDialog] = useState(false)

  // Mobile gesture support for month navigation
  const calendarRef = useMobileGestures<HTMLDivElement>({
    onSwipeLeft: () => navigateMonth('next'),
    onSwipeRight: () => navigateMonth('prev'),
    threshold: 75, // Increased threshold for calendar navigation
  })

  // Get locale for date-fns
  const getDateFnsLocale = () => {
    switch (locale) {
      case 'it': return it
      case 'es': return es
      default: return enUS
    }
  }

  // Fetch holidays from API
  const fetchHolidays = useCallback(async () => {
    if (!isAuthenticated || !user) return

    try {
      setLoading(true)
      const token = localStorage.getItem('accessToken')
      
      // Get start and end of current month
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd')
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd')
      
      const params = new URLSearchParams({
        startDate,
        endDate,
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
        const transformedEvents: HolidayEvent[] = data.data.holidays.map((holiday: any) => ({
          id: holiday.id,
          title: `${holiday.employeeName} - ${t(`holidays.request.types.${holiday.type}`)}`,
          start: parseISO(holiday.startDate),
          end: parseISO(holiday.endDate),
          resource: {
            userId: holiday.employeeId,
            userName: holiday.employeeName,
            type: holiday.type,
            status: holiday.status,
            workingDays: holiday.workingDays,
            notes: holiday.notes,
            createdAt: holiday.createdAt,
            approvedBy: holiday.approvedBy
          }
        }))
        
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
  }, [isAuthenticated, user, currentDate, viewMode, t])

  // Get unique employees from events for timeline
  const getUniqueEmployees = useCallback(() => {
    const employeesMap = new Map()
    events.forEach(event => {
      if (!employeesMap.has(event.resource.userId)) {
        employeesMap.set(event.resource.userId, {
          id: event.resource.userId,
          name: event.resource.userName,
          initials: event.resource.userName.split(' ').map(n => n[0]).join('').substring(0, 2),
          events: []
        })
      }
    })
    
    // Add events to each employee
    events.forEach(event => {
      const employee = employeesMap.get(event.resource.userId)
      if (employee) {
        employee.events.push(event)
      }
    })
    
    return Array.from(employeesMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [events])

  // Get events for specific employee and date
  const getEmployeeEventsForDate = useCallback((employeeId: string, date: Date) => {
    return events.filter(event => {
      if (event.resource.userId !== employeeId) return false
      
      const eventStart = event.start
      const eventEnd = new Date(event.end.getTime() - 24 * 60 * 60 * 1000) // Subtract 1 day for all-day events
      
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const eventStartOnly = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate())
      const eventEndOnly = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate())
      
      return dateOnly >= eventStartOnly && dateOnly <= eventEndOnly
    })
  }, [events])

  // Effect to fetch holidays when dependencies change
  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date) => {
    return events.filter(event => {
      const eventStart = event.start
      const eventEnd = event.end
      return date >= eventStart && date <= eventEnd
    })
  }, [events])

  // Get calendar days for current month
  const getCalendarDays = useCallback(() => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  // Navigate to previous/next month
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    const dayEvents = getEventsForDate(date)
    if (dayEvents.length > 0) {
      setSelectedDate(date)
      setShowDayEventsDialog(true)
    } else if (showAddButton) {
      setSelectedDate(date)
      setShowNewRequestDialog(true)
    }
  }

  // Get status color for date
  const getDateStatus = (date: Date) => {
    const dayEvents = getEventsForDate(date)
    if (dayEvents.length === 0) return null

    const hasApproved = dayEvents.some(e => e.resource.status === 'approved')
    const hasPending = dayEvents.some(e => e.resource.status === 'pending')
    const hasRejected = dayEvents.some(e => e.resource.status === 'rejected')

    if (hasApproved) return 'approved'
    if (hasPending) return 'pending'
    if (hasRejected) return 'rejected'
    return null
  }

  // Get background color class for date
  const getDateBgClass = (date: Date) => {
    const status = getDateStatus(date)
    switch (status) {
      case 'approved': return 'bg-green-100 border-green-300'
      case 'pending': return 'bg-orange-100 border-orange-300'
      case 'rejected': return 'bg-red-100 border-red-300'
      default: return ''
    }
  }

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

  const calendarDays = getCalendarDays()

  // Mobile Timeline View Component - Now with employee rows like desktop
  const MobileTimelineView = () => {
    const monthDays = eachDayOfInterval({ 
      start: startOfMonth(currentDate), 
      end: endOfMonth(currentDate) 
    })
    const uniqueEmployees = getUniqueEmployees()
    
    return (
      <div className="w-full overflow-x-auto">
        <div className="min-w-full relative" style={{ width: `${160 + monthDays.length * 50}px` }}>
          {/* Header row with days */}
          <div className="flex sticky top-0 bg-white border-b-2 border-gray-300 z-20">
            {/* Employee names column header - STICKY */}
            <div className="sticky left-0 z-30 flex-shrink-0 w-40 p-2 bg-gray-50 border-r-2 border-gray-300 shadow-sm">
              <div className="text-xs font-semibold text-gray-700">Team Members</div>
              <div className="text-xs text-gray-500">{uniqueEmployees.length} dipendenti</div>
            </div>
            
            {/* Day headers */}
            {monthDays.map((date) => {
              const isToday = new Date().toDateString() === date.toDateString()
              return (
                <div key={date.toISOString()} className="flex-shrink-0 w-12 p-1 text-center border-r border-gray-300">
                  <div className="text-xs font-medium text-gray-600">
                    {format(date, 'EEE', { locale: getDateFnsLocale() })}
                  </div>
                  <div className={cn(
                    "text-sm font-semibold",
                    isToday && "text-blue-600"
                  )}>
                    {format(date, 'd')}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Employee rows */}
          <div className="divide-y divide-gray-200">
            {uniqueEmployees.map((employee) => (
              <div key={employee.id} className="flex hover:bg-gray-50">
                {/* Employee name cell - STICKY */}
                <div className="sticky left-0 z-10 flex-shrink-0 w-40 p-3 bg-gray-50 border-r-2 border-gray-300 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-700">
                        {employee.initials}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {employee.name}
                      </div>
                      <div className="text-xs text-gray-500">Department</div>
                    </div>
                  </div>
                </div>
                
                {/* Day cells for this employee */}
                {monthDays.map((date) => {
                  const employeeEvents = getEmployeeEventsForDate(employee.id, date)
                  const hasEvents = employeeEvents.length > 0
                  const primaryEvent = employeeEvents[0]
                  
                  return (
                    <div 
                      key={date.toISOString()} 
                      className="flex-shrink-0 w-12 min-h-[60px] border-r border-gray-300 flex items-center justify-center cursor-pointer hover:bg-blue-50 relative"
                      onClick={() => {
                        if (hasEvents) {
                          setSelectedDate(date)
                          setShowDayEventsDialog(true)
                        }
                      }}
                    >
                      {hasEvents && primaryEvent && (
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                          primaryEvent.resource.status === 'approved' && "bg-green-200 text-green-800",
                          primaryEvent.resource.status === 'pending' && "bg-orange-200 text-orange-800",
                          primaryEvent.resource.status === 'rejected' && "bg-red-200 text-red-800",
                          primaryEvent.resource.status === 'cancelled' && "bg-gray-200 text-gray-600"
                        )}>
                          {primaryEvent.resource.type === 'vacation' && '🏖️'}
                          {primaryEvent.resource.type === 'sick' && '🏥'}
                          {primaryEvent.resource.type === 'personal' && '👤'}
                        </div>
                      )}
                      {employeeEvents.length > 1 && (
                        <div className="absolute -top-1 -right-1 bg-gray-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          {employeeEvents.length}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          
          {/* Empty state */}
          {uniqueEmployees.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nessun dipendente trovato
            </div>
          )}
        </div>
      </div>
    )
  }

  // Mobile Weekly View Component
  const MobileWeeklyView = () => {
    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i))
    
    return (
      <div className="space-y-2">
        {weekDays.map((date) => {
          const dayEvents = getEventsForDate(date)
          const isToday = new Date().toDateString() === date.toDateString()
          
          return (
            <div
              key={date.toISOString()}
              className={cn(
                "p-3 border rounded-lg",
                isToday && "bg-blue-50 border-blue-200"
              )}
              onClick={() => {
                if (dayEvents.length > 0) {
                  setSelectedDate(date)
                  setShowDayEventsDialog(true)
                }
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium">
                    {format(date, 'EEEE', { locale: getDateFnsLocale() })}
                  </div>
                  <div className="text-sm text-gray-600">
                    {format(date, 'dd MMMM', { locale: getDateFnsLocale() })}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {dayEvents.length} eventi
                </div>
              </div>
              
              {dayEvents.length > 0 && (
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "text-xs p-2 rounded flex items-center space-x-2",
                        event.resource.status === 'approved' && "bg-green-100 text-green-800",
                        event.resource.status === 'pending' && "bg-orange-100 text-orange-800",
                        event.resource.status === 'rejected' && "bg-red-100 text-red-800"
                      )}
                    >
                      <span>
                        {event.resource.type === 'vacation' && '🏖️'}
                        {event.resource.type === 'sick' && '🏥'}
                        {event.resource.type === 'personal' && '👤'}
                      </span>
                      <span className="flex-1 truncate">{event.resource.userName}</span>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-center text-gray-600">
                      +{dayEvents.length - 2} altri
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Mobile List View Component
  const MobileListView = () => (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {events.length > 0 ? events.map((event) => (
          <div key={event.id} className="p-3 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{event.resource.userName}</h4>
              <StatusBadge status={event.resource.status} />
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Tipo:</strong> {t(`holidays.request.types.${event.resource.type}`)}</p>
              <p><strong>Periodo:</strong> {format(event.start, 'dd/MM/yyyy')} - {format(event.end, 'dd/MM/yyyy')}</p>
              <p><strong>Giorni:</strong> {event.resource.workingDays}</p>
              {event.resource.notes && (
                <p><strong>Note:</strong> {event.resource.notes}</p>
              )}
            </div>
          </div>
        )) : (
          <div className="text-center py-8 text-gray-500">
            Nessuna ferie trovata
          </div>
        )}
      </div>
    </ScrollArea>
  )

  // Mobile View Switcher Component
  const MobileViewSwitcher = () => (
    <div className="w-full overflow-hidden mb-3">
      <div className="grid grid-cols-4 gap-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'timeline' as const, label: 'Timeline', icon: CalendarIcon },
          { key: 'monthly' as const, label: 'Mese', icon: CalendarIcon },
          { key: 'weekly' as const, label: 'Sett.', icon: CalendarIcon },
          { key: 'list' as const, label: 'Lista', icon: CalendarIcon }
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={mobileView === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMobileView(key)}
            className="h-8 text-xs px-1 min-w-0 truncate flex-shrink-0"
          >
            <Icon className="h-3 w-3 mr-0.5 flex-shrink-0" />
            <span className="truncate">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  )

  // Render current mobile view
  const renderMobileView = () => {
    switch (mobileView) {
      case 'timeline':
        return <MobileTimelineView />
      case 'weekly':
        return <MobileWeeklyView />
      case 'list':
        return <MobileListView />
      case 'monthly':
      default:
        return (
          <div className="grid grid-cols-7 gap-0 w-full">
            {calendarDays.map((date, index) => {
              const dayEvents = getEventsForDate(date)
              const isCurrentMonth = isSameMonth(date, currentDate)
              const isSelectedDay = selectedDate && isSameDay(date, selectedDate)
              const isTodayDate = isToday(date)
              
              return (
                <motion.div
                  key={date.toISOString()}
                  className={cn(
                    "relative min-h-[70px] p-1 border-r border-b last:border-r-0 cursor-pointer hover:bg-gray-50 transition-colors",
                    !isCurrentMonth && "bg-gray-50 text-gray-400",
                    isTodayDate && "bg-blue-50 ring-1 ring-blue-200",
                    isSelectedDay && "bg-blue-100 ring-2 ring-blue-400",
                    getDateBgClass(date)
                  )}
                  onClick={() => handleDateSelect(date)}
                  whileHover={{ scale: 0.98 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={cn(
                    "text-xs sm:text-sm font-medium mb-1",
                    isTodayDate && "text-blue-600 font-bold",
                    !isCurrentMonth && "text-gray-400"
                  )}>
                    {format(date, 'd')}
                  </div>

                  {dayEvents.length > 0 && (
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event, eventIndex) => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-xs p-0.5 rounded text-center truncate leading-tight",
                            event.resource.status === 'approved' && "bg-green-200 text-green-800",
                            event.resource.status === 'pending' && "bg-orange-200 text-orange-800",
                            event.resource.status === 'rejected' && "bg-red-200 text-red-800",
                            event.resource.status === 'cancelled' && "bg-gray-200 text-gray-600"
                          )}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-xs">
                              {event.resource.type === 'vacation' && '🏖️'}
                              {event.resource.type === 'sick' && '🏥'}
                              {event.resource.type === 'personal' && '👤'}
                            </span>
                            {viewMode !== 'own' && (
                              <span className="text-xs truncate">
                                {event.resource.userName.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div 
                          className="text-xs text-center text-gray-600 bg-gray-100 rounded py-0.5 cursor-pointer hover:bg-gray-200"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDate(date)
                            setShowDayEventsDialog(true)
                          }}
                        >
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )
    }
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-2 px-3">
          {/* Header with navigation - Fixed mobile layout */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0 flex-shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-sm sm:text-base font-semibold text-center flex-1 px-2 min-w-0">
              <span className="block truncate">
                {format(currentDate, 'MMMM yyyy', { locale: getDateFnsLocale() })}
              </span>
            </h2>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0 flex-shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Mobile View Switcher */}
          <MobileViewSwitcher />

          {/* Filter selector - Fixed mobile layout */}
          {(isAdmin || showTeamHolidays) && (
            <div className="w-full overflow-hidden">
              <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-lg">
                <Button
                  variant={viewMode === 'own' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('own')}
                  className="h-7 text-xs px-1 min-w-0 truncate flex-shrink-0"
                >
                  <User className="h-3 w-3 mr-0.5 flex-shrink-0" />
                  <span className="truncate">Mie</span>
                </Button>
                {showTeamHolidays && (
                  <Button
                    variant={viewMode === 'team' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('team')}
                    className="h-7 text-xs px-1 min-w-0 truncate flex-shrink-0"
                  >
                    <Users className="h-3 w-3 mr-0.5 flex-shrink-0" />
                    <span className="truncate">Team</span>
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant={viewMode === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('all')}
                    className="h-7 text-xs px-1 min-w-0 truncate flex-shrink-0"
                  >
                    <Eye className="h-3 w-3 mr-0.5 flex-shrink-0" />
                    <span className="truncate">Tutte</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-3">
          {/* Weekday headers - only for monthly view */}
          {mobileView === 'monthly' && (
            <div className="grid grid-cols-7 border-b mb-2">
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
                <div key={day} className="p-1.5 text-center text-xs font-medium text-gray-600 border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
          )}

          {/* Mobile view container with proper overflow handling and gesture support */}
          <div 
            ref={calendarRef}
            className="w-full overflow-hidden touch-pan-y select-none"
            data-calendar-container
          >
            {renderMobileView()}
          </div>
        </CardContent>

        {/* Add button */}
        {showAddButton && (
          <div className="p-4 border-t">
            <Button 
              onClick={() => setShowNewRequestDialog(true)}
              className="w-full h-10"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.calendar.newRequest')}
            </Button>
          </div>
        )}
      </Card>

      {/* New Holiday Request Dialog */}
      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent className="max-w-full mx-2 max-h-[95vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle>{t('holidays.request.title')}</DialogTitle>
          </DialogHeader>
          <MultiStepHolidayRequest
            defaultValues={{
              startDate: selectedDate || undefined,
              endDate: selectedDate || undefined,
            }}
            existingHolidays={events.map(event => ({
              startDate: event.start.toISOString(),
              endDate: event.end.toISOString(),
              status: event.resource.status
            }))}
            onSubmit={async (data) => {
              try {
                // Call the backend API to create the holiday request
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

                // Success - close dialog and refresh data
                setShowNewRequestDialog(false)
                setSelectedDate(null)
                fetchHolidays()
                onHolidayCreated?.()
              } catch (error) {
                console.error('Error creating holiday request:', error)
                throw error // Let the form handle the error display
              }
            }}
            onCancel={() => {
              setShowNewRequestDialog(false)
              setSelectedDate(null)
            }}
            isLoading={false}
            className="border-0 shadow-none"
          />
        </DialogContent>
      </Dialog>

      {/* Day Events Dialog */}
      <Dialog open={showDayEventsDialog} onOpenChange={setShowDayEventsDialog}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, 'EEEE dd MMMM yyyy', { locale: getDateFnsLocale() })}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {selectedDate && getEventsForDate(selectedDate).map((event) => (
                <div key={event.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{event.resource.userName}</h4>
                    <StatusBadge status={event.resource.status} />
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><strong>Tipo:</strong> {t(`holidays.request.types.${event.resource.type}`)}</p>
                    <p><strong>Periodo:</strong> {format(event.start, 'dd/MM/yyyy')} - {format(event.end, 'dd/MM/yyyy')}</p>
                    <p><strong>Giorni:</strong> {event.resource.workingDays}</p>
                    {event.resource.notes && (
                      <p><strong>Note:</strong> {event.resource.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          {showAddButton && (
            <div className="pt-3 border-t">
              <Button 
                onClick={() => {
                  setShowDayEventsDialog(false)
                  setShowNewRequestDialog(true)
                }}
                variant="outline"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Richiesta
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}