import type { JobFormData, WorkMode } from '@/types'

/**
 * Validation errors for job form data
 */
export interface ValidationError {
  field: string
  message: string
}

/**
 * Comprehensive validation for job form data
 * Runs on client and server to catch errors early
 */
export const jobValidation = {
  /**
   * Validate company name
   */
  validateCompany(value: string): ValidationError | null {
    if (!value || typeof value !== 'string') {
      return { field: 'company', message: 'Company is required' }
    }
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return { field: 'company', message: 'Company cannot be empty' }
    }
    if (trimmed.length > 255) {
      return { field: 'company', message: 'Company name must be 255 characters or less' }
    }
    return null
  },

  /**
   * Validate role/job title
   */
  validateRole(value: string): ValidationError | null {
    if (!value || typeof value !== 'string') {
      return { field: 'role', message: 'Role is required' }
    }
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return { field: 'role', message: 'Role cannot be empty' }
    }
    if (trimmed.length > 255) {
      return { field: 'role', message: 'Role must be 255 characters or less' }
    }
    return null
  },

  /**
   * Validate salary minimum
   */
  validateSalaryMin(value: number | null | undefined): ValidationError | null {
    if (value === null || value === undefined) return null

    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return { field: 'salary_min', message: 'Salary minimum must be an integer' }
    }

    if (value < 0) {
      return { field: 'salary_min', message: 'Salary minimum cannot be negative' }
    }

    // Check for reasonable upper bound (10 million)
    if (value > 10_000_000) {
      return { field: 'salary_min', message: 'Salary minimum seems unreasonably high' }
    }

    return null
  },

  /**
   * Validate salary maximum
   */
  validateSalaryMax(value: number | null | undefined): ValidationError | null {
    if (value === null || value === undefined) return null

    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return { field: 'salary_max', message: 'Salary maximum must be an integer' }
    }

    if (value < 0) {
      return { field: 'salary_max', message: 'Salary maximum cannot be negative' }
    }

    // Check for reasonable upper bound (10 million)
    if (value > 10_000_000) {
      return { field: 'salary_max', message: 'Salary maximum seems unreasonably high' }
    }

    return null
  },

  /**
   * Validate salary range (min <= max)
   */
  validateSalaryRange(min: number | null | undefined, max: number | null | undefined): ValidationError | null {
    // Both null/undefined is valid
    if ((min === null || min === undefined) && (max === null || max === undefined)) {
      return null
    }

    // If one is set, other should be too
    if ((min === null || min === undefined) && (max !== null && max !== undefined)) {
      return { field: 'salary_min', message: 'If salary maximum is set, minimum must also be set' }
    }

    if ((min !== null && min !== undefined) && (max === null || max === undefined)) {
      return { field: 'salary_max', message: 'If salary minimum is set, maximum must also be set' }
    }

    // Check min <= max
    if (typeof min === 'number' && typeof max === 'number' && min > max) {
      return { field: 'salary_min', message: 'Salary minimum cannot exceed maximum' }
    }

    return null
  },

  /**
   * Validate work mode enum
   */
  validateWorkMode(value: WorkMode | null | undefined): ValidationError | null {
    if (value === null || value === undefined) return null

    const validModes: WorkMode[] = ['remote', 'hybrid', 'onsite']
    if (!validModes.includes(value)) {
      return {
        field: 'work_mode',
        message: `Work mode must be one of: ${validModes.join(', ')}`,
      }
    }

    return null
  },

  /**
   * Validate URL format (basic check)
   */
  validateUrl(value: string | null | undefined): ValidationError | null {
    if (value === null || value === undefined || value === '') return null

    if (typeof value !== 'string') {
      return { field: 'url', message: 'URL must be a string' }
    }

    // Allow protocol-relative URLs and standard URLs
    const urlPattern = /^(https?:\/\/|\/\/)[^\s]+$/
    if (!urlPattern.test(value.trim())) {
      return { field: 'url', message: 'URL must be a valid HTTP(S) URL' }
    }

    if (value.length > 2048) {
      return { field: 'url', message: 'URL must be 2048 characters or less' }
    }

    return null
  },

  /**
   * Validate date format (ISO 8601: YYYY-MM-DD)
   */
  validateDateApplied(value: string | null | undefined): ValidationError | null {
    if (value === null || value === undefined || value === '') return null

    if (typeof value !== 'string') {
      return { field: 'date_applied', message: 'Date applied must be a string' }
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(value)) {
      return { field: 'date_applied', message: 'Date must be in YYYY-MM-DD format' }
    }

    const date = new Date(value + 'T00:00:00Z')
    if (Number.isNaN(date.getTime())) {
      return { field: 'date_applied', message: 'Invalid date' }
    }

    // Check that date is not in the future (allow today)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    if (date > today) {
      return { field: 'date_applied', message: 'Date applied cannot be in the future' }
    }

    return null
  },

  /**
   * Validate email format
   */
  validateEmail(value: string | null | undefined): ValidationError | null {
    if (value === null || value === undefined || value === '') return null

    if (typeof value !== 'string') {
      return { field: 'contact_email', message: 'Email must be a string' }
    }

    // Basic email validation (RFC 5322 simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) {
      return { field: 'contact_email', message: 'Invalid email format' }
    }

    if (value.length > 254) {
      return { field: 'contact_email', message: 'Email must be 254 characters or less' }
    }

    return null
  },

  /**
   * Validate LinkedIn URL
   */
  validateLinkedInUrl(value: string | null | undefined): ValidationError | null {
    if (value === null || value === undefined || value === '') return null

    if (typeof value !== 'string') {
      return { field: 'contact_linkedin', message: 'LinkedIn URL must be a string' }
    }

    const trimmed = value.trim()
    if (!trimmed.includes('linkedin.com')) {
      return { field: 'contact_linkedin', message: 'URL must be a LinkedIn profile or company URL' }
    }

    return this.validateUrl(trimmed)
  },

  /**
   * Validate contact name
   */
  validateContactName(value: string | null | undefined): ValidationError | null {
    if (value === null || value === undefined || value === '') return null

    if (typeof value !== 'string') {
      return { field: 'contact_name', message: 'Contact name must be a string' }
    }

    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return null // Empty after trim is OK
    }

    if (trimmed.length > 255) {
      return { field: 'contact_name', message: 'Contact name must be 255 characters or less' }
    }

    return null
  },

  /**
   * Validate text field (notes, location, etc)
   */
  validateTextField(value: string | null | undefined, fieldName: string, maxLength = 5000): ValidationError | null {
    if (value === null || value === undefined || value === '') return null

    if (typeof value !== 'string') {
      return { field: fieldName, message: `${fieldName} must be a string` }
    }

    if (value.length > maxLength) {
      return { field: fieldName, message: `${fieldName} must be ${maxLength} characters or less` }
    }

    return null
  },

  /**
   * Validate tags array
   */
  validateTags(value: string[] | null | undefined): ValidationError | null {
    if (value === null || value === undefined) return null

    if (!Array.isArray(value)) {
      return { field: 'tags', message: 'Tags must be an array' }
    }

    if (value.length > 50) {
      return { field: 'tags', message: 'Maximum 50 tags allowed' }
    }

    for (let i = 0; i < value.length; i++) {
      const tag = value[i]
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        return { field: 'tags', message: 'Tags must be non-empty strings' }
      }
      if (tag.length > 50) {
        return { field: 'tags', message: 'Each tag must be 50 characters or less' }
      }
    }

    return null
  },

  /**
   * Validate entire job form data
   * Returns array of all validation errors found
   */
  validateJobFormData(data: JobFormData): ValidationError[] {
    const errors: ValidationError[] = []

    // Required fields
    const companyErr = this.validateCompany(data.company)
    if (companyErr) errors.push(companyErr)

    const roleErr = this.validateRole(data.role)
    if (roleErr) errors.push(roleErr)

    // Optional fields
    const salaryMinErr = this.validateSalaryMin(data.salary_min)
    if (salaryMinErr) errors.push(salaryMinErr)

    const salaryMaxErr = this.validateSalaryMax(data.salary_max)
    if (salaryMaxErr) errors.push(salaryMaxErr)

    const salaryRangeErr = this.validateSalaryRange(data.salary_min, data.salary_max)
    if (salaryRangeErr) errors.push(salaryRangeErr)

    const workModeErr = this.validateWorkMode(data.work_mode)
    if (workModeErr) errors.push(workModeErr)

    const urlErr = this.validateUrl(data.url)
    if (urlErr) errors.push(urlErr)

    const dateErr = this.validateDateApplied(data.date_applied)
    if (dateErr) errors.push(dateErr)

    const emailErr = this.validateEmail(data.contact_email)
    if (emailErr) errors.push(emailErr)

    const linkedInErr = this.validateLinkedInUrl(data.contact_linkedin)
    if (linkedInErr) errors.push(linkedInErr)

    const contactNameErr = this.validateContactName(data.contact_name)
    if (contactNameErr) errors.push(contactNameErr)

    const notesErr = this.validateTextField(data.notes, 'notes')
    if (notesErr) errors.push(notesErr)

    const locationErr = this.validateTextField(data.location, 'location', 255)
    if (locationErr) errors.push(locationErr)

    const sourceErr = this.validateTextField(data.source, 'source', 100)
    if (sourceErr) errors.push(sourceErr)

    const contactNotesErr = this.validateTextField(data.contact_notes, 'contact_notes')
    if (contactNotesErr) errors.push(contactNotesErr)

    const tagsErr = this.validateTags(data.tags)
    if (tagsErr) errors.push(tagsErr)

    const techStackErr = this.validateTags(data.tech_stack)
    if (techStackErr) {
      errors.push({ ...techStackErr, field: 'tech_stack' })
    }

    return errors
  },
}

/**
 * Throw validation error if any issues found
 */
export function assertJobFormDataValid(data: JobFormData): void {
  const errors = jobValidation.validateJobFormData(data)
  if (errors.length > 0) {
    const message = errors.map((e) => `${e.field}: ${e.message}`).join('; ')
    const error = new Error(message)
    ;(error as any).validationErrors = errors
    throw error
  }
}
