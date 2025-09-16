import crypto from 'crypto'

// Privacy utilities for GDPR compliance
export class PrivacyUtils {
  /**
   * Hash sensitive data (email, IDs) for privacy-safe analytics
   */
  static hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)
  }

  /**
   * Create anonymous user ID from employee data
   */
  static createAnonymousUserId(email: string, employeeId?: string): string {
    const baseData = employeeId || email
    return `emp_${this.hashData(baseData)}`
  }

  /**
   * Sanitize user properties for analytics
   */
  static sanitizeUserProperties(user: any) {
    if (!user) return {}

    return {
      user_id: this.createAnonymousUserId(user.email, user.id),
      role: user.role || 'employee',
      department: user.department ? this.hashData(user.department) : undefined,
      language: user.preferredLanguage || 'it',
      // Don't include: email, name, real department names
    }
  }

  /**
   * Check if analytics is enabled and compliant
   */
  static isAnalyticsEnabled(): boolean {
    // Check environment variable
    const enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true'

    // Check if in browser environment
    const isBrowser = typeof window !== 'undefined'

    // Check if in development (temporarily enable for testing)
    const isDev = process.env.NODE_ENV === 'development'

    // Disable in development for privacy (enable only in production/staging)
    return enabled && isBrowser && !isDev
  }

  /**
   * Sanitize event properties to remove sensitive data
   */
  static sanitizeEventProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized = { ...properties }

    // Remove or hash sensitive fields
    if (sanitized.email) {
      sanitized.email_hash = this.hashData(sanitized.email)
      delete sanitized.email
    }

    if (sanitized.employeeId) {
      sanitized.employee_hash = this.hashData(sanitized.employeeId.toString())
      delete sanitized.employeeId
    }

    return sanitized
  }
}