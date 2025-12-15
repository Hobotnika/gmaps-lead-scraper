'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SearchFormData } from '@/types'

interface SearchFormProps {
  onSubmit: (data: SearchFormData) => void
  isLoading?: boolean
}

export function SearchForm({ onSubmit, isLoading = false }: SearchFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchFormData>({
    defaultValues: {
      keyword: '',
      location: '',
      maxResults: 100,
    },
  })

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Search Parameters</CardTitle>
        <CardDescription>
          Enter your search criteria to find business leads on Google Maps
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="keyword">Keyword</Label>
            <Input
              id="keyword"
              placeholder="e.g., Wedding Planners, Dentists, Restaurants"
              {...register('keyword', {
                required: 'Keyword is required',
                minLength: {
                  value: 2,
                  message: 'Keyword must be at least 2 characters',
                },
              })}
              disabled={isLoading}
              className={errors.keyword ? 'border-red-500' : ''}
            />
            {errors.keyword && (
              <p className="text-sm text-red-500">{errors.keyword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., New York, London, Mumbai"
              {...register('location', {
                required: 'Location is required',
                minLength: {
                  value: 2,
                  message: 'Location must be at least 2 characters',
                },
              })}
              disabled={isLoading}
              className={errors.location ? 'border-red-500' : ''}
            />
            {errors.location && (
              <p className="text-sm text-red-500">{errors.location.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxResults">Maximum Results</Label>
            <Input
              id="maxResults"
              type="number"
              placeholder="100"
              {...register('maxResults', {
                required: 'Maximum results is required',
                min: {
                  value: 10,
                  message: 'Minimum is 10 results',
                },
                max: {
                  value: 500,
                  message: 'Maximum is 500 results',
                },
                valueAsNumber: true,
              })}
              disabled={isLoading}
              className={errors.maxResults ? 'border-red-500' : ''}
            />
            {errors.maxResults && (
              <p className="text-sm text-red-500">{errors.maxResults.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter a value between 10 and 500
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              'Start Scraping'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
