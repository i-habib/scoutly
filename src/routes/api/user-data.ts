import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/user-data')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/api/user-data"!</div>
}
