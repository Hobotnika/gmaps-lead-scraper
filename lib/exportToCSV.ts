import type { Lead } from '@/types'

interface JobDetails {
  keyword: string
  location: string
}

/**
 * Escapes special characters in CSV fields
 * Wraps fields containing commas, quotes, or newlines in double quotes
 * Escapes existing quotes by doubling them
 */
function escapeCSVField(field: string | null | undefined): string {
  if (field === null || field === undefined) {
    return ''
  }

  const stringValue = String(field)

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Generates a filename for the CSV export
 * Pattern: leads_{keyword}_{location}_{YYYY-MM-DD}.csv
 * Example: leads_coffee-shops_san-francisco_2024-12-15.csv
 */
function generateFilename(jobDetails: JobDetails): string {
  const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

  // Clean and format keyword and location
  const cleanKeyword = jobDetails.keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen

  const cleanLocation = jobDetails.location
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  return `leads_${cleanKeyword}_${cleanLocation}_${date}.csv`
}

/**
 * Converts an array of leads to CSV format and triggers download
 * @param leads - Array of lead objects to export
 * @param jobDetails - Job details containing keyword and location for filename
 */
export function exportLeadsToCSV(leads: Lead[], jobDetails: JobDetails): void {
  if (!leads || leads.length === 0) {
    throw new Error('No leads to export')
  }

  // Define CSV headers (user-friendly names)
  const headers = [
    'Business Name',
    'Address',
    'Phone',
    'Website',
    'Email',
    'Rating',
    'Reviews',
    'Category',
    'Date Scraped',
  ]

  // Create CSV rows
  const rows = leads.map((lead) => {
    // Format email to lowercase
    const email = lead.email ? lead.email.toLowerCase() : ''

    // Format rating (remove trailing zeros)
    const rating = lead.rating ? Number(lead.rating).toString() : ''

    // Format review count (just the number)
    const reviews = lead.reviewCount ? String(lead.reviewCount) : ''

    // Get current date for "Date Scraped" column
    const dateScrapped = new Date().toISOString().split('T')[0]

    return [
      escapeCSVField(lead.businessName),
      escapeCSVField(lead.address),
      escapeCSVField(lead.phone),
      escapeCSVField(lead.website),
      escapeCSVField(email),
      escapeCSVField(rating),
      escapeCSVField(reviews),
      escapeCSVField(lead.category),
      escapeCSVField(dateScrapped),
    ].join(',')
  })

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n')

  // Create Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', generateFilename(jobDetails))
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
