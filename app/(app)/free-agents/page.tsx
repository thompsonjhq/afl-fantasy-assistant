'use client'

import { useSquad } from '@/lib/squad-context'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import FreeAgentComparison from '@/components/FreeAgentComparison'

export default function FreeAgentsPage() {
  const { players, round, loading } = useSquad()

  if (loading) return <Skeleton className="h-64" />

  if (players.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Load your squad first from the Squad page to compare against free agents.
        </CardContent>
      </Card>
    )
  }

  return <FreeAgentComparison players={players} round={round} />
}
