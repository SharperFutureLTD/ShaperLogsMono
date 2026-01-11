'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

  if (loading) return <DashboardSkeleton />
  if (!user) return null

  return <>{children}</>
}
