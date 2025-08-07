"use client"

import * as React from "react"
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  TrendingUp,
  CalendarDays,
  Building
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/cn"

interface StatCard {
  title: string
  value: string | number
  description?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: {
    value: number
    isPositive: boolean
    label: string
  }
  variant?: "default" | "success" | "warning" | "error" | "info"
}

interface StatsCardsProps {
  stats: StatCard[]
  className?: string
}

export function StatsCards({ stats, className }: StatsCardsProps) {
  const getVariantStyles = (variant: StatCard["variant"] = "default") => {
    switch (variant) {
      case "success":
        return "border-omnia-secondary/20 bg-omnia-secondary/5"
      case "warning":
        return "border-omnia-accent/20 bg-omnia-accent/5"
      case "error":
        return "border-omnia-error/20 bg-omnia-error/5"
      case "info":
        return "border-omnia/20 bg-omnia/5"
      default:
        return ""
    }
  }

  const getIconStyles = (variant: StatCard["variant"] = "default") => {
    switch (variant) {
      case "success":
        return "text-omnia-secondary"
      case "warning":
        return "text-omnia-accent"
      case "error":
        return "text-omnia-error"
      case "info":
        return "text-omnia"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {stats.map((stat, index) => (
        <Card key={index} className={getVariantStyles(stat.variant)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={cn("h-4 w-4", getIconStyles(stat.variant))} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            )}
            {stat.trend && (
              <div className="flex items-center mt-2">
                <TrendingUp
                  className={cn(
                    "h-3 w-3 mr-1",
                    stat.trend.isPositive ? "text-omnia-secondary" : "text-omnia-error"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    stat.trend.isPositive ? "text-omnia-secondary" : "text-omnia-error"
                  )}
                >
                  {stat.trend.isPositive ? "+" : ""}{stat.trend.value}%
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  {stat.trend.label}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Predefined stat configurations for different user roles
export const getEmployeeStats = (data: {
  totalHolidays: number
  pendingRequests: number
  approvedHolidays: number
  remainingDays: number
}): StatCard[] => [
  {
    title: "Ferie Rimanenti",
    value: data.remainingDays,
    description: "giorni disponibili",
    icon: Calendar,
    variant: data.remainingDays < 5 ? "warning" : "success",
  },
  {
    title: "Richieste in Attesa",
    value: data.pendingRequests,
    description: "in corso di approvazione",
    icon: Clock,
    variant: data.pendingRequests > 0 ? "warning" : "default",
  },
  {
    title: "Ferie Approvate",
    value: data.approvedHolidays,
    description: "quest'anno",
    icon: CheckCircle,
    variant: "success",
  },
  {
    title: "Totale Richieste",
    value: data.totalHolidays,
    description: "inviate finora",
    icon: CalendarDays,
    variant: "info",
  },
]

export const getAdminStats = (data: {
  totalEmployees: number
  pendingRequests: number
  approvedThisMonth: number
  activeEmployees: number
  trend?: {
    requests: number
    employees: number
  }
}): StatCard[] => [
  {
    title: "Dipendenti Attivi",
    value: data.activeEmployees,
    description: `di ${data.totalEmployees} totali`,
    icon: Users,
    variant: "info",
    trend: data.trend ? {
      value: data.trend.employees,
      isPositive: data.trend.employees >= 0,
      label: "vs mese scorso"
    } : undefined,
  },
  {
    title: "Richieste Pendenti",
    value: data.pendingRequests,
    description: "da approvare",
    icon: Clock,
    variant: data.pendingRequests > 10 ? "error" : data.pendingRequests > 5 ? "warning" : "success",
  },
  {
    title: "Approvate Questo Mese",
    value: data.approvedThisMonth,
    description: "richieste elaborate",
    icon: CheckCircle,
    variant: "success",
    trend: data.trend ? {
      value: data.trend.requests,
      isPositive: true,
      label: "vs mese scorso"
    } : undefined,
  },
  {
    title: "Dipartimenti",
    value: "5", // This would come from props
    description: "attivi",
    icon: Building,
    variant: "default",
  },
]