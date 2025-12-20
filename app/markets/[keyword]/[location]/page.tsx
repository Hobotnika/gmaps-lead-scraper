'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Loader2, Eye, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LeadsTable } from '@/components/LeadsTable'
import { StatsCards } from '@/components/StatsCards'
import type { Lead, LeadStats, Job } from '@/types'

interface PageProps {
  params: Promise<{ keyword: string; location: string }>
}

interface MarketData {
  market: {
    keyword: string
    location: string
    scrapeCount: number
    latestScrape: string
    jobIds: string[]
  }
  jobs: Job[]
  leads: Lead[]
  stats: LeadStats
}

export default function MarketDetailPage({ params }: PageProps) {
  const router = useRouter()
  const [slugs, setSlugs] = useState<{ keyword: string; location: string } | null>(null)
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFindingContacts, setIsFindingContacts] = useState(false)
  const [contactDiscoveryStatus, setContactDiscoveryStatus] = useState<string | null>(null)

  useEffect(() => {
    params.then((p) => {
      setSlugs(p)
    })
  }, [params])

  useEffect(() => {
    if (slugs) {
      fetchMarketDetails()
    }
  }, [slugs])

  const fetchMarketDetails = async () => {
    if (!slugs) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/markets/${slugs.keyword}/${slugs.location}`)

      if (!response.ok) {
        throw new Error('Failed to fetch market details')
      }

      const data = await response.json()
      setMarketData(data)
    } catch (err) {
      console.error('Error fetching market details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load market details')
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

  const handleExportCSV = async () => {
    if (!marketData || !slugs) return

    try {
      const response = await fetch(`/api/markets/${slugs.keyword}/${slugs.location}/export`)

      if (!response.ok) {
        throw new Error('Failed to export CSV')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `market_${slugs.keyword}_${slugs.location}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to export CSV:', err)
      alert('Failed to export CSV. Please try again.')
    }
  }

  const handleFindContacts = async () => {
    if (!slugs) return

    setIsFindingContacts(true)
    setContactDiscoveryStatus('Starting contact discovery...')
    setError(null)

    try {
      console.log(`Starting contact discovery for market: ${marketData?.market.keyword} in ${marketData?.market.location}`)

      const response = await fetch(`/api/markets/${slugs.keyword}/${slugs.location}/find-contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to find contacts')
      }

      const result = await response.json()
      console.log('Contact discovery result:', result)

      // Show success message
      setContactDiscoveryStatus(
        `Found ${result.totalContactsFound} decision makers across ${result.jobsProcessed} scrapes!`
      )

      // Refresh market data to show new contacts
      console.log('Refreshing market data...')
      await fetchMarketDetails()

      // Clear success message after 7 seconds
      setTimeout(() => {
        setContactDiscoveryStatus(null)
      }, 7000)
    } catch (err) {
      console.error('Error finding contacts:', err)
      setError(err instanceof Error ? err.message : 'Failed to find contacts')
      setContactDiscoveryStatus(null)
    } finally {
      setIsFindingContacts(false)
    }
  }

  const getLeadsWithoutContacts = () => {
    if (!marketData) return 0
    return marketData.leads.filter(lead => !lead.contacts || lead.contacts.length === 0).length
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

  if (error || !marketData) {
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
                Market Not Found
              </h2>
              <p className="text-gray-600 mb-6">{error || 'This market does not exist'}</p>
              <Button onClick={() => router.push('/markets')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Markets
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
              onClick={() => router.push('/markets')}
              className="text-white hover:bg-white/20 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Markets
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {marketData.market.keyword}
            </h1>
            <p className="text-blue-100">{marketData.market.location}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Market Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Scrapes</div>
                <div className="font-medium text-gray-900">
                  {marketData.market.scrapeCount}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Last Scraped</div>
                <div className="font-medium text-gray-900">
                  {formatDate(marketData.market.latestScrape)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Leads</div>
                <div className="font-medium text-gray-900">
                  {marketData.stats.totalLeads}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <StatsCards stats={marketData.stats} isLoading={false} />

          {/* Individual Scrapes */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Individual Scrapes ({marketData.jobs.length})
            </h2>
            <div className="space-y-3">
              {marketData.jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(job.created_at)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Max results: {job.max_results}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/history/${job.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Discovery Status */}
          {contactDiscoveryStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">{contactDiscoveryStatus}</p>
            </div>
          )}

          {/* Action Buttons */}
          {marketData.leads.length > 0 && (
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleFindContacts}
                variant="default"
                disabled={isFindingContacts || getLeadsWithoutContacts() === 0}
              >
                <Users className="h-4 w-4 mr-2" />
                {isFindingContacts
                  ? 'Finding Decision Makers...'
                  : `Find Decision Makers${getLeadsWithoutContacts() > 0 ? ` (${getLeadsWithoutContacts()} leads)` : ''}`}
              </Button>
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export All Leads to CSV
              </Button>
            </div>
          )}

          {/* Leads Table */}
          <LeadsTable leads={marketData.leads} isLoading={false} />
        </div>
      </div>
    </div>
  )
}
