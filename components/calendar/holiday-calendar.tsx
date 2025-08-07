"use client"

import * as React from "react"
import { Calendar as BigCalendar, momentLocalizer, View, Views } from "react-big-calendar"
import moment from "moment"
import "moment/locale/it"
import { format } from "date-fns"
import { it } from "date-fns/locale"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react"

// Initialize localizer
moment.locale("it")
const localizer = momentLocalizer(moment)

interface HolidayEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    userId: string
    userName: string
    type: "vacation" | "sick" | "personal"
    status: "pending" | "approved" | "rejected"
    workingDays: number
    notes?: string
  }
}

interface HolidayCalendarProps {
  events: HolidayEvent[]
  onSelectEvent?: (event: HolidayEvent) => void
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
  onNavigate?: (date: Date) => void
  view?: View
  onViewChange?: (view: View) => void
  className?: string
  showAddButton?: boolean
  onAddHoliday?: () => void
}

export function HolidayCalendar({
  events,
  onSelectEvent,
  onSelectSlot,
  onNavigate,
  view = Views.MONTH,
  onViewChange,
  className,
  showAddButton = true,
  onAddHoliday,
}: HolidayCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date())

  // Custom event style getter
  const eventStyleGetter = (event: HolidayEvent) => {
    const { type, status } = event.resource
    
    let backgroundColor = "#e5e7eb" // default gray
    let borderColor = "#d1d5db"
    
    switch (status) {
      case "approved":
        switch (type) {
          case "vacation":
            backgroundColor = "#dcfce7" // green-100
            borderColor = "#16a34a" // green-600
            break
          case "sick":
            backgroundColor = "#fef3c7" // yellow-100
            borderColor = "#d97706" // yellow-600
            break
          case "personal":
            backgroundColor = "#dbeafe" // blue-100
            borderColor = "#2563eb" // blue-600
            break
        }
        break
      case "pending":
        backgroundColor = "#fff7ed" // orange-50
        borderColor = "#ea580c" // orange-600
        break
      case "rejected":
        backgroundColor = "#fef2f2" // red-50
        borderColor = "#dc2626" // red-600
        break
    }
    
    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: "2px",
        borderStyle: "solid",
        borderRadius: "4px",
        color: "#1f2937",
        fontSize: "12px",
        padding: "2px 4px",
      },
    }
  }

  // Custom event component
  const EventComponent = ({ event }: { event: HolidayEvent }) => {
    const getTypeIcon = (type: string) => {
      switch (type) {
        case "vacation":
          return "🏖️"
        case "sick":
          return "🏥"
        case "personal":
          return "👤"
        default:
          return "📅"
      }
    }

    return (
      <div className="flex items-center space-x-1 text-xs">
        <span>{getTypeIcon(event.resource.type)}</span>
        <span className="truncate">{event.resource.userName}</span>
        {event.resource.workingDays > 1 && (
          <Badge variant="secondary" className="text-xs px-1">
            {event.resource.workingDays}g
          </Badge>
        )}
      </div>
    )
  }

  // Custom toolbar
  const CustomToolbar = ({ label, onNavigate, onView, view: currentView }: any) => {
    return (
      <div className="flex items-center justify-between mb-4 p-4 border-b">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("PREV")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("TODAY")}
          >
            Oggi
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("NEXT")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h2 className="text-lg font-semibold">{label}</h2>

        <div className="flex items-center space-x-2">
          <div className="flex rounded-lg border">
            <Button
              variant={currentView === Views.MONTH ? "default" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => onView(Views.MONTH)}
            >
              Mese
            </Button>
            <Button
              variant={currentView === Views.WEEK ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-x-0"
              onClick={() => onView(Views.WEEK)}
            >
              Settimana
            </Button>
            <Button
              variant={currentView === Views.AGENDA ? "default" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => onView(Views.AGENDA)}
            >
              Lista
            </Button>
          </div>
          
          {showAddButton && (
            <Button onClick={onAddHoliday} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuova Richiesta
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Italian messages for the calendar
  const messages = {
    allDay: "Tutto il giorno",
    previous: "Precedente",
    next: "Successivo",
    today: "Oggi",
    month: "Mese",
    week: "Settimana",
    day: "Giorno",
    agenda: "Lista",
    date: "Data",
    time: "Ora",
    event: "Evento",
    noEventsInRange: "Nessun permesso in questo periodo",
    showMore: (total: number) => `+ Altri ${total}`,
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div style={{ height: "600px" }}>
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            onSelectEvent={onSelectEvent}
            onSelectSlot={onSelectSlot}
            onNavigate={(date, view, action) => {
              setCurrentDate(date)
              onNavigate?.(date)
            }}
            onView={onViewChange}
            view={view}
            views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
            step={60}
            showMultiDayTimes={false}
            selectable
            popup
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent,
              toolbar: CustomToolbar,
            }}
            messages={messages}
            culture="it"
            formats={{
              dateFormat: "D",
              dayFormat: (date: Date) => format(date, "EEE", { locale: it }),
              weekdayFormat: (date: Date) => format(date, "EEEE", { locale: it }),
              monthHeaderFormat: (date: Date) => format(date, "MMMM yyyy", { locale: it }),
              dayHeaderFormat: (date: Date) => format(date, "EEEE dd MMMM", { locale: it }),
              dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                `${format(start, "dd MMMM", { locale: it })} - ${format(end, "dd MMMM yyyy", { locale: it })}`,
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Legend component to show what colors mean
export function CalendarLegend() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Legenda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-100 border-2 border-green-600 rounded"></div>
          <span className="text-sm">Ferie Approvate</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-600 rounded"></div>
          <span className="text-sm">Malattia Approvata</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-100 border-2 border-blue-600 rounded"></div>
          <span className="text-sm">Permesso Personale</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-orange-50 border-2 border-orange-600 rounded"></div>
          <span className="text-sm">In Attesa di Approvazione</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-50 border-2 border-red-600 rounded"></div>
          <span className="text-sm">Rifiutato</span>
        </div>
      </CardContent>
    </Card>
  )
}