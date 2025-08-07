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
  defaultView = 'monthly'
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
        ? 'http://localhost:8888' 
        : window.location.origin

      const response = await fetch(`${baseUrl}/.netlify/functions/get-holidays-mock?${params}`, {
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

  // Mobile Timeline View Component
  const MobileTimelineView = () => (
    <div className="w-full">
      <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {eachDayOfInterval({ 
          start: startOfMonth(currentDate), 
          end: endOfMonth(currentDate) 
        }).map((date, index) => {
          const dayEvents = getEventsForDate(date)
          const isToday = new Date().toDateString() === date.toDateString()
          
          return (
            <div key={date.toISOString()} className="flex-shrink-0 w-20 snap-center">
              <div className={cn(
                "p-2 border-r text-center",
                isToday && "bg-blue-50 border-blue-200"
              )}>
                <div className="text-xs font-medium text-gray-600">
                  {format(date, 'EEE', { locale: getDateFnsLocale() })}
                </div>
                <div className={cn(
                  "text-lg font-semibold mb-2",
                  isToday && "text-blue-600"
                )}>
                  {format(date, 'd')}
                </div>
                
                <div className="space-y-1 min-h-[60px]">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "text-xs p-1 rounded text-center truncate cursor-pointer",
                        event.resource.status === 'approved' && "bg-green-200 text-green-800",
                        event.resource.status === 'pending' && "bg-orange-200 text-orange-800",
                        event.resource.status === 'rejected' && "bg-red-200 text-red-800"
                      )}
                      onClick={() => {
                        setSelectedDate(date)
                        setShowDayEventsDialog(true)
                      }}
                    >
                      {event.resource.type === 'vacation' && '🏖️'}
                      {event.resource.type === 'sick' && '🏥'}
                      {event.resource.type === 'personal' && '👤'}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-center text-gray-600 bg-gray-100 rounded py-1">
                      +{dayEvents.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

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
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-3">
      {[
        { key: 'monthly' as const, label: 'Mese', icon: CalendarIcon },
        { key: 'timeline' as const, label: 'Timeline', icon: CalendarIcon },
        { key: 'weekly' as const, label: 'Settimana', icon: CalendarIcon },
        { key: 'list' as const, label: 'Lista', icon: CalendarIcon }
      ].map(({ key, label, icon: Icon }) => (
        <Button
          key={key}
          variant={mobileView === key ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMobileView(key)}
          className="flex-1 h-8 text-xs"
        >
          <Icon className="h-3 w-3 mr-1" />
          {label}
        </Button>
      ))}
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
          <div className="grid grid-cols-7">
            {calendarDays.map((date, index) => {
              const dayEvents = getEventsForDate(date)
              const isCurrentMonth = isSameMonth(date, currentDate)
              const isSelectedDay = selectedDate && isSameDay(date, selectedDate)
              const isTodayDate = isToday(date)
              
              return (
                <motion.div
                  key={date.toISOString()}
                  className={cn(
                    "relative min-h-[60px] p-1 border-r border-b last:border-r-0 cursor-pointer hover:bg-gray-50 transition-colors",
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
                    "text-sm font-medium mb-1",
                    isTodayDate && "text-blue-600 font-bold",
                    !isCurrentMonth && "text-gray-400"
                  )}>
                    {format(date, 'd')}
                  </div>

                  {dayEvents.length > 0 && (
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event, eventIndex) => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-xs p-1 rounded text-center truncate",
                            event.resource.status === 'approved' && "bg-green-200 text-green-800",
                            event.resource.status === 'pending' && "bg-orange-200 text-orange-800",
                            event.resource.status === 'rejected' && "bg-red-200 text-red-800",
                            event.resource.status === 'cancelled' && "bg-gray-200 text-gray-600"
                          )}
                        >
                          {event.resource.type === 'vacation' && '🏖️'}
                          {event.resource.type === 'sick' && '🏥'}
                          {event.resource.type === 'personal' && '👤'}
                          {viewMode !== 'own' && (
                            <span className="ml-1">
                              {event.resource.userName.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-center text-gray-600 bg-gray-100 rounded py-1">
                          +{dayEvents.length - 2}
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
        <CardHeader className="pb-2">
          {/* Header with navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-lg font-semibold">
              {format(currentDate, 'MMMM yyyy', { locale: getDateFnsLocale() })}
            </h2>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Mobile View Switcher */}
          <MobileViewSwitcher />

          {/* View mode selector */}
          {(isAdmin || showTeamHolidays) && (
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <Button
                variant={viewMode === 'own' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('own')}
                className="flex-1 h-7 text-xs"
              >
                <User className="h-3 w-3 mr-1" />
                Mie
              </Button>
              {showTeamHolidays && (
                <Button
                  variant={viewMode === 'team' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('team')}
                  className="flex-1 h-7 text-xs"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Team
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant={viewMode === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('all')}
                  className="flex-1 h-7 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Tutte
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-2">
          {/* Weekday headers - only for monthly view */}
          {mobileView === 'monthly' && (
            <div className="grid grid-cols-7 border-b mb-2">
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
                <div key={day} className="p-2 text-center text-xs font-medium text-gray-600 border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
          )}

          {/* Render current mobile view */}
          {renderMobileView()}
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
                  ? 'http://localhost:8888' 
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