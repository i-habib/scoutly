export const PUBLIC_SITE_HOSTNAME = 'scoutingiq.tech'
export const DASHBOARD_HOSTNAME = 'dashboard.scoutingiq.tech'

export function normalizeHostname(host: string) {
  return host.toLowerCase().split(':')[0]
}

export function isPublicSiteHost(host: string) {
  const hostname = normalizeHostname(host)
  return hostname === PUBLIC_SITE_HOSTNAME || hostname === `www.${PUBLIC_SITE_HOSTNAME}`
}

export function dashboardUrl(path: string) {
  return `https://${DASHBOARD_HOSTNAME}${path}`
}
