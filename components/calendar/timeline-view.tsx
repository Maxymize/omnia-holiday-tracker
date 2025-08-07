"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, isWeekend, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns"
import { it, enUS, es } from "date-fns/locale"
import { motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Check, X, User, ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "@/lib/i18n/provider"
import { useAuth } from "@/lib/hooks/useAuth"
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

interface Employee {
  id: string
  name: string
  email: string
  department?: string
  avatar?: string
}

interface TimelineViewProps {
  events: HolidayEvent[]
  currentDate: Date
  onEventClick?: (event: HolidayEvent) => void
  onApproveEvent?: (eventId: string) => Promise<void>
  onRejectEvent?: (eventId: string) => Promise<void>
}

export function TimelineView({ 
  events, 
  currentDate, 
  onEventClick,
  onApproveEvent,
  onRejectEvent 
}: TimelineViewProps) {
  const { t, locale } = useTranslation()
  const { isAdmin } = useAuth()
  const [selectedEvent, setSelectedEvent] = useState<HolidayEvent | null>(null)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(currentDate, { weekStartsOn: 1 }) // Start on Monday
  )

  // Get locale for date-fns
  const getDateFnsLocale = () => {
    switch (locale) {
      case 'it': return it
      case 'es': return es
      default: return enUS
    }
  }

  // Get all days in current month (back to month view with horizontal scroll)
  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  })

  // Get unique employees from events
  const employees: Employee[] = React.useMemo(() => {
    const uniqueEmployees = new Map<string, Employee>()
    
    events.forEach(event => {
      if (!uniqueEmployees.has(event.resource.userId)) {
        uniqueEmployees.set(event.resource.userId, {
          id: event.resource.userId,
          name: event.resource.userName,
          email: `${event.resource.userName.toLowerCase().replace(' ', '.')}@ominiaservice.net`,
          department: "Department" // Would come from API in real app
        })
      }
    })
    
    return Array.from(uniqueEmployees.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [events])

  // Get events for a specific employee and date
  const getEventsForEmployeeAndDate = useCallback((employeeId: string, date: Date) => {
    return events.filter(event => 
      event.resource.userId === employeeId &&
      date >= event.start && 
      date <= event.end
    )
  }, [events])

  // Get all events for an employee in the current month
  const getEventsForEmployee = useCallback((employeeId: string) => {
    return events.filter(event => event.resource.userId === employeeId)
  }, [events])

  // Handle event click
  const handleEventClick = (event: HolidayEvent) => {
    setSelectedEvent(event)
    setShowEventDialog(true)
    onEventClick?.(event)
  }

  // Get employee initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500'
      case 'pending': return 'bg-orange-500'  
      case 'rejected': return 'bg-red-500'
      case 'cancelled': return 'bg-gray-500'
      default: return 'bg-blue-500'
    }
  }

  // Week navigation handlers for smooth scrolling
  const scrollToWeek = (weekStart: Date) => {
    if (typeof window !== 'undefined') {
      const scrollContainer = document.querySelector('.timeline-scroll-container')
      if (scrollContainer) {
        const dayWidth = (typeof window !== 'undefined' && window.innerWidth <= 768) ? 100 : 120 // Responsive cell width
        const daysFromStart = Math.floor((weekStart.getTime() - startOfMonth(currentDate).getTime()) / (1000 * 60 * 60 * 24))
        scrollContainer.scrollLeft = daysFromStart * dayWidth
      }
    }
  }

  const goToPreviousWeek = () => {
    const newWeekStart = subWeeks(currentWeekStart, 1)
    setCurrentWeekStart(newWeekStart)
    scrollToWeek(newWeekStart)
  }

  const goToNextWeek = () => {
    const newWeekStart = addWeeks(currentWeekStart, 1)  
    setCurrentWeekStart(newWeekStart)
    scrollToWeek(newWeekStart)
  }

  const goToCurrentWeek = () => {
    const newWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    setCurrentWeekStart(newWeekStart)
    scrollToWeek(newWeekStart)
  }

  // Add custom CSS for proper timeline containment and scrolling
  React.useEffect(() => {
    const styleId = 'timeline-scroll-styles'
    const existingStyle = document.getElementById(styleId)
    if (existingStyle) {
      existingStyle.remove()
    }

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      /* CRITICAL: Prevent horizontal page expansion */
      .timeline-main-container {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        contain: layout style size !important;
      }
      
      /* CRITICAL: Container that allows horizontal scroll without expanding page */
      .timeline-scroll-container {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        overflow-x: auto !important;
        overflow-y: auto !important;
        contain: layout style size !important;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 #f1f5f9;
        /* Force scrolling behavior */
        scroll-behavior: smooth;
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      
      /* Content wrapper with fixed width for all month days */
      .timeline-content-wrapper {
        width: ${monthDays.length * 120}px;
        min-width: ${monthDays.length * 120}px;
        max-width: ${monthDays.length * 120}px;
        box-sizing: border-box;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
      }
      
      /* Employee sidebar must stay fixed */
      .timeline-employee-sidebar {
        width: 256px !important;
        min-width: 256px !important;
        max-width: 256px !important;
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
      }
      
      /* Scrollbar styling */
      .timeline-scroll-container::-webkit-scrollbar {
        height: 12px;
      }
      
      .timeline-scroll-container::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 6px;
      }
      
      .timeline-scroll-container::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 6px;
        border: 2px solid #f1f5f9;
      }
      
      .timeline-scroll-container::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
      
      /* Day cells must maintain consistent width */
      .timeline-day-cell {
        width: 120px !important;
        min-width: 120px !important;
        max-width: 120px !important;
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
      }
      
      /* Header cells same width as day cells */
      .timeline-header-cell {
        width: 120px !important;
        min-width: 120px !important;
        max-width: 120px !important;
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
      }
      
      /* Responsive breakpoints - maintain containment */
      @media (max-width: 1200px) {
        .timeline-main-container {
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }
        .timeline-scroll-container {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: auto !important;
        }
        .timeline-employee-sidebar {
          width: 200px !important;
          min-width: 200px !important;
          max-width: 200px !important;
        }
      }
      
      @media (max-width: 768px) {
        .timeline-employee-sidebar {
          width: 180px !important;
          min-width: 180px !important;
          max-width: 180px !important;
        }
        .timeline-day-cell,
        .timeline-header-cell {
          width: 100px !important;
          min-width: 100px !important;
          max-width: 100px !important;
        }
        .timeline-content-wrapper {
          width: ${monthDays.length * 100}px;
          min-width: ${monthDays.length * 100}px;
          max-width: ${monthDays.length * 100}px;
          display: flex;
          flex-direction: column;
        }
      }
    `
    
    document.head.appendChild(style)
    
    return () => {
      const styleToRemove = document.getElementById(styleId)
      if (styleToRemove) {
        styleToRemove.remove()
      }
    }
  }, [monthDays.length])

  // Add resize listener to maintain layout stability
  React.useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        // Force re-render of layout constraints
        const container = document.querySelector('.timeline-main-container')
        const scrollContainer = document.querySelector('.timeline-scroll-container')
        
        if (container instanceof HTMLElement) {
          container.style.width = '100%'
          container.style.maxWidth = '100%'
          container.style.overflow = 'hidden'
        }
        
        if (scrollContainer instanceof HTMLElement) {
          scrollContainer.style.width = '100%'
          scrollContainer.style.maxWidth = '100%'
          scrollContainer.style.overflowX = 'auto'
          scrollContainer.style.overflowY = 'auto'
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
      // Also call on mount to ensure correct initial state
      handleResize()
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  return (
    <>
      {/* Week Navigation Header - Optional controls for smooth scrolling */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousWeek}
            className="h-8 w-8 p-0"
            title="Settimana precedente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToCurrentWeek}
            className="px-3 h-8 text-xs"
          >
            Questa Settimana
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextWeek}
            className="h-8 w-8 p-0"
            title="Settimana successiva"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold text-gray-800">
          {format(startOfMonth(currentDate), "MMMM yyyy", { locale: getDateFnsLocale() })}
        </h2>
        <div className="text-sm text-gray-500">
          Scorri orizzontalmente per vedere tutto il mese
        </div>
      </div>

      <div className="flex h-full timeline-main-container">
        {/* Employee Sidebar - Fixed width, no horizontal expansion */}
        <div className="timeline-employee-sidebar border-r bg-gray-50 flex flex-col">
          <div className="p-4 border-b bg-white flex-shrink-0">
            <h3 className="font-semibold text-gray-900 text-sm">Team Members</h3>
            <p className="text-xs text-gray-600">{employees.length} dipendenti</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Header spacer to align with calendar header */}
            <div className="bg-white border-b" style={{ height: '60px', minHeight: '60px', maxHeight: '60px' }}></div>
            {/* Employee list aligned with calendar rows */}
            <div>
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center space-x-2 px-4 py-2 hover:bg-white transition-colors border-b border-gray-100"
                  style={{ height: '60px', minHeight: '60px', maxHeight: '60px', boxSizing: 'border-box' }}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {getInitials(employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {employee.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {employee.department}
                    </p>
                  </div>
                  {/* Holiday count badge */}
                  {getEventsForEmployee(employee.id).length > 0 && (
                    <Badge variant="secondary" className="text-xs h-4 px-1">
                      {getEventsForEmployee(employee.id).length}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Grid - Horizontally scrollable content area */}
        <div className="flex-1 timeline-scroll-container">
          <div className="timeline-content-wrapper flex-1">
            {/* Header with dates - Sticky header that scrolls horizontally */}
            <div className="sticky top-0 bg-white border-b z-10 flex-shrink-0">
              <div className="flex">
                {monthDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "timeline-header-cell p-2 text-center border-r text-xs flex flex-col justify-center",
                      isWeekend(day) && "bg-gray-50",
                      "border-gray-200"
                    )}
                    style={{ height: '60px', minHeight: '60px', maxHeight: '60px' }}
                  >
                    <div className="font-medium text-gray-900">
                      {format(day, 'EEE', { locale: getDateFnsLocale() })}
                    </div>
                    <div className="text-gray-600">
                      {format(day, 'd')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Employee Rows - Each row represents one employee's timeline */}
            <div className="flex-1">
              {employees.map((employee) => (
                <div key={employee.id} className="flex border-b border-gray-100 hover:bg-gray-50" style={{ height: '60px', minHeight: '60px', maxHeight: '60px' }}>
                  {monthDays.map((day, dayIndex) => {
                    const dayEvents = getEventsForEmployeeAndDate(employee.id, day)
                    
                    return (
                      <div
                        key={`${employee.id}-${day.toISOString()}`}
                        className={cn(
                          "timeline-day-cell p-1 border-r border-gray-100 relative flex items-center",
                          isWeekend(day) && "bg-gray-25"
                        )}
                        style={{ height: '60px', minHeight: '60px', maxHeight: '60px' }}
                      >
                        {/* Holiday Events */}
                        {dayEvents.map((event) => {
                          // Calculate if this is the start of the event
                          const isEventStart = isSameDay(event.start, day)
                          
                          // Calculate span width for multi-day events
                          let spanWidth = 1
                          const cellWidth = (typeof window !== 'undefined' && window.innerWidth <= 768) ? 100 : 120
                          
                          if (isEventStart) {
                            const remainingDays = monthDays.slice(dayIndex)
                            for (let i = 1; i < remainingDays.length; i++) {
                              if (remainingDays[i] <= event.end) {
                                spanWidth++
                              } else {
                                break
                              }
                            }
                          }

                          return isEventStart ? (
                            <motion.div
                              key={event.id}
                              className={cn(
                                "absolute rounded-sm cursor-pointer flex items-center justify-center text-xs font-medium text-white shadow-sm",
                                getStatusColor(event.resource.status)
                              )}
                              style={{
                                width: `calc(${spanWidth * cellWidth}px - 8px)`,
                                height: '24px',
                                left: '4px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                zIndex: 5
                              }}
                              onClick={() => handleEventClick(event)}
                              whileHover={{ scale: 1.02, zIndex: 10 }}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                            >
                              <span className="truncate px-1">
                                {event.resource.type === 'vacation' && '🏖️'}
                                {event.resource.type === 'sick' && '🏥'}  
                                {event.resource.type === 'personal' && '👤'}
                                {' '}
                                {event.resource.status === 'pending' ? 'Pending' : 
                                 event.resource.status === 'approved' ? 'Approved' : 
                                 event.resource.status}
                              </span>
                            </motion.div>
                          ) : null
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Holiday Request Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-700">Employee:</label>
                  <p>{selectedEvent.resource.userName}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Type:</label>
                  <p>{t(`holidays.request.types.${selectedEvent.resource.type}`)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Status:</label>
                  <div className="mt-1">
                    <StatusBadge status={selectedEvent.resource.status} />
                  </div>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Working Days:</label>
                  <p>{selectedEvent.resource.workingDays}</p>
                </div>
                <div className="col-span-2">
                  <label className="font-medium text-gray-700">Period:</label>
                  <p>
                    {format(selectedEvent.start, "dd MMMM yyyy", { locale: getDateFnsLocale() })} - {" "}
                    {format(selectedEvent.end, "dd MMMM yyyy", { locale: getDateFnsLocale() })}
                  </p>
                </div>
                {selectedEvent.resource.notes && (
                  <div className="col-span-2">
                    <label className="font-medium text-gray-700">Notes:</label>
                    <p className="text-gray-600 mt-1">{selectedEvent.resource.notes}</p>
                  </div>
                )}
              </div>

              {/* Admin Actions */}
              {isAdmin && selectedEvent.resource.status === 'pending' && (
                <div className="flex space-x-2 pt-4 border-t">
                  <Button
                    onClick={async () => {
                      await onApproveEvent?.(selectedEvent.id)
                      setShowEventDialog(false)
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    onClick={async () => {
                      await onRejectEvent?.(selectedEvent.id)
                      setShowEventDialog(false)
                    }}
                    variant="destructive"
                    className="flex-1"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}