import { createMiddleware, createStart } from '@tanstack/react-start'
import {
  DASHBOARD_HOSTNAME,
  PUBLIC_SITE_HOSTNAME,
  dashboardUrl,
  isPublicSiteHost,
  normalizeHostname,
} from './lib/siteDomains'

const domainRouting = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url)
  const hostname = normalizeHostname(request.headers.get('host') ?? url.hostname)

  if (hostname === DASHBOARD_HOSTNAME && url.pathname === '/landing') {
    return Response.redirect(`https://${PUBLIC_SITE_HOSTNAME}/`, 308)
  }

  if (!isPublicSiteHost(hostname) || url.pathname.startsWith('/_serverFn/')) {
    return next()
  }

  if (url.pathname === '/landing') {
    return Response.redirect(`https://${PUBLIC_SITE_HOSTNAME}/`, 308)
  }

  if (url.pathname !== '/') {
    return Response.redirect(dashboardUrl(`${url.pathname}${url.search}`), 308)
  }

  return next()
})

export const startInstance = createStart(() => ({
  requestMiddleware: [domainRouting],
}))
