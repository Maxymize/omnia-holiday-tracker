"use client"

import * as React from "react"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, differenceInDays, isWeekend, addDays } from "date-fns"
import { CalendarIcon, AlertTriangle, CheckCircle, ArrowLeft, ArrowRight, Clock, FileText, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/date-picker"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/hooks/useAuth"
import { useTranslation } from "@/lib/i18n/provider"
import { toast } from "@/lib/utils/toast"

// Enhanced validation schema for multi-step form
const holidayRequestSchema = z.object({
  startDate: z.date({
    message: "Data di inizio richiesta",
  }),
  endDate: z.date({
    message: "Data di fine richiesta",
  }),
  type: z.enum(["vacation", "sick", "personal"], {
    message: "Seleziona il tipo di permesso",
  }),
  notes: z.string().max(500, "Le note non possono superare i 500 caratteri").optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate
  }
  return true
}, {
  message: "La data di fine deve essere successiva alla data di inizio",
  path: ["endDate"],
}).refine((data) => {
  if (data.startDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return data.startDate >= today
  }
  return true
}, {
  message: "Non puoi richiedere permessi per date passate",
  path: ["startDate"],
}).refine((data) => {
  if (data.startDate) {
    const maxDate = addDays(new Date(), 365) // 1 year in advance
    return data.startDate <= maxDate
  }
  return true
}, {
  message: "Non puoi richiedere permessi oltre un anno in anticipo",
  path: ["startDate"],
})

type HolidayRequestFormData = z.infer<typeof holidayRequestSchema>

// Step definitions
const STEPS = [
  { id: 1, title: "Date", description: "Seleziona il periodo", icon: CalendarIcon },
  { id: 2, title: "Tipo", description: "Tipo di permesso", icon: FileText },
  { id: 3, title: "Note", description: "Aggiungi dettagli", icon: FileText },
  { id: 4, title: "Riepilogo", description: "Conferma e invia", icon: CheckCircle },
] as const

interface MultiStepHolidayRequestProps {
  onSubmit: (data: HolidayRequestFormData & { workingDays: number }) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  defaultValues?: Partial<HolidayRequestFormData>
  className?: string
  existingHolidays?: Array<{
    startDate: string
    endDate: string
    status: string
  }>
}

interface Holiday {
  startDate: string
  endDate: string
  status: string
}

export function MultiStepHolidayRequest({
  onSubmit,
  onCancel,
  isLoading = false,
  defaultValues,
  className,
  existingHolidays = [],
}: MultiStepHolidayRequestProps) {
  const [currentStep, setCurrentStep] = React.useState(1)
  const [workingDays, setWorkingDays] = React.useState(0)
  const [holidayAllowance] = React.useState(20) // This would come from user data
  const [usedDays] = React.useState(5) // This would be calculated from existing holidays
  const [isCheckingConflicts, setIsCheckingConflicts] = React.useState(false)
  const [conflictWarning, setConflictWarning] = React.useState<string | null>(null)
  
  const { user } = useAuth()
  const { t } = useTranslation()

  const form = useForm<HolidayRequestFormData>({
    resolver: zodResolver(holidayRequestSchema),
    defaultValues: {
      type: "vacation",
      notes: "",
      ...defaultValues,
    },
    mode: "onChange",
  })

  const startDate = form.watch("startDate")
  const endDate = form.watch("endDate")
  const holidayType = form.watch("type")
  const notes = form.watch("notes")

  // Calculate working days when dates change
  React.useEffect(() => {
    if (startDate && endDate) {
      const days = calculateWorkingDays(startDate, endDate)
      setWorkingDays(days)
    } else {
      setWorkingDays(0)
      setConflictWarning(null)
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

  const checkForConflicts = useCallback(async (start: Date, end: Date) => {
    setIsCheckingConflicts(true)
    setConflictWarning(null)

    try {
      // Check against existing holidays prop first
      const hasLocalConflict = existingHolidays.some(holiday => {
        const holidayStart = new Date(holiday.startDate)
        const holidayEnd = new Date(holiday.endDate)
        
        // Check for any overlap
        return (start <= holidayEnd && end >= holidayStart) &&
               (holiday.status === 'approved' || holiday.status === 'pending')
      })

      if (hasLocalConflict) {
        setConflictWarning("Le date selezionate si sovrappongono con una richiesta esistente")
        return
      }

      // Check with backend API
      if (user?.id) {
        const baseUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:8888' 
          : window.location.origin

        const token = localStorage.getItem('accessToken')
        
        const response = await fetch(`${baseUrl}/.netlify/functions/get-holidays-mock`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          const holidays = data.data || []
          
          const hasConflict = holidays.some((holiday: Holiday) => {
            const holidayStart = new Date(holiday.startDate)
            const holidayEnd = new Date(holiday.endDate)
            
            return (start <= holidayEnd && end >= holidayStart) &&
                   (holiday.status === 'approved' || holiday.status === 'pending')
          })

          if (hasConflict) {
            setConflictWarning("Le date selezionate si sovrappongono con una richiesta esistente")
          }
        }
      }
    } catch (error) {
      console.error('Error checking conflicts:', error)
    } finally {
      setIsCheckingConflicts(false)
    }
  }, [existingHolidays, user?.id])

  // Separate useEffect for conflict checking
  React.useEffect(() => {
    if (startDate && endDate) {
      checkForConflicts(startDate, endDate)
    }
  }, [startDate, endDate, checkForConflicts])

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

  const remainingDays = holidayAllowance - usedDays

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fieldsToValidate)
    
    if (isValid && !conflictWarning) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const getFieldsForStep = (step: number): (keyof HolidayRequestFormData)[] => {
    switch (step) {
      case 1:
        return ["startDate", "endDate"]
      case 2:
        return ["type"]
      case 3:
        return ["notes"]
      default:
        return []
    }
  }

  const handleSubmit = async (data: HolidayRequestFormData) => {
    if (conflictWarning) {
      toast.error("Risolvi i conflitti prima di inviare la richiesta")
      return
    }

    try {
      await onSubmit({
        ...data,
        workingDays,
      })
      toast.success("Richiesta inviata con successo!")
    } catch (error) {
      console.error('Error submitting request:', error)
      toast.error("Errore durante l'invio della richiesta")
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Seleziona il Periodo</h3>
              <p className="text-muted-foreground">Scegli le date per la tua richiesta di permesso</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Periodo di Assenza</Label>
                <DateRangePicker
                  from={startDate}
                  to={endDate}
                  onDateRangeChange={(from, to) => {
                    if (from) form.setValue("startDate", from)
                    if (to) form.setValue("endDate", to)
                  }}
                  placeholder="Seleziona il periodo..."
                  minDate={new Date()}
                  maxDate={addDays(new Date(), 365)}
                  locale="it"
                  className="w-full"
                />
                {form.formState.errors.startDate && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.startDate.message}
                  </p>
                )}
                {form.formState.errors.endDate && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.endDate.message}
                  </p>
                )}
              </div>

              {/* Conflict Warning */}
              {isCheckingConflicts && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Verifica conflitti con altre richieste...
                  </AlertDescription>
                </Alert>
              )}

              {conflictWarning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{conflictWarning}</AlertDescription>
                </Alert>
              )}

              {/* Working Days Summary */}
              {startDate && endDate && workingDays > 0 && (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Giorni lavorativi richiesti</p>
                      <p className="text-sm text-muted-foreground">
                        {format(startDate, "dd/MM/yyyy")} - {format(endDate, "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{workingDays}</p>
                      <p className="text-sm text-muted-foreground">giorni</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Tipo di Permesso</h3>
              <p className="text-muted-foreground">Seleziona il tipo di assenza che stai richiedendo</p>
            </div>
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo di Assenza</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Seleziona il tipo di permesso" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="vacation">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Ferie</span>
                          <span className="text-xs text-muted-foreground">Ferie annuali retribuite</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="sick">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Malattia</span>
                          <span className="text-xs text-muted-foreground">Congedo per malattia</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="personal">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Permesso Personale</span>
                          <span className="text-xs text-muted-foreground">Per esigenze personali/familiari</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {getHolidayTypeDescription(field.value)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Holiday Balance Check for Vacation */}
            {holidayType === "vacation" && (
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-2">Saldo Ferie</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{holidayAllowance}</p>
                    <p className="text-muted-foreground">Totali</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{usedDays}</p>
                    <p className="text-muted-foreground">Utilizzate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{remainingDays}</p>
                    <p className="text-muted-foreground">Rimanenti</p>
                  </div>
                </div>
                
                {workingDays > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span>Dopo questa richiesta:</span>
                      <span className={`font-bold ${remainingDays - workingDays < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {remainingDays - workingDays} giorni rimanenti
                      </span>
                    </div>
                    {remainingDays - workingDays < 0 && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Non hai abbastanza giorni di ferie disponibili per questo periodo.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Note Aggiuntive</h3>
              <p className="text-muted-foreground">Aggiungi eventuali dettagli o giustificazioni</p>
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Opzionale)</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Aggiungi eventuali note, motivi per la richiesta, o informazioni aggiuntive per il manager..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0}/500 caratteri
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Riepilogo Richiesta</h3>
              <p className="text-muted-foreground">Verifica i dettagli prima di inviare</p>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Dipendente</Label>
                    <p className="font-medium">{user?.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Data Inizio</Label>
                    <p className="font-medium">{startDate ? format(startDate, "dd/MM/yyyy") : "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data Fine</Label>
                    <p className="font-medium">{endDate ? format(endDate, "dd/MM/yyyy") : "-"}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Tipo</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getHolidayTypeLabel(holidayType)}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Giorni Lavorativi</Label>
                    <p className="font-medium">{workingDays} giorni</p>
                  </div>
                </div>
                
                {notes && (
                  <div>
                    <Label className="text-muted-foreground">Note</Label>
                    <p className="font-medium bg-muted/50 p-2 rounded text-sm">{notes}</p>
                  </div>
                )}
              </div>

              {/* Final Warnings */}
              {holidayType === "vacation" && remainingDays - workingDays < 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Attenzione: questa richiesta supera i tuoi giorni di ferie disponibili.
                  </AlertDescription>
                </Alert>
              )}

              {conflictWarning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{conflictWarning}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return startDate && endDate && !conflictWarning && !isCheckingConflicts
      case 2:
        return holidayType && (holidayType !== "vacation" || remainingDays - workingDays >= 0)
      case 3:
        return true // Notes are optional
      case 4:
        return !conflictWarning && !isLoading
      default:
        return false
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Richiesta Permesso</CardTitle>
            <CardDescription>
              Passo {currentStep} di {STEPS.length}: {STEPS[currentStep - 1].description}
            </CardDescription>
          </div>
          <Badge variant="outline">
            {currentStep}/{STEPS.length}
          </Badge>
        </div>
        
        {/* Progress Indicator */}
        <div className="flex items-center space-x-2 mt-4">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium
                ${currentStep > step.id ? 'bg-green-500 text-white' : 
                  currentStep === step.id ? 'bg-blue-500 text-white' : 
                  'bg-muted text-muted-foreground border'}`}>
                {currentStep > step.id ? <CheckCircle className="w-4 h-4" /> : step.id}
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-px ${currentStep > step.id ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="min-h-[400px]">
            {renderStepContent()}
          </CardContent>

          <CardFooter className="flex justify-between">
            <div className="flex gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Annulla
                </Button>
              )}
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Indietro
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              {currentStep < STEPS.length ? (
                <Button 
                  type="button" 
                  onClick={nextStep}
                  disabled={!canProceed()}
                >
                  Avanti
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={!canProceed() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Invio in corso...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Invia Richiesta
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}