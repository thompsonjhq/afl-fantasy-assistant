'use client'

import { useSquad } from '@/lib/squad-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PlayerProjectionRow } from '@/components/PlayerProjectionRow'

export default function ProjectionsPage() {
  const { players, round, loading } = useSquad()

  if (loading) return <Skeleton className="h-96" />

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
    <Card>
      <CardHeader>
        <CardTitle>Full squad projections - Round {round}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sorted by projected score. Expand &quot;Why?&quot; for the full factor breakdown behind each number.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Pos</TableHead>
              <TableHead className="text-right">GP</TableHead>
              <TableHead className="text-right">Avg</TableHead>
              <TableHead className="text-right">Proj</TableHead>
              <TableHead className="text-right">L3</TableHead>
              <TableHead className="text-right">Range</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="text-right">Why</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((player) => <PlayerProjectionRow key={player.id} player={player} />)}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
