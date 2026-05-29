import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Header from '../components/Header'
import { Analytics } from "@vercel/analytics/react"
import { ToastProvider } from '../components/Toast'
import { ErrorBoundary } from '../components/ErrorBoundary'

import appCss from '../styles.css?url'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Scoutly | Eagle Scout Planning Workspace',
      },
      {
        name: 'description',
        content: 'Plan your Eagle Scout journey with intelligent progression tracking, requirement management, timeline planning, and troop event coordination.',
      },
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-stone-800 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ErrorBoundary>
              <Header />
              <main id="main-content">
                {children}
              </main>
            </ErrorBoundary>
          </ToastProvider>
        </QueryClientProvider>
        <Scripts />
        <Analytics />
      </body>
    </html>
  )
}
