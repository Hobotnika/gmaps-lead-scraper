import axios from 'axios'

const ZEROBOUNCE_API_URL = 'https://api.zerobounce.net/v2/validate'
const ZEROBOUNCE_CREDIT_URL = 'https://api.zerobounce.net/v2/getcredits'

export interface ZeroBounceResponse {
  address: string
  status: 'valid' | 'invalid' | 'catch-all' | 'unknown' | 'spamtrap' | 'abuse' | 'do_not_mail'
  sub_status: string
  free_email: boolean
  did_you_mean: string | null
  account: string | null
  domain: string | null
  domain_age_days: string | null
  smtp_provider: string | null
  mx_found: string
  mx_record: string | null
  firstname: string | null
  lastname: string | null
  gender: string | null
  country: string | null
  region: string | null
  city: string | null
  zipcode: string | null
  processed_at: string
}

export interface EmailValidationResult {
  email: string
  status: 'valid' | 'invalid' | 'catch-all' | 'unknown'
  isValid: boolean
  confidence: number
}

/**
 * Validates an email address using ZeroBounce API
 * @param email - Email address to validate
 * @returns Validation result with status and confidence
 */
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  const apiKey = process.env.ZEROBOUNCE_API_KEY

  if (!apiKey) {
    console.warn('ZEROBOUNCE_API_KEY not set, skipping validation')
    return {
      email,
      status: 'unknown',
      isValid: false,
      confidence: 0,
    }
  }

  try {
    const response = await axios.get<ZeroBounceResponse>(ZEROBOUNCE_API_URL, {
      params: {
        api_key: apiKey,
        email: email,
        ip_address: '', // Optional
      },
      timeout: 10000, // 10 second timeout
    })

    const data = response.data

    // Determine if email is valid based on status
    const isValid = data.status === 'valid'

    // Calculate confidence score (0-100)
    let confidence = 0
    if (data.status === 'valid') {
      confidence = 100
    } else if (data.status === 'catch-all') {
      confidence = 50
    } else if (data.status === 'unknown') {
      confidence = 25
    } else {
      confidence = 0
    }

    // Map status to our simplified status
    let status: 'valid' | 'invalid' | 'catch-all' | 'unknown' = 'unknown'
    if (data.status === 'valid') {
      status = 'valid'
    } else if (data.status === 'invalid' || data.status === 'spamtrap' || data.status === 'abuse' || data.status === 'do_not_mail') {
      status = 'invalid'
    } else if (data.status === 'catch-all') {
      status = 'catch-all'
    }

    console.log(`Email validation: ${email} -> ${status} (confidence: ${confidence}%)`)

    return {
      email,
      status,
      isValid,
      confidence,
    }
  } catch (error) {
    console.error('ZeroBounce API error:', error)

    // Return unknown status on error
    return {
      email,
      status: 'unknown',
      isValid: false,
      confidence: 0,
    }
  }
}

/**
 * Gets remaining ZeroBounce credits
 * @returns Number of credits remaining, or null if error
 */
export async function getRemainingCredits(): Promise<number | null> {
  const apiKey = process.env.ZEROBOUNCE_API_KEY

  if (!apiKey) {
    console.warn('ZEROBOUNCE_API_KEY not set')
    return null
  }

  try {
    const response = await axios.get<{ Credits: string }>(ZEROBOUNCE_CREDIT_URL, {
      params: {
        api_key: apiKey,
      },
      timeout: 5000,
    })

    const credits = parseInt(response.data.Credits, 10)
    console.log(`ZeroBounce credits remaining: ${credits}`)

    return credits
  } catch (error) {
    console.error('Failed to get ZeroBounce credits:', error)
    return null
  }
}

/**
 * Validates multiple emails with rate limiting
 * @param emails - Array of email addresses
 * @param delayMs - Delay between requests in milliseconds (default: 1000ms)
 * @returns Array of validation results
 */
export async function validateEmailsBatch(
  emails: string[],
  delayMs: number = 1000
): Promise<EmailValidationResult[]> {
  const results: EmailValidationResult[] = []

  for (const email of emails) {
    const result = await validateEmail(email)
    results.push(result)

    // Add delay to avoid rate limiting
    if (delayMs > 0 && emails.indexOf(email) < emails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return results
}
