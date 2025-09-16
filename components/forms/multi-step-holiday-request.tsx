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
import { validateFileUpload, formatFileSize } from "@/lib/utils/netlify-blobs-limits"

// Enhanced validation schema for multi-step form
const createHolidayRequestSchema = (t: any) => z.object({
  startDate: z.date({
    message: t('forms.validation.selectStartDate'),
  }),
  endDate: z.date({
    message: t('forms.validation.selectEndDate'),
  }),
  type: z.enum(["vacation", "sick", "personal"], {
    message: t('forms.validation.selectLeaveType'),
  }),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
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
  message: t('forms.validation.endDateAfterStart'),
  path: ["endDate"],
}).refine((data) => {
  if (data.startDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return data.startDate >= today
  }
  return true
}, {
  message: t('forms.validation.noPastDates'),
  path: ["startDate"],
}).refine((data) => {
  if (data.startDate) {
    const maxDate = addDays(new Date(), 365) // 1 year in advance
    return data.startDate <= maxDate
  }
  return true
}, {
  message: t('forms.validation.noFutureDates'),
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
  message: t('forms.validation.medicalCertRequired'),
  path: ["medicalCertificate"],
})

type HolidayRequestFormData = z.infer<ReturnType<typeof createHolidayRequestSchema>>

// Step definitions
const STEPS = [
  { id: 1, title: "Date", description: "dates", icon: CalendarIcon },
  { id: 2, title: "Tipo", description: "type", icon: FileText },
  { id: 3, title: "Note", description: "notes", icon: FileText },
  { id: 4, title: "Riepilogo", description: "review", icon: CheckCircle },
] as const

interface MultiStepHolidayRequestProps {
  onSubmit: (data: HolidayRequestFormData & { workingDays: number, apiResponse?: any }) => Promise<void>
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
  const [userConfirmedSubmit, setUserConfirmedSubmit] = React.useState(false)
  const [storageUsage, setStorageUsage] = React.useState<{ totalSizeBytes: number } | null>(null)
  const [userHolidays, setUserHolidays] = React.useState<Holiday[]>([])

  const { user } = useAuth()
  const { stats } = useHolidays({ viewMode: 'own' }) // Get real holiday stats
  const { t, locale } = useTranslation()

  const form = useForm<HolidayRequestFormData>({
    resolver: zodResolver(createHolidayRequestSchema(t)),
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

  // Fetch storage usage on component mount
  React.useEffect(() => {
    const fetchStorageUsage = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        const baseUrl = window.location.origin

        const response = await fetch(`${baseUrl}/.netlify/functions/get-storage-usage`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.storage) {
            setStorageUsage(data.storage)
          }
        }
      } catch (error) {
        console.warn('Failed to fetch storage usage:', error)
      }
    }

    fetchStorageUsage()
  }, [])

  // Fetch user holidays for date picker occupied dates
  React.useEffect(() => {
    const fetchUserHolidays = async () => {
      if (!user?.id) return

      try {
        const baseUrl = window.location.origin
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
          const holidays = Array.isArray(data.data?.holidays) ? data.data.holidays : []
          setUserHolidays(holidays)
        }
      } catch (error) {
        console.error('Failed to fetch user holidays for date picker:', error)
      }
    }

    fetchUserHolidays()
  }, [user?.id])

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

  // Convert user holidays to occupied dates for DatePicker
  const getOccupiedDates = React.useMemo(() => {
    const occupiedDates: Array<{
      date: Date
      type: 'vacation' | 'sick' | 'personal'
      status: 'pending' | 'approved' | 'rejected'
      title?: string
    }> = []

    // Use only userHolidays since existingHolidays prop is not being passed anymore
    const safeUserHolidays = Array.isArray(userHolidays) ? userHolidays : []
    const combinedHolidays = safeUserHolidays

    for (const holiday of combinedHolidays) {
      if (!holiday || !holiday.startDate || !holiday.endDate) continue

      const startDate = new Date(holiday.startDate)
      const endDate = new Date(holiday.endDate)
      const current = new Date(startDate)

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) continue

      // Generate all dates in the range
      while (current <= endDate) {
        occupiedDates.push({
          date: new Date(current),
          type: (holiday as any).type || 'vacation',
          status: holiday.status as 'pending' | 'approved' | 'rejected',
          title: `${(holiday as any).type || 'vacation'} - ${holiday.status}`
        })
        current.setDate(current.getDate() + 1)
      }
    }

    return occupiedDates
  }, [userHolidays])

  const checkForConflicts = useCallback(async (start: Date, end: Date) => {
    // Create current check ID to prevent stale checks
    const checkId = Date.now()
    
    setIsCheckingConflicts(true)
    setConflictWarning(null)

    try {
      // Use userHolidays instead of existingHolidays
      const holidaysArray = Array.isArray(userHolidays) ? userHolidays : []
      
      // Check against existing holidays prop first
      const hasLocalConflict = holidaysArray.some(holiday => {
        const holidayStart = new Date(holiday.startDate)
        const holidayEnd = new Date(holiday.endDate)
        
        // Check for any overlap
        return (start <= holidayEnd && end >= holidayStart) &&
               (holiday.status === 'approved' || holiday.status === 'pending')
      })

      if (hasLocalConflict) {
        setConflictWarning(t('forms.holidays.request.multiStep.conflictWarning'))
        return
      }

      // Check with backend API
      if (user?.id) {
        const baseUrl = window.location.origin;

        const token = localStorage.getItem('accessToken')
        
        const response = await fetch(`${baseUrl}/.netlify/functions/get-holidays`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Always include credentials to send cookies
          credentials: 'include',
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
            setConflictWarning(t('forms.holidays.request.multiStep.conflictWarning'))
          }
        }
      }
    } catch (error) {
      console.error('Error checking conflicts:', error)
    } finally {
      setIsCheckingConflicts(false)
    }
  }, [userHolidays, user?.id])

  // Debounced conflict checking to prevent infinite loops
  React.useEffect(() => {
    if (startDate && endDate && !isCheckingConflicts) {
      setConflictWarning(null) // Reset warning when dates change
      const timeoutId = setTimeout(() => {
        // Only check if not already checking
        if (!isCheckingConflicts) {
          checkForConflicts(startDate, endDate)
        }
      }, 300) // Reduced debounce for better UX
      
      return () => clearTimeout(timeoutId)
    }
  }, [startDate, endDate]) // Removed checkForConflicts to break circular dependency

  const getHolidayTypeLabel = (type: string) => {
    switch (type) {
      case "vacation":
        return t('forms.holidays.request.types.vacation')
      case "sick":
        return t('forms.holidays.request.types.sick')
      case "personal":
        return t('forms.holidays.request.types.personal')
      default:
        return type
    }
  }

  const getHolidayTypeDescription = (type: string) => {
    switch (type) {
      case "vacation":
        return t('forms.holidays.request.multiStep.vacationDescription')
      case "sick":
        return t('forms.holidays.request.multiStep.sickDescription')
      case "personal":
        return t('forms.holidays.request.multiStep.personalDescription')
      default:
        return ""
    }
  }

  // Helper function to validate file with translations
  const validateFileWithTranslations = (file: File, currentStorage: number) => {
    const validation = validateFileUpload(file, currentStorage)

    if (!validation.isValid && validation.errorType) {
      let errorMessage = ''

      switch (validation.errorType) {
        case 'FILE_TOO_LARGE':
          errorMessage = t('forms.holidays.request.multiStep.fileTooLarge', {
            size: formatFileSize(validation.fileSize || 0),
            maxSize: formatFileSize(validation.maxSize || 0)
          })
          break
        case 'INVALID_TYPE':
          errorMessage = t('forms.holidays.request.multiStep.invalidFileFormat')
          break
        case 'STORAGE_FULL':
          errorMessage = 'Upload rifiutato: supererebbe il limite di storage'
          break
        default:
          errorMessage = 'Errore sconosciuto'
      }

      return { isValid: false, error: errorMessage }
    }

    if (validation.warningType) {
      let warningMessage = ''

      switch (validation.warningType) {
        case 'CRITICAL_LIMIT':
          warningMessage = `Attenzione: storage quasi al limite (${validation.usagePercentage}%)`
          break
        case 'NEAR_LIMIT':
          warningMessage = `Avviso: utilizzo storage elevato (${validation.usagePercentage}%)`
          break
      }

      return { isValid: true, warning: warningMessage }
    }

    return { isValid: true }
  }

  // Calculate real-time vacation days using user.holidayAllowance and stats.usedDays
  const holidayAllowance = user?.holidayAllowance || 25 // Use real user allowance
  const usedDays = stats?.usedDays || 0 // Use real used days from stats
  const remainingDays = holidayAllowance - usedDays

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fieldsToValidate)
    
    if (isValid && !conflictWarning) {
      const newStep = Math.min(currentStep + 1, STEPS.length)
      setCurrentStep(newStep)
      
      // FIXED: Only reset submit confirmation when NOT arriving at final step
      if (newStep !== STEPS.length) {
        setUserConfirmedSubmit(false)
      }
      
      // FIXED: Debug log for step 4 auto-submit investigation
      if (newStep === 4) {
        console.log('🔍 Arrived at step 4 - checking states:', {
          isLoading,
          isSubmittingRequest,
          userConfirmedSubmit,
          canProceed: !conflictWarning && !isLoading && !isSubmittingRequest
        });
      }
    }
  }

  const prevStep = () => {
    const newStep = Math.max(currentStep - 1, 1)
    setCurrentStep(newStep)
    
    // FIXED: Reset submit confirmation when going back from final step
    if (currentStep === STEPS.length) {
      setUserConfirmedSubmit(false)
    }
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

    // Note: userConfirmedSubmit check removed as it caused double-click requirement

    if (conflictWarning) {
      toast.error("Risolvi i conflitti di date prima di inviare la richiesta")
      return
    }

    // Lock submission to prevent duplicates
    setIsSubmittingRequest(true);

    try {
      // Get auth token
      const token = localStorage.getItem('accessToken')
      if (!token) {
        toast.error("Sessione scaduta. Effettua di nuovo l'accesso.")
        return
      }

      const baseUrl = window.location.origin;

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

      // Get auth token from localStorage
      const authToken = localStorage.getItem('accessToken');

      // Make API call to create holiday request
      const response = await fetch(`${baseUrl}/.netlify/functions/create-holiday-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        // Always include credentials to send cookies
        credentials: 'include',
        body: JSON.stringify(formattedData)
      })
      
      // Request completed

      const result = await response.json()

      if (!response.ok) {
        // Handle specific conflict errors from backend
        if (response.status === 409) {
          setConflictWarning(result.error || t('forms.holidays.request.multiStep.conflictWarning'))
          return; // Don't throw, just set conflict warning and return
        }
        throw new Error(result.error || 'Errore durante l\'invio della richiesta ferie')
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
              fileData: fileContent,
              holidayRequestId: result.data.id,
              contentLength: selectedFile.size
            };

            console.log('Sending upload data:', { 
              fileName: uploadData.fileName, 
              fileType: uploadData.fileType,
              holidayRequestId: uploadData.holidayRequestId,
              contentLength: uploadData.contentLength 
            });

            const uploadResponse = await fetch(`${baseUrl}/.netlify/functions/upload-medical-certificate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(authToken && { 'Authorization': `Bearer ${authToken}` })
              },
              // Always include credentials to send cookies
              credentials: 'include',
              body: JSON.stringify(uploadData)
            });

            const uploadResult = await uploadResponse.json();

            // FIXED: Check response status properly to avoid false error messages
            if (uploadResponse.ok && uploadResponse.status === 200) {
              console.log('Upload successful:', uploadResult);
              // Upload succeeded - no error
            } else {
              console.error('Upload failed with status:', uploadResponse.status, uploadResult);
              throw new Error(uploadResult.error || 'Errore durante il caricamento del certificato medico');
            }
            
          } catch (uploadErr) {
            console.error('Upload error:', uploadErr);
            uploadError = uploadErr instanceof Error ? uploadErr.message : 'Errore durante il caricamento del certificato medico';
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
          apiResponse: result
        })
      }
    } catch (error) {
      console.error('Error submitting request:', error)
      const errorMessage = error instanceof Error ? error.message : "Si è verificato un errore imprevisto. Riprova."
      toast.error("Errore durante l'invio della richiesta ferie", errorMessage)
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
              <h3 className="text-lg font-semibold">{t('forms.holidays.request.stepTitles.selectPeriod')}</h3>
              <p className="text-muted-foreground">{t('forms.holidays.request.stepTitles.selectPeriodDescription')}</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Date */}
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.holidays.request.dateLabels.startDate')}</FormLabel>
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
                          placeholder={t('forms.holidays.request.dateLabels.startDate')}
                          minDate={new Date()}
                          maxDate={addDays(new Date(), 365)}
                          locale={locale}
                          className="w-full"
                          occupiedDates={getOccupiedDates}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('forms.holidays.request.dateLabels.startDateHelper')}
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
                      <FormLabel>{t('forms.holidays.request.dateLabels.endDate')}</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value}
                          onDateChange={field.onChange}
                          placeholder={t('forms.holidays.request.dateLabels.endDate')}
                          minDate={startDate || new Date()}
                          maxDate={addDays(new Date(), 365)}
                          locale={locale}
                          className="w-full"
                          disabled={!startDate}
                          occupiedDates={getOccupiedDates}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('forms.holidays.request.dateLabels.endDateHelper')}
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
                    {t('forms.holidays.request.multiStep.checkingConflicts')}
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
                      <p className="font-medium">{t('forms.holidays.request.dateLabels.workingDaysRequested')}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(startDate, "dd/MM/yyyy")} - {format(endDate, "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{workingDays}</p>
                      <p className="text-sm text-muted-foreground">{t('forms.holidays.request.dateLabels.days')}</p>
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
              <h3 className="text-lg font-semibold">{t('forms.holidays.request.stepTitles.leaveType')}</h3>
              <p className="text-muted-foreground">{t('forms.holidays.request.stepTitles.leaveTypeDescription')}</p>
            </div>
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('forms.holidays.request.multiStep.absenceType')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 w-full">
                        <SelectValue placeholder={t('forms.holidays.request.multiStep.absenceType')}>
                          {field.value && (
                            <span className="font-medium">{getHolidayTypeLabel(field.value)}</span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="vacation">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{t('forms.holidays.request.types.vacation')}</span>
                          <span className="text-xs text-muted-foreground">{t('forms.holidays.request.multiStep.vacationDescription')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="sick">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{t('forms.holidays.request.types.sick')}</span>
                          <span className="text-xs text-muted-foreground">{t('forms.holidays.request.multiStep.sickDescription')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="personal">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{t('forms.holidays.request.types.personal')}</span>
                          <span className="text-xs text-muted-foreground">Per esigenze personali e familiari</span>
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
                <h4 className="font-medium mb-2">{t('forms.holidays.request.multiStep.holidayBalance')}</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{holidayAllowance}</p>
                    <p className="text-muted-foreground">{t('forms.holidays.request.multiStep.total')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{usedDays}</p>
                    <p className="text-muted-foreground">{t('forms.holidays.request.multiStep.used')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{remainingDays}</p>
                    <p className="text-muted-foreground">{t('forms.holidays.request.multiStep.remaining')}</p>
                  </div>
                </div>
                
                {workingDays > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span>{t('forms.holidays.request.multiStep.afterRequest')}</span>
                      <span className={`font-bold ${remainingDays - workingDays < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {remainingDays - workingDays} {t('forms.holidays.request.multiStep.daysRemaining')}
                      </span>
                    </div>
                    {remainingDays - workingDays < 0 && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {t('forms.holidays.request.multiStep.insufficientBalance')}
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
              <h3 className="text-lg font-semibold">{t('forms.holidays.request.stepTitles.additionalNotes')}</h3>
              <p className="text-muted-foreground">{t('forms.holidays.request.stepTitles.additionalNotesDescription')}</p>
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('forms.holidays.request.notes')}</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Scrivi qui eventuali note, motivi della richiesta, o informazioni aggiuntive per il manager..."
                      onKeyDown={(e) => {
                        // Prevent form submission when Enter is pressed
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                        }
                      }}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length || 0}/500 {t('forms.holidays.request.multiStep.characters')}
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
                    <h4 className="font-medium text-yellow-800">{t('forms.holidays.request.multiStep.medicalCertRequired')}</h4>
                  </div>
                  <p className="text-sm text-yellow-700">
                    {t('forms.holidays.request.multiStep.medicalCertRequiredDesc')}
                  </p>
                </div>

                {/* Medical Certificate Options */}
                <FormField
                  control={form.control}
                  name="medicalCertificateOption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('forms.holidays.request.multiStep.medicalCertOptions')}</FormLabel>
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
                              {t('forms.holidays.request.multiStep.uploadNow')}
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
                              {t('forms.holidays.request.multiStep.sendLater')}
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
                        <FormLabel>{t('forms.holidays.request.multiStep.uploadMedicalCert')}</FormLabel>
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
                                  // Use new validation utility with storage check
                                  const currentStorage = storageUsage?.totalSizeBytes || 0
                                  const validation = validateFileWithTranslations(file, currentStorage)

                                  if (!validation.isValid) {
                                    toast.error("File non valido", validation.error || "Errore sconosciuto")
                                    return
                                  }

                                  if (validation.warning) {
                                    toast.warning("Avviso storage", validation.warning)
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
                                    {dragActive ? t('forms.holidays.request.multiStep.dropFile') : t('forms.holidays.request.multiStep.selectFile')}
                                  </span> 
                                  {!dragActive && ` ${t('forms.holidays.request.multiStep.dragFile')}`}
                                </p>
                                <p className={`text-xs ${dragActive ? 'text-blue-500' : 'text-gray-500'}`}>
                                  PDF, JPG, PNG, GIF, WebP - Max 4MB per file
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
                                  // Use new validation utility with storage check
                                  const currentStorage = storageUsage?.totalSizeBytes || 0
                                  const validation = validateFileWithTranslations(file, currentStorage)

                                  if (!validation.isValid) {
                                    toast.error("File non valido", validation.error || "Errore sconosciuto")
                                    e.target.value = '' // Clear the input
                                    return
                                  }

                                  if (validation.warning) {
                                    toast.warning("Avviso storage", validation.warning)
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
                          {t('forms.holidays.request.multiStep.supportedFormats')}
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
                      <h4 className="font-medium text-blue-800">{t('forms.holidays.request.multiStep.commitmentConfirmed')}</h4>
                    </div>
                    <p className="text-sm text-blue-700">
                      {t('forms.holidays.request.multiStep.commitmentText')}
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
              <h3 className="text-lg font-semibold">{t('forms.holidays.request.stepTitles.summary')}</h3>
              <p className="text-muted-foreground">{t('forms.holidays.request.stepTitles.summaryDescription')}</p>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t('forms.holidays.request.multiStep.employee')}</Label>
                    <p className="font-medium">{user?.name || 'Non disponibile'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('forms.holidays.request.multiStep.email')}</Label>
                    <p className="font-medium">{user?.email || 'Non disponibile'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t('forms.holidays.request.multiStep.startDate')}</Label>
                    <p className="font-medium">{startDate ? format(startDate, "dd/MM/yyyy") : "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('forms.holidays.request.multiStep.endDate')}</Label>
                    <p className="font-medium">{endDate ? format(endDate, "dd/MM/yyyy") : "-"}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t('forms.holidays.request.multiStep.type')}</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getHolidayTypeLabel(holidayType)}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('forms.holidays.request.multiStep.workingDays')}</Label>
                    <p className="font-medium">{workingDays} {t('forms.holidays.request.dateLabels.days')}</p>
                  </div>
                </div>
                
                {notes && (
                  <div>
                    <Label className="text-muted-foreground">Note</Label>
                    <p className="font-medium bg-muted/50 p-2 rounded text-sm">
                      {typeof notes === 'string' ? notes : 'Nessuna nota aggiunta'}
                    </p>
                  </div>
                )}

                {holidayType === "sick" && (
                  <div>
                    <Label className="text-muted-foreground">{t('forms.holidays.request.multiStep.medicalCertRequired')}</Label>
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
                          Impegno a fornire via email entro 3 giorni lavorativi
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Modalità non specificata</p>
                    )}
                  </div>
                )}
              </div>

              {/* Final Warnings */}
              {holidayType === "vacation" && remainingDays - workingDays < 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t('forms.holidays.request.multiStep.finalWarning')}
                  </AlertDescription>
                </Alert>
              )}

              {conflictWarning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {typeof conflictWarning === 'string' ? conflictWarning : t('forms.holidays.request.multiStep.conflictWarning')}
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
            <CardTitle>{t('forms.holidays.request.modalTitle')}</CardTitle>
            <CardDescription>
              {t('forms.holidays.request.multiStep.step')} {currentStep} {t('forms.holidays.request.multiStep.of')} {STEPS.length}: {t(`forms.multiStepForm.steps.${STEPS[currentStep - 1].description}.title`)}
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
        <form 
          onSubmit={(e) => {
            // FIXED: Block all form submissions - only allow explicit button click
            e.preventDefault();
            console.log('❌ Form submit blocked - only button click allowed');
          }}
          onKeyDown={(e) => {
            // Prevent accidental form submission with Enter key
            const target = e.target as HTMLElement
            if (e.key === 'Enter' && target?.tagName !== 'TEXTAREA') {
              e.preventDefault()
            }
          }}
        >
          <CardContent className="min-h-[400px]">
            {renderStepContent()}
          </CardContent>

          <CardFooter className="flex justify-between">
            <div className="flex gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  {t('forms.holidays.request.multiStep.cancel')}
                </Button>
              )}
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('forms.holidays.request.multiStep.back')}
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
                  {t('forms.holidays.request.multiStep.next')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={async () => {
                    // Submit the request
                    setUserConfirmedSubmit(true);
                    const formData = form.getValues();
                    await handleSubmit(formData);
                  }}
                  disabled={!canProceed() || isLoading || isSubmittingRequest}
                  className="relative"
                >
                  {(isLoading || isSubmittingRequest) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Invio richiesta in corso...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t('forms.holidays.request.multiStep.submit')}
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