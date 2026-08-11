'use client'

import { useSquad } from '@/lib/squad-context'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectionDetailCard } from '@/components/ProjectionDetailCard'

export default function ProjectionsPage() {
  const { players, round, loading } = useSquad()

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No squad loaded yet - visit Squad to add players or sync from AFL Fantasy.
        </CardContent>
      </Card>
    )
  }

  const sorted = [...players].sort((a, b) => (b.projectedScore || 0) - (a.projectedScore || 0))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Full squad projections - Round {round}</h2>
        <p className="text-sm text-muted-foreground">
          Sorted by projected score. Each card states the real matchup behind the number, with every factor that fed into it.
        </p>
      </div>

      {sorted.map((player) => <ProjectionDetailCard key={player.id} player={player} />)}
    </div>
  )
}
