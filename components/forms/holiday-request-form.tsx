"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, differenceInDays, isWeekend } from "date-fns"
import { CalendarIcon, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/date-picker"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Form validation schema
const holidayRequestSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  type: z.enum(["vacation", "sick", "personal"]),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate
  }
  return true
}, {
  message: "La data di fine deve essere successiva alla data di inizio",
  path: ["endDate"],
})

type HolidayRequestFormData = z.infer<typeof holidayRequestSchema>

interface HolidayRequestFormProps {
  onSubmit: (data: HolidayRequestFormData & { workingDays: number }) => Promise<void>
  isLoading?: boolean
  defaultValues?: Partial<HolidayRequestFormData>
  className?: string
}

export function HolidayRequestForm({
  onSubmit,
  isLoading = false,
  defaultValues,
  className,
}: HolidayRequestFormProps) {
  const [workingDays, setWorkingDays] = React.useState(0)
  const [holidayAllowance] = React.useState(20) // This would come from user data

  const form = useForm<HolidayRequestFormData>({
    resolver: zodResolver(holidayRequestSchema),
    defaultValues: {
      type: "vacation",
      notes: "",
      ...defaultValues,
    },
  })

  const startDate = form.watch("startDate")
  const endDate = form.watch("endDate")
  const holidayType = form.watch("type")

  // Calculate working days when dates change
  React.useEffect(() => {
    if (startDate && endDate) {
      const days = calculateWorkingDays(startDate, endDate)
      setWorkingDays(days)
    } else {
      setWorkingDays(0)
    }
  }, [startDate, endDate])

  const calculateWorkingDays = (start: Date, end: Date): number => {
    let count = 0
    const current = new Date(start)
    
    while (current <= end) {
      if (!isWeekend(current)) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }
    
    return count
  }

  const handleSubmit = async (data: HolidayRequestFormData) => {
    await onSubmit({
      ...data,
      workingDays,
    })
  }

  const getHolidayTypeLabel = (type: string) => {
    switch (type) {
      case "vacation":
        return "Ferie"
      case "sick":
        return "Malattia"
      case "personal":
        return "Permesso Personale"
      default:
        return type
    }
  }

  const getHolidayTypeDescription = (type: string) => {
    switch (type) {
      case "vacation":
        return "Ferie annuali - vengono scalate dal monte ore"
      case "sick":
        return "Congedo per malattia - richiede certificato medico"
      case "personal":
        return "Permesso personale - per esigenze familiari"
      default:
        return ""
    }
  }

  const remainingDays = holidayAllowance - 5 // This would be calculated from user's used holidays

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Richiesta Permesso</CardTitle>
        <CardDescription>
          Compila il modulo per inviare una nuova richiesta di permesso
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-6">
            {/* Date Range Selection */}
            <div className="space-y-2">
              <Label>Periodo</Label>
              <DateRangePicker
                from={startDate}
                to={endDate}
                onDateRangeChange={(from, to) => {
                  form.setValue("startDate", from!)
                  form.setValue("endDate", to!)
                }}
                placeholder="Seleziona il periodo..."
                minDate={new Date()}
                maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
                locale="it"
              />
              {form.formState.errors.startDate && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.startDate.message}
                </p>
              )}
              {form.formState.errors.endDate && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.endDate.message}
                </p>
              )}
            </div>

            {/* Holiday Type Selection */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo di Permesso</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il tipo di permesso" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="vacation">Ferie</SelectItem>
                      <SelectItem value="sick">Malattia</SelectItem>
                      <SelectItem value="personal">Permesso Personale</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {getHolidayTypeDescription(field.value)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Opzionale)</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Aggiungi eventuali note o dettagli..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Summary Information */}
            {startDate && endDate && workingDays > 0 && (
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium">Riepilogo Richiesta</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Periodo:</span>
                    <p className="font-medium">
                      {format(startDate, "dd/MM/yyyy")} - {format(endDate, "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Giorni lavorativi:</span>
                    <p className="font-medium">{workingDays}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium">{getHolidayTypeLabel(holidayType)}</p>
                  </div>
                  {holidayType === "vacation" && (
                    <div>
                      <span className="text-muted-foreground">Ferie rimanenti:</span>
                      <p className="font-medium">
                        {remainingDays - workingDays} giorni
                        {remainingDays - workingDays < 0 && (
                          <Badge variant="destructive" className="ml-2">Insufficienti</Badge>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warning for insufficient vacation days */}
            {holidayType === "vacation" && remainingDays - workingDays < 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Non hai abbastanza giorni di ferie disponibili per questo periodo. 
                  Contatta l&apos;amministratore per maggiori informazioni.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => form.reset()}
            >
              Annulla
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || (holidayType === "vacation" && remainingDays - workingDays < 0)}
            >
              {isLoading ? "Invio in corso..." : "Invia Richiesta"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}