import type { ReactNode } from 'react'

/**
 * @deprecated SupabaseProvider has been replaced by API-based auth.
 * Wrap components with QueryClientProvider and use the useAuth hook instead.
 */
export function SupabaseProvider({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('SupabaseProvider is deprecated. Please remove it and rely on useAuth instead.')
  }
  return <>{children}</>
}

/**
 * @deprecated SupabaseProvider/useSupabase are no longer supported.
 * Switch to the useAuth hook for session state and mutations.
 */
export function useSupabase(): never {
  throw new Error('useSupabase is deprecated. Use the useAuth hook instead.')
}
