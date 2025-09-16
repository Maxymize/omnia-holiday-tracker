"use client"

import * as React from "react"
import { format } from "date-fns"
import { it, enUS, es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface OccupiedDate {
  date: Date
  type: 'vacation' | 'sick' | 'personal'
  status: 'pending' | 'approved' | 'rejected'
  title?: string
}

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  locale?: string
  minDate?: Date
  maxDate?: Date
  occupiedDates?: OccupiedDate[]
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Seleziona data...",
  disabled = false,
  className,
  locale = "it",
  minDate,
  maxDate,
  occupiedDates = [],
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const getLocale = () => {
    switch (locale) {
      case "en":
        return enUS
      case "es":
        return es
      case "it":
      default:
        return it
    }
  }

  // Create modifiers for occupied dates
  const modifiers = React.useMemo(() => {
    const vacationApproved = occupiedDates
      .filter(d => d.type === 'vacation' && d.status === 'approved')
      .map(d => d.date)

    const vacationPending = occupiedDates
      .filter(d => d.type === 'vacation' && d.status === 'pending')
      .map(d => d.date)

    const sickApproved = occupiedDates
      .filter(d => d.type === 'sick' && d.status === 'approved')
      .map(d => d.date)

    const sickPending = occupiedDates
      .filter(d => d.type === 'sick' && d.status === 'pending')
      .map(d => d.date)

    const personalApproved = occupiedDates
      .filter(d => d.type === 'personal' && d.status === 'approved')
      .map(d => d.date)

    const personalPending = occupiedDates
      .filter(d => d.type === 'personal' && d.status === 'pending')
      .map(d => d.date)

    return {
      vacationApproved,
      vacationPending,
      sickApproved,
      sickPending,
      personalApproved,
      personalPending,
    }
  }, [occupiedDates])

  // Create modifiers classNames for styling
  const modifiersClassNames = {
    vacationApproved: 'bg-green-100 hover:bg-green-200 text-green-800 font-medium',
    vacationPending: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium',
    sickApproved: 'bg-red-100 hover:bg-red-200 text-red-800 font-medium',
    sickPending: 'bg-orange-100 hover:bg-orange-200 text-orange-800 font-medium',
    personalApproved: 'bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium',
    personalPending: 'bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium',
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "dd/MM/yyyy", { locale: getLocale() })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onDateChange?.(selectedDate)
            setOpen(false)
          }}
          disabled={(date) => {
            if (minDate && date < minDate) return true
            if (maxDate && date > maxDate) return true
            return false
          }}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          initialFocus
          locale={getLocale()}
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  from?: Date
  to?: Date
  onDateRangeChange?: (from: Date | undefined, to: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  locale?: string
  minDate?: Date
  maxDate?: Date
}

export function DateRangePicker({
  from,
  to,
  onDateRangeChange,
  placeholder = "Seleziona periodo...",
  disabled = false,
  className,
  locale = "it",
  minDate,
  maxDate,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const getLocale = () => {
    switch (locale) {
      case "en":
        return enUS
      case "es":
        return es
      case "it":
      default:
        return it
    }
  }

  const formatDateRange = () => {
    if (from && to) {
      return `${format(from, "dd/MM/yyyy", { locale: getLocale() })} - ${format(to, "dd/MM/yyyy", { locale: getLocale() })}`
    }
    if (from) {
      return format(from, "dd/MM/yyyy", { locale: getLocale() })
    }
    return placeholder
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !from && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from, to }}
          onSelect={(range) => {
            onDateRangeChange?.(range?.from, range?.to)
            // Only close if we have both dates and they are different (not a single day selection)
            if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) {
              setOpen(false)
            }
            // Also close if user clicks the same date twice (single day holiday)
            else if (range?.from && range?.to && range.from.getTime() === range.to.getTime()) {
              setOpen(false)
            }
          }}
          disabled={(date) => {
            if (minDate && date < minDate) return true
            if (maxDate && date > maxDate) return true
            return false
          }}
          numberOfMonths={2}
          initialFocus
          locale={getLocale()}
        />
      </PopoverContent>
    </Popover>
  )
}