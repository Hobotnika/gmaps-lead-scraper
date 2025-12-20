'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, History, BarChart3 } from 'lucide-react'

export function Navigation() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(path)
  }

  const linkClass = (path: string) => {
    const baseClass = 'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors'
    return isActive(path)
      ? `${baseClass} bg-white/20 text-white`
      : `${baseClass} text-white/80 hover:bg-white/10 hover:text-white`
  }

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-purple-600 border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-1">
            <Link href="/" className={linkClass('/')}>
              <Search className="h-4 w-4" />
              New Search
            </Link>
            <Link href="/history" className={linkClass('/history')}>
              <History className="h-4 w-4" />
              History
            </Link>
            <Link href="/markets" className={linkClass('/markets')}>
              <BarChart3 className="h-4 w-4" />
              Markets
            </Link>
          </div>

          <div className="text-white/80 text-sm font-medium">
            Google Maps Lead Scraper
          </div>
        </div>
      </div>
    </nav>
  )
}
