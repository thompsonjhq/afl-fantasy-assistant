'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, TrendingUp, Star, ArrowRight } from 'lucide-react'
import { useSquad } from '@/lib/squad-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { difficultyBadgeClass } from '@/lib/difficultyTheme'
import type { HistorySummary } from '@/lib/gameLogStore'

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold text-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { players, round, loading } = useSquad()
  const [opponentForm, setOpponentForm] = useState<Record<string, HistorySummary | null>>({})

  const topProjected = [...players]
    .sort((a, b) => (b.projectedScore || 0) - (a.projectedScore || 0))
    .slice(0, 6)

  const topProjectedKey = topProjected.map((p) => p.id).join(',')

  useEffect(() => {
    if (topProjected.length === 0) return
    let cancelled = false

    fetch('/api/opponent-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        players: topProjected.map((p) => ({ id: p.id, name: p.name, opponent: p.fixture?.opponent })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success) setOpponentForm(data.form)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topProjectedKey])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">No squad loaded yet.</p>
          <Button asChild>
            <Link href="/squad">Go to Squad</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const startingPlayers = players.filter((p) => p.lineupPosition !== 'BENCH')
  const squadAvg = players.reduce((sum, p) => sum + (p.avgScore || 0), 0) / players.length
  const projectedTotal = startingPlayers.reduce((sum, p) => sum + (p.projectedScore || p.avgScore || 0), 0)
  const seasonTotal = players.reduce((sum, p) => sum + (p.totalPoints || 0), 0)
  const highScorer = [...players].sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))[0]

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Squad average" value={squadAvg.toFixed(1)} icon={TrendingUp} />
        <StatCard label={`Projected · Round ${round}`} value={Math.round(projectedTotal).toString()} icon={Trophy} />
        <StatCard label="Season total" value={seasonTotal.toLocaleString()} icon={Star} />
        <StatCard label="High scorer" value={highScorer?.name.split(' ').pop() || '-'} icon={Trophy} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top projected this round</CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
            <Link href="/projections">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Opponent</TableHead>
                <TableHead className="text-right">Avg</TableHead>
                <TableHead className="text-right">L3 vs Opp</TableHead>
                <TableHead className="text-right">Projected</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProjected.map((player) => {
                const form = opponentForm[player.id]

                return (
                  <TableRow key={player.id}>
                    <TableCell>
                      <div className="font-medium">{player.name}</div>
                      <div className="text-xs text-muted-foreground">{player.team}</div>
                    </TableCell>
                    <TableCell>
                      {player.fixture?.opponent && player.fixture.opponent !== 'Unknown' ? (
                        <Badge variant="outline" className={difficultyBadgeClass(player.fixture.difficulty)}>
                          {player.fixture.opponent}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Bye</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{player.avgScore}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {form ? `${form.average} (${form.games})` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">{player.projectedScore ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{player.projectionConfidence || 'Medium'}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
