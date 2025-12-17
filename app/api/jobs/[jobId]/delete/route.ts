import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

/**
 * DELETE /api/jobs/[jobId]/delete
 * Deletes a scrape job and all associated leads
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params

    // Validate jobId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if job exists and get lead count
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Get lead count for logging
    const { count: leadCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', jobId)

    // Delete the job (CASCADE will delete associated leads)
    const { error: deleteError } = await supabase
      .from('scrape_jobs')
      .delete()
      .eq('id', jobId)

    if (deleteError) {
      console.error('Failed to delete job:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete job' },
        { status: 500 }
      )
    }

    console.log(`Deleted job ${jobId} and ${leadCount || 0} associated leads`)

    return NextResponse.json({
      success: true,
      message: `Deleted job and ${leadCount || 0} leads`,
      deletedLeads: leadCount || 0,
    })
  } catch (error) {
    console.error('Unexpected error deleting job:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
