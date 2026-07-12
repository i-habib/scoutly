import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { normalizeHostname } from './siteDomains'

export const getRequestHostname = createServerFn({ method: 'GET' }).handler(() => {
  return normalizeHostname(getRequestHeader('host') ?? '')
})
