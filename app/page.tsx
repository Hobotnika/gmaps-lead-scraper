'use client'

import { useState } from 'react'
import { SearchForm } from '@/components/SearchForm'
import { LeadsTable } from '@/components/LeadsTable'
import { StatsCards } from '@/components/StatsCards'
import type { SearchFormData, Lead, LeadStats } from '@/types'
import { SAMPLE_LEADS } from '@/types'

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const stats: LeadStats = {
    totalLeads: leads.length,
    leadsWithWebsites: leads.filter((lead) => lead.website).length,
    leadsWithEmails: leads.filter((lead) => lead.email).length,
  }

  const handleSearch = async (data: SearchFormData) => {
    console.log('Search form submitted:', data)

    setIsLoading(true)
    setHasSearched(true)

    // Simulate API call with delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Use sample data for now
    setLeads(SAMPLE_LEADS)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 animate-fade-in">
              Google Maps Lead Scraper
            </h1>
            <p className="text-lg md:text-xl text-blue-100 animate-fade-in-delay">
              Extract business contacts from Google Maps in seconds
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Search Form */}
        <div className="mb-12">
          <SearchForm onSubmit={handleSearch} isLoading={isLoading} />
        </div>

        {/* Results Section */}
        {hasSearched && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Cards */}
            <StatsCards stats={stats} isLoading={isLoading} />

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
