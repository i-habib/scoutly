import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from './useAuth'

export function useRequireAuth() {
  const navigate = useNavigate()
  const { user, isAuthLoading } = useAuth()

  useEffect(() => {
    if (isAuthLoading) return
    if (!user) {
      navigate({ to: '/onboarding', replace: true })
    }
  }, [user, isAuthLoading, navigate])

  return { user, isAuthLoading }
}
