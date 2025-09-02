import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils/cn"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/lib/i18n/provider"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        pending: "border-omnia-accent/20 bg-omnia-accent/10 text-omnia-accent-700 hover:bg-omnia-accent/20",
        approved: "border-omnia-secondary/20 bg-omnia-secondary/10 text-omnia-secondary-700 hover:bg-omnia-secondary/20",
        rejected: "border-omnia-error/20 bg-omnia-error/10 text-omnia-error-700 hover:bg-omnia-error/20",
        cancelled: "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200",
        active: "border-omnia/20 bg-omnia/10 text-omnia-700 hover:bg-omnia/20",
        inactive: "border-gray-300 bg-gray-100 text-gray-500 hover:bg-gray-200",
      },
      size: {
        sm: "px-2 py-1 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      status: "pending",
      size: "md",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  status: "pending" | "approved" | "rejected" | "cancelled" | "active" | "inactive"
  children?: React.ReactNode
}

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ className, status, size, children, ...props }, ref) => {
    const { t } = useTranslation()
    
    const getStatusLabel = (status: string) => {
      switch (status) {
        case "pending":
          return t('forms.statusBadge.pending')
        case "approved":
          return t('forms.holidayHistory.statuses.approved')
        case "rejected":
          return t('forms.holidayHistory.statuses.rejected')
        case "cancelled":
          return t('forms.holidayHistory.statuses.cancelled')
        case "active":
          return t('forms.statusBadge.active')
        case "inactive":
          return t('forms.statusBadge.inactive')
        default:
          return status
      }
    }

    return (
      <div
        className={cn(statusBadgeVariants({ status, size }), className)}
        ref={ref}
        {...props}
      >
        {children || getStatusLabel(status)}
      </div>
    )
  }
)
StatusBadge.displayName = "StatusBadge"

export { StatusBadge, statusBadgeVariants }