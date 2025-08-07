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

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  locale?: string
  minDate?: Date
  maxDate?: Date
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
            if (range?.from && range?.to) {
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