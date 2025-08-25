"use client"

import * as React from "react"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, differenceInDays, isWeekend, addDays } from "date-fns"
import { CalendarIcon, AlertTriangle, CheckCircle, ArrowLeft, ArrowRight, Clock, FileText, Loader2, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/hooks/useAuth"
import { useHolidays } from "@/lib/hooks/useHolidays"
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
  medicalCertificate: z.any().optional(), // File upload for medical certificate
  medicalCertificateOption: z.string().optional(), // Option for medical certificate
  medicalCertificateFileName: z.string().optional(), // File name for medical certificate
  medicalCertificateFileType: z.string().optional(), // MIME type of the file
  medicalCertificateFileContent: z.string().optional(), // Base64 encoded file content
  medicalCertificateFileId: z.string().optional(), // ID returned from upload API
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
}).refine((data) => {
  if (data.type === "sick") {
    // Must either upload a file or commit to send later
    const hasFile = data.medicalCertificate !== null && data.medicalCertificate !== undefined
    const willSendLater = data.medicalCertificateOption === "send_later"
    return hasFile || willSendLater
  }
  return true
}, {
  message: "Il certificato medico è necessario per i congedi per malattia",
  path: ["medicalCertificate"],
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
  const [isCheckingConflicts, setIsCheckingConflicts] = React.useState(false)
  const [conflictWarning, setConflictWarning] = React.useState<string | null>(null)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [medicalCertOption, setMedicalCertOption] = React.useState<"upload" | "send_later" | null>(null)
  const [dragActive, setDragActive] = React.useState(false)
  const [isSubmittingRequest, setIsSubmittingRequest] = React.useState(false)
  
  const { user } = useAuth()
  const { stats } = useHolidays({ viewMode: 'own' }) // Get real holiday stats
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
  const medicalCertificateOptionValue = form.watch("medicalCertificateOption")

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

  // Set default medical certificate option for sick leave
  React.useEffect(() => {
    if (holidayType === 'sick' && !medicalCertificateOptionValue) {
      form.setValue('medicalCertificateOption', 'upload')
      setMedicalCertOption('upload')
    }
  }, [holidayType, medicalCertificateOptionValue, form])

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
    // Prevent multiple simultaneous checks
    if (isCheckingConflicts) {
      console.log('Conflict check already in progress, skipping...')
      return
    }
    
    setIsCheckingConflicts(true)
    setConflictWarning(null)

    try {
      // Ensure existingHolidays is an array
      const holidaysArray = Array.isArray(existingHolidays) ? existingHolidays : []
      
      // Check against existing holidays prop first
      const hasLocalConflict = holidaysArray.some(holiday => {
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
          ? 'http://localhost:3000' 
          : window.location.origin

        const token = localStorage.getItem('accessToken')
        
        const response = await fetch(`${baseUrl}/.netlify/functions/get-holidays`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          const holidays = Array.isArray(data.data) ? data.data : (data.data ? [] : [])
          
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
  }, [existingHolidays, user?.id, isCheckingConflicts])

  // Debounced conflict checking to prevent infinite loops
  React.useEffect(() => {
    if (startDate && endDate) {
      setConflictWarning(null) // Reset warning when dates change
      const timeoutId = setTimeout(() => {
        checkForConflicts(startDate, endDate)
      }, 500) // Increased debounce to 500ms for better performance
      
      return () => clearTimeout(timeoutId)
    }
  }, [startDate, endDate]) // Removed checkForConflicts to prevent infinite loop

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

  // Calculate real-time vacation days using user.holidayAllowance and stats.usedDays
  const holidayAllowance = user?.holidayAllowance || 25 // Use real user allowance
  const usedDays = stats?.usedDays || 0 // Use real used days from stats
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
        return ["notes", "medicalCertificate", "medicalCertificateOption"]
      default:
        return []
    }
  }

  const handleSubmit = async (data: HolidayRequestFormData) => {
    // FIXED: Prevent duplicate submissions with submission lock
    if (isLoading || isSubmittingRequest) {
      console.log('Submission already in progress, preventing duplicate');
      return;
    }

    if (conflictWarning) {
      toast.error("Risolvi i conflitti prima di inviare la richiesta")
      return
    }

    // Lock submission to prevent duplicates
    setIsSubmittingRequest(true);

    try {
      // Get auth token
      const token = localStorage.getItem('accessToken')
      if (!token) {
        toast.error("Sessione scaduta. Effettua nuovamente il login.")
        return
      }

      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : window.location.origin

      // Format dates to YYYY-MM-DD
      const formattedData = {
        startDate: format(data.startDate, 'yyyy-MM-dd'),
        endDate: format(data.endDate, 'yyyy-MM-dd'),
        type: data.type,
        notes: data.notes || '',
        // Include medical certificate info for sick leave
        ...(data.type === 'sick' && {
          medicalCertificateOption: medicalCertOption || data.medicalCertificateOption,
          ...(selectedFile?.name && { medicalCertificateFileName: selectedFile.name })
        })
      }

      // Debug logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Frontend sending data:', JSON.stringify(formattedData, null, 2));
        console.log('🔍 Form states before formatting:', {
          type: data.type,
          formMedicalCertOption: data.medicalCertificateOption,
          localMedicalCertState: medicalCertOption,
          selectedFileExists: !!selectedFile,
          selectedFileName: selectedFile?.name,
          finalMedicalCertOption: medicalCertOption || data.medicalCertificateOption
        });
      }

      // Helper function for consistent fetch configuration
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.port === '3001';

      // Make API call to create holiday request
      const response = await fetch(`${baseUrl}/.netlify/functions/create-holiday-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        // Include credentials only in production where cookies work properly
        ...(isDevelopment ? {} : { credentials: 'include' }),
        body: JSON.stringify(formattedData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante la creazione della richiesta')
      }

      if (result.success) {
        let uploadError = null;
        
        // Upload medical certificate if provided
        if (data.type === 'sick' && selectedFile && data.medicalCertificateOption === 'upload') {
          try {
            console.log('Uploading medical certificate:', selectedFile.name);
            
            // Convert file to base64
            const fileContent = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = reader.result?.toString().split(',')[1] || '';
                resolve(base64);
              };
              reader.onerror = reject;
              reader.readAsDataURL(selectedFile);
            });

            const uploadData = {
              fileName: selectedFile.name,
              fileType: selectedFile.type,
              fileContent: fileContent,
              holidayRequestId: result.data.id
            };

            console.log('Sending upload data:', { 
              fileName: uploadData.fileName, 
              fileType: uploadData.fileType,
              holidayRequestId: uploadData.holidayRequestId,
              contentLength: uploadData.fileContent.length 
            });

            const uploadResponse = await fetch(`${baseUrl}/.netlify/functions/upload-medical-certificate`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              ...(isDevelopment ? {} : { credentials: 'include' }),
              body: JSON.stringify(uploadData)
            });

            const uploadResult = await uploadResponse.json();

            // FIXED: Check response status properly to avoid false error messages
            if (uploadResponse.ok && uploadResponse.status === 200) {
              console.log('Upload successful:', uploadResult);
              // Upload succeeded - no error
            } else {
              console.error('Upload failed with status:', uploadResponse.status, uploadResult);
              throw new Error(uploadResult.error || 'Errore durante l\'upload del certificato');
            }
            
          } catch (uploadErr) {
            console.error('Upload error:', uploadErr);
            uploadError = uploadErr instanceof Error ? uploadErr.message : 'Errore durante l\'upload del certificato';
          }
        }

        if (uploadError) {
          toast.success("✅ Richiesta ferie inviata!", 
            `La tua richiesta dal ${format(data.startDate, 'dd/MM/yyyy')} al ${format(data.endDate, 'dd/MM/yyyy')} è stata inviata, ma c'è stato un problema con l'upload del certificato: ${uploadError}`
          );
        } else {
          // Don't show success message here - let parent handle it
          console.log('Holiday request and upload completed successfully');
        }
        
        // FIXED: Call the onSubmit callback only after successful API operations
        // This prevents duplicate submissions
        await onSubmit({
          ...data,
          workingDays,
        })
      }
    } catch (error) {
      console.error('Error submitting request:', error)
      const errorMessage = error instanceof Error ? error.message : "Si è verificato un errore. Riprova."
      toast.error("Errore durante l'invio della richiesta", errorMessage)
    } finally {
      // Always unlock submission
      setIsSubmittingRequest(false);
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Date */}
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Inizio</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value}
                          onDateChange={(date) => {
                            field.onChange(date)
                            // If end date is before start date, clear it
                            if (endDate && date && endDate < date) {
                              form.setValue("endDate", null as any)
                            }
                          }}
                          placeholder="Seleziona data inizio..."
                          minDate={new Date()}
                          maxDate={addDays(new Date(), 365)}
                          locale="it"
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        Primo giorno di ferie (non si lavora)
                      </p>
                    </FormItem>
                  )}
                />

                {/* End Date */}
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Fine</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value}
                          onDateChange={field.onChange}
                          placeholder="Seleziona data fine..."
                          minDate={startDate || new Date()}
                          maxDate={addDays(new Date(), 365)}
                          locale="it"
                          className="w-full"
                          disabled={!startDate}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        Ultimo giorno di ferie (si torna al lavoro il giorno dopo)
                      </p>
                    </FormItem>
                  )}
                />
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
                      <SelectTrigger className="h-12 w-full">
                        <SelectValue placeholder="Seleziona il tipo di permesso">
                          {field.value && (
                            <span className="font-medium">{getHolidayTypeLabel(field.value)}</span>
                          )}
                        </SelectValue>
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
                    {field.value ? getHolidayTypeDescription(field.value) : ''}
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

            {/* Medical Certificate Upload for Sick Leave */}
            {holidayType === "sick" && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-yellow-600" />
                    <h4 className="font-medium text-yellow-800">Certificato Medico Necessario</h4>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Per i congedi per malattia è necessario il certificato medico. Puoi caricarlo ora o impegnarti a inviarlo successivamente.
                  </p>
                </div>

                {/* Medical Certificate Options */}
                <FormField
                  control={form.control}
                  name="medicalCertificateOption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opzioni Certificato Medico</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <input
                              type="radio"
                              id="upload-now"
                              value="upload"
                              checked={medicalCertOption === "upload"}
                              onChange={(e) => {
                                setMedicalCertOption("upload")
                                field.onChange("upload")
                                form.setValue("medicalCertificateOption", "upload")
                              }}
                              className="h-4 w-4 text-blue-600"
                            />
                            <label htmlFor="upload-now" className="text-sm font-medium">
                              Carica il documento ora
                            </label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <input
                              type="radio"
                              id="send-later"
                              value="send_later"
                              checked={medicalCertOption === "send_later"}
                              onChange={(e) => {
                                setMedicalCertOption("send_later")
                                field.onChange("send_later")
                                form.setValue("medicalCertificateOption", "send_later")
                                // Clear any selected file
                                setSelectedFile(null)
                                form.setValue("medicalCertificate", null)
                              }}
                              className="h-4 w-4 text-blue-600"
                            />
                            <label htmlFor="send-later" className="text-sm font-medium">
                              Mi impegno a inviarlo successivamente via email alla direzione aziendale
                            </label>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* File Upload Area - Only show if upload option is selected */}
                {medicalCertOption === "upload" && (
                  <FormField
                    control={form.control}
                    name="medicalCertificate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carica Certificato Medico</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <div
                              className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                                dragActive 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                              }`}
                              onDragOver={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setDragActive(true)
                              }}
                              onDragEnter={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setDragActive(true)
                              }}
                              onDragLeave={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setDragActive(false)
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setDragActive(false)
                                
                                const files = Array.from(e.dataTransfer.files)
                                const file = files[0]
                                
                                if (file) {
                                  // Check file type
                                  const allowedTypes = ['application/pdf', 'application/msword', 
                                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                    'image/jpeg', 'image/jpg', 'image/png']
                                  
                                  if (!allowedTypes.includes(file.type)) {
                                    toast.error("Formato file non supportato. Usa PDF, DOC, DOCX, JPG o PNG.")
                                    return
                                  }
                                  
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast.error("File troppo grande. Massimo 5MB consentiti.")
                                    return
                                  }
                                  
                                  setSelectedFile(file)
                                  field.onChange(file)
                                  
                                  // Convert file to base64 for upload
                                  const reader = new FileReader()
                                  reader.onload = () => {
                                    const base64Content = reader.result?.toString().split(',')[1] || ''
                                    form.setValue('medicalCertificateFileType', file.type)
                                    form.setValue('medicalCertificateFileContent', base64Content)
                                    form.setValue('medicalCertificateFileName', file.name)
                                  }
                                  reader.readAsDataURL(file)
                                }
                              }}
                              onClick={() => {
                                document.getElementById('medical-certificate')?.click()
                              }}
                            >
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className={`w-8 h-8 mb-2 ${dragActive ? 'text-blue-500' : 'text-gray-500'}`} />
                                <p className={`mb-2 text-sm ${dragActive ? 'text-blue-600' : 'text-gray-500'}`}>
                                  <span className="font-semibold">
                                    {dragActive ? 'Rilascia qui il file' : 'Clicca per caricare'}
                                  </span> 
                                  {!dragActive && ' o trascina il file'}
                                </p>
                                <p className={`text-xs ${dragActive ? 'text-blue-500' : 'text-gray-500'}`}>
                                  PDF, DOC, DOCX, JPG, PNG (MAX 5MB)
                                </p>
                              </div>
                            </div>
                            
                            <input
                              id="medical-certificate"
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast.error("File troppo grande. Massimo 5MB consentiti.")
                                    return
                                  }
                                  setSelectedFile(file)
                                  field.onChange(file)
                                  
                                  // Convert file to base64 for upload
                                  const reader = new FileReader()
                                  reader.onload = () => {
                                    const base64Content = reader.result?.toString().split(',')[1] || ''
                                    form.setValue('medicalCertificateFileType', file.type)
                                    form.setValue('medicalCertificateFileContent', base64Content)
                                    form.setValue('medicalCertificateFileName', file.name)
                                  }
                                  reader.readAsDataURL(file)
                                }
                              }}
                            />

                            {selectedFile && (
                              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-green-600" />
                                  <div>
                                    <p className="text-sm font-medium text-green-800">{selectedFile.name}</p>
                                    <p className="text-xs text-green-600">
                                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFile(null)
                                    field.onChange(null)
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          Carica il certificato medico in formato PDF, DOC, o immagine (JPG/PNG)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Commitment Message for Send Later Option */}
                {medicalCertOption === "send_later" && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <h4 className="font-medium text-blue-800">Impegno Registrato</h4>
                    </div>
                    <p className="text-sm text-blue-700">
                      Ti impegni a inviare il certificato medico via email alla direzione aziendale entro 3 giorni lavorativi dalla presentazione di questa richiesta.
                    </p>
                  </div>
                )}
              </div>
            )}
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
                    <p className="font-medium">{user?.name || 'Non disponibile'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{user?.email || 'Non disponibile'}</p>
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
                    <p className="font-medium bg-muted/50 p-2 rounded text-sm">
                      {typeof notes === 'string' ? notes : 'Note non disponibili'}
                    </p>
                  </div>
                )}

                {holidayType === "sick" && (
                  <div>
                    <Label className="text-muted-foreground">Certificato Medico</Label>
                    {selectedFile ? (
                      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">
                          {typeof selectedFile === 'object' && selectedFile?.name 
                            ? String(selectedFile.name) 
                            : 'File caricato'
                          }
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {typeof selectedFile === 'object' && selectedFile?.size 
                            ? (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB' 
                            : ''
                          }
                        </Badge>
                      </div>
                    ) : medicalCertOption === "send_later" ? (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">
                          Impegno a inviare via email entro 3 giorni lavorativi
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Non specificato</p>
                    )}
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
                  <AlertDescription>
                    {typeof conflictWarning === 'string' ? conflictWarning : 'Conflitto rilevato nelle date selezionate'}
                  </AlertDescription>
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
        // For sick leave, must either have a file uploaded or selected "send later" option
        if (holidayType === "sick") {
          return (medicalCertOption === "upload" && selectedFile) || medicalCertOption === "send_later"
        }
        return true // Notes are optional for other types
      case 4:
        return !conflictWarning && !isLoading && !isSubmittingRequest
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
                  disabled={!canProceed() || isLoading || isSubmittingRequest}
                  className="relative"
                >
                  {(isLoading || isSubmittingRequest) ? (
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