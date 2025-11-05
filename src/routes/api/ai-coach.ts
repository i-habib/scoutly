import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/ai-coach')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/api/ai-coach"!</div>
}
