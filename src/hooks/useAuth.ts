import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as authClient from '../services/authClient'

const AUTH_SESSION_KEY = ['auth', 'session']

export function useAuth() {
  const queryClient = useQueryClient()

  const sessionQuery = useQuery({
    queryKey: AUTH_SESSION_KEY,
    queryFn: authClient.fetchSession,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const invalidateAuth = () => {
    queryClient.invalidateQueries({ queryKey: AUTH_SESSION_KEY })
    queryClient.invalidateQueries({ queryKey: ['userData'] })
  }

  const signInMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authClient.signIn(email, password),
    onSuccess: invalidateAuth,
  })

  const signUpMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authClient.signUp(email, password),
    onSuccess: invalidateAuth,
  })

  const signOutMutation = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: invalidateAuth,
  })

  const user = sessionQuery.data?.user ?? null
  const rawError = sessionQuery.error
  const authError =
    rawError instanceof Error
      ? rawError
      : rawError
        ? new Error(typeof rawError === 'string' ? rawError : 'Failed to load session')
        : null

  return {
    user,
    session: sessionQuery.data,
    isAuthLoading: sessionQuery.isPending,
    signIn: signInMutation.mutateAsync,
    signUp: signUpMutation.mutateAsync,
    signOut: signOutMutation.mutateAsync,
    isSigningIn: signInMutation.isPending,
    isSigningUp: signUpMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    authError,
    refetchSession: sessionQuery.refetch,
  }
}
