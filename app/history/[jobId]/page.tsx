'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LeadsTable } from '@/components/LeadsTable'
import { StatsCards } from '@/components/StatsCards'
import { exportLeadsToCSV } from '@/lib/exportToCSV'
import type { JobWithLeads, Lead, LeadStats } from '@/types'

interface PageProps {
  params: Promise<{ jobId: string }>
}

export default function JobDetailPage({ params }: PageProps) {
  const router = useRouter()
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobData, setJobData] = useState<JobWithLeads | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then((p) => {
      setJobId(p.jobId)
    })
  }, [params])

  useEffect(() => {
    if (jobId) {
      fetchJobDetails()
    }
  }, [jobId])

  const fetchJobDetails = async () => {
    if (!jobId) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/jobs/${jobId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch job details')
      }

      const data = await response.json()
      setJobData(data)
    } catch (err) {
      console.error('Error fetching job details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load job details')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  }

  const calculateProcessingTime = (createdAt: string, completedAt: string | null) => {
    if (!completedAt) return 'N/A'

    const start = new Date(createdAt).getTime()
    const end = new Date(completedAt).getTime()
    const seconds = Math.round((end - start) / 1000)

    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      running: 'bg-blue-100 text-blue-800 border-blue-200',
    }

    return (
      <span
        className={`px-3 py-1 text-sm font-medium rounded-full border ${
          styles[status as keyof typeof styles] || styles.pending
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const handleExportCSV = () => {
    if (!jobData || jobData.leads.length === 0) return

    try {
      exportLeadsToCSV(jobData.leads, {
        keyword: jobData.job.search_query,
        location: jobData.job.location,
      })
    } catch (err) {
      console.error('Failed to export CSV:', err)
      alert('Failed to export CSV. Please try again.')
    }
  }

  const handleRunAgain = () => {
    if (!jobData) return

    // Navigate to home page with query params to pre-fill form
    const searchParams = new URLSearchParams({
      keyword: jobData.job.search_query,
      location: jobData.job.location,
      maxResults: String(jobData.job.max_results),
    })

    router.push(`/?${searchParams.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !jobData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
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
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Job Not Found
              </h2>
              <p className="text-gray-600 mb-6">{error || 'This job does not exist'}</p>
              <Button onClick={() => router.push('/history')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to History
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => router.push('/history')}
              className="text-white hover:bg-white/20 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to History
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Scrape Results</h1>
            <p className="text-blue-100">
              {jobData.job.search_query} in {jobData.job.location}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Job Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-gray-500 mb-1">Search Query</div>
                <div className="font-medium text-gray-900">
                  {jobData.job.search_query} in {jobData.job.location}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Date Scraped</div>
                <div className="font-medium text-gray-900">
                  {formatDate(jobData.job.created_at)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Processing Time</div>
                <div className="font-medium text-gray-900">
                  {calculateProcessingTime(
                    jobData.job.created_at,
                    jobData.job.completed_at
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Status</div>
                <div>{getStatusBadge(jobData.job.status)}</div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <Button variant="outline" onClick={handleRunAgain}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run This Search Again
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <StatsCards stats={jobData.stats} isLoading={false} />

          {/* Export Button */}
          {jobData.leads.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export to CSV
              </Button>
            </div>
          )}

          {/* Leads Table */}
          <LeadsTable leads={jobData.leads} isLoading={false} />
        </div>
      </div>
    </div>
  )
}
