'use client'

import { useState } from 'react'
import { Download, Users } from 'lucide-react'
import { SearchForm } from '@/components/SearchForm'
import { LeadsTable } from '@/components/LeadsTable'
import { StatsCards } from '@/components/StatsCards'
import { Button } from '@/components/ui/button'
import { exportLeadsToCSV } from '@/lib/exportToCSV'
import type { SearchFormData, Lead, LeadStats, ScrapeJobResponse, JobWithLeads, ContactDiscoveryResponse } from '@/types'

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobDetails, setJobDetails] = useState<{ keyword: string; location: string } | null>(null)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [isFindingContacts, setIsFindingContacts] = useState(false)
  const [contactDiscoveryStatus, setContactDiscoveryStatus] = useState<string | null>(null)
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null)

  const stats: LeadStats = {
    totalLeads: leads.length,
    leadsWithWebsites: leads.filter((lead) => lead.website).length,
    leadsWithEmails: leads.filter((lead) => lead.email).length,
    leadsWithContacts: leads.filter((lead) => lead.contacts && lead.contacts.length > 0).length,
  }

  const handleSearch = async (data: SearchFormData) => {
    console.log('Search form submitted:', data)

    setIsLoading(true)
    setHasSearched(true)
    setError(null)
    setLeads([])
    setJobDetails({ keyword: data.keyword, location: data.location })

    try {
      // Call scrape API
      console.log('Calling scrape API...')
      const scrapeResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: data.keyword,
          location: data.location,
          maxResults: data.maxResults,
        }),
      })

      if (!scrapeResponse.ok) {
        const errorData = await scrapeResponse.json()
        throw new Error(errorData.error || 'Failed to start scraping')
      }

      const scrapeResult: ScrapeJobResponse = await scrapeResponse.json()
      console.log('Scrape job created:', scrapeResult)

      // Store job ID and spreadsheet URL for later use
      setCurrentJobId(scrapeResult.jobId)
      if (scrapeResult.spreadsheetUrl) {
        setSpreadsheetUrl(scrapeResult.spreadsheetUrl)
        console.log('Google Sheets URL:', scrapeResult.spreadsheetUrl)
      }

      // Fetch job results
      console.log('Fetching job results...')
      const jobResponse = await fetch(`/api/jobs/${scrapeResult.jobId}`)

      if (!jobResponse.ok) {
        throw new Error('Failed to fetch job results')
      }

      const jobData: JobWithLeads = await jobResponse.json()
      console.log('Job data received:', jobData)

      // Update state with results
      setLeads(jobData.leads)
      console.log(`Displaying ${jobData.leads.length} leads`)
    } catch (err) {
      console.error('Error during scraping:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (leads.length === 0 || !jobDetails) {
      console.error('No leads to export or missing job details')
      return
    }

    try {
      exportLeadsToCSV(leads, jobDetails)
      console.log('CSV export successful')
    } catch (err) {
      console.error('Failed to export CSV:', err)
      setError(err instanceof Error ? err.message : 'Failed to export CSV')
    }
  }

  const handleFindContacts = async () => {
    if (!currentJobId) {
      console.error('No job ID available')
      return
    }

    setIsFindingContacts(true)
    setContactDiscoveryStatus('Finding decision makers...')
    setError(null)

    try {
      console.log('Starting contact discovery for job:', currentJobId)
      const response = await fetch('/api/find-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId: currentJobId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to find contacts')
      }

      const result: ContactDiscoveryResponse = await response.json()
      console.log('Contact discovery result:', result)

      // Show success message with Firecrawl warning if applicable
      if (result.firecrawlCreditsExhausted) {
        setContactDiscoveryStatus(
          `⚠️ Found ${result.contactsFound} decision makers from Google search only. Firecrawl credits exhausted - team page scraping skipped this month.`
        )
      } else {
        setContactDiscoveryStatus(
          `Found ${result.contactsFound} decision makers from ${result.leadsProcessed} businesses!`
        )
      }

      // Refresh leads to show new contacts
      console.log('Refreshing job data...')
      const jobResponse = await fetch(`/api/jobs/${currentJobId}`)

      if (jobResponse.ok) {
        const jobData: JobWithLeads = await jobResponse.json()
        console.log('Refreshed leads:', jobData.leads.map(l => ({
          name: l.businessName,
          contactCount: l.contacts?.length || 0,
          hasContacts: !!l.contacts && l.contacts.length > 0
        })))
        setLeads(jobData.leads)
        console.log(`Leads refreshed: ${jobData.leads.length} total, ${jobData.leads.filter(l => l.contacts && l.contacts.length > 0).length} with contacts`)
      }

      // Clear success message after 5 seconds
      setTimeout(() => {
        setContactDiscoveryStatus(null)
      }, 5000)
    } catch (err) {
      console.error('Error finding contacts:', err)
      setError(err instanceof Error ? err.message : 'Failed to find contacts')
      setContactDiscoveryStatus(null)
    } finally {
      setIsFindingContacts(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Search Form */}
        <div className="mb-12">
          <SearchForm onSubmit={handleSearch} isLoading={isLoading} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-600 mt-0.5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {contactDiscoveryStatus && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-green-600 mt-0.5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <p className="text-sm text-green-700 mt-1">{contactDiscoveryStatus}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {hasSearched && !error && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Cards */}
            <StatsCards stats={stats} isLoading={isLoading} />

            {/* Google Sheets Link */}
            {spreadsheetUrl && !isLoading && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">✅ Exported to Google Sheets CRM</p>
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:text-green-700 hover:underline"
                    >
                      Open spreadsheet →
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {leads.length > 0 && !isLoading && (
              <div className="flex justify-end gap-3">
                <Button
                  onClick={handleFindContacts}
                  variant="default"
                  className="gap-2"
                  disabled={isFindingContacts || !currentJobId}
                >
                  <Users className="h-4 w-4" />
                  {isFindingContacts ? 'Finding Decision Makers...' : 'Find Decision Makers'}
                </Button>
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export to CSV
                </Button>
              </div>
            )}

            {/* Leads Table */}
            <LeadsTable leads={leads} isLoading={isLoading} />
          </div>
        )}

        {/* Initial State - Feature Cards */}
        {!hasSearched && (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-12">
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Search</h3>
              <p className="text-sm text-gray-600">
                Search for any business type in any location worldwide
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Email Discovery</h3>
              <p className="text-sm text-gray-600">
                Automatically find email addresses for each business
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Export Ready</h3>
              <p className="text-sm text-gray-600">
                Download your leads as CSV for easy integration
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
