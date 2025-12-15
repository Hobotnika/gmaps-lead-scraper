// Form data types
export interface SearchFormData {
  keyword: string
  location: string
  maxResults: number
}

// Lead data types
export interface Lead {
  id: string
  businessName: string
  address: string | null
  phone: string | null
  website: string | null
  email: string | null
  rating: number | null
  reviewCount: number | null
  category: string | null
}

// Stats types
export interface LeadStats {
  totalLeads: number
  leadsWithWebsites: number
  leadsWithEmails: number
}

// Sample data for testing
export const SAMPLE_LEADS: Lead[] = [
  {
    id: '1',
    businessName: 'Bella Vista Wedding Planning',
    address: '123 Main St, New York, NY 10001',
    phone: '+1 (212) 555-0123',
    website: 'https://bellavistaplanning.com',
    email: 'info@bellavistaplanning.com',
    rating: 4.8,
    reviewCount: 127,
    category: 'Wedding Planner'
  },
  {
    id: '2',
    businessName: 'Elegant Events Co.',
    address: '456 Park Ave, New York, NY 10022',
    phone: '+1 (212) 555-0456',
    website: 'https://elegantevents.co',
    email: null,
    rating: 4.6,
    reviewCount: 89,
    category: 'Wedding Planner'
  },
  {
    id: '3',
    businessName: 'Dream Day Weddings',
    address: '789 Broadway, New York, NY 10003',
    phone: '+1 (212) 555-0789',
    website: null,
    email: 'hello@dreamdayweddings.com',
    rating: 4.9,
    reviewCount: 203,
    category: 'Wedding Planner'
  },
  {
    id: '4',
    businessName: 'Forever After Planning',
    address: '321 5th Ave, New York, NY 10016',
    phone: '+1 (212) 555-0321',
    website: 'https://foreverafterplanning.com',
    email: 'contact@foreverafter.com',
    rating: 4.7,
    reviewCount: 156,
    category: 'Wedding Planner'
  },
  {
    id: '5',
    businessName: 'Blissful Moments',
    address: '654 Madison Ave, New York, NY 10065',
    phone: null,
    website: 'https://blissfulmoments.nyc',
    email: 'info@blissfulmoments.nyc',
    rating: 4.5,
    reviewCount: 67,
    category: 'Wedding Planner'
  },
  {
    id: '6',
    businessName: 'Royal Wedding Services',
    address: '987 Lexington Ave, New York, NY 10075',
    phone: '+1 (212) 555-0987',
    website: 'https://royalweddingservices.com',
    email: null,
    rating: 4.8,
    reviewCount: 142,
    category: 'Wedding Planner'
  },
  {
    id: '7',
    businessName: 'Perfect Day Planners',
    address: '147 Columbus Ave, New York, NY 10023',
    phone: '+1 (212) 555-0147',
    website: null,
    email: null,
    rating: 4.4,
    reviewCount: 45,
    category: 'Wedding Planner'
  },
  {
    id: '8',
    businessName: 'Enchanted Weddings NYC',
    address: '258 Amsterdam Ave, New York, NY 10023',
    phone: '+1 (212) 555-0258',
    website: 'https://enchantedweddingsnyc.com',
    email: 'events@enchantedweddings.com',
    rating: 5.0,
    reviewCount: 312,
    category: 'Wedding Planner'
  }
]
