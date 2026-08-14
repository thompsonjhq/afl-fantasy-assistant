'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { Player, PlayerGameLogRow } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScoreBreakdownChart } from '@/components/ScoreBreakdownChart'
import { PlayerStatCards } from '@/components/PlayerStatCards'

export default function PlayerDetailPage() {
  const params = useParams<{ id: string }>()
  const [player, setPlayer] = useState<Player | null>(null)
  const [gameLog, setGameLog] = useState<PlayerGameLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!params.id) return

    fetch(`/api/players/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || 'Player not found')
        setPlayer(data.player)
        setGameLog(data.gameLog || [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Player not found'))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <Skeleton className="h-96" />

  if (error || !player) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {error || 'Player not found'}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">{player.name}</h2>
        <Badge variant="outline">{player.position}{player.position2 ? `/${player.position2}` : ''}</Badge>
        <span className="text-sm text-muted-foreground">{player.team}</span>
        {player.injured && (
          <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
            {player.injuryNote || 'Injured'}
          </Badge>
        )}
      </div>

      <PlayerStatCards player={player} />

      <Card>
        <CardHeader>
          <CardTitle>Score breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreBreakdownChart playerName={player.name} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent games</CardTitle>
        </CardHeader>
        <CardContent>
          {gameLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No real game-log history yet - run the game-log backfill.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Round</TableHead>
                  <TableHead>Opponent</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gameLog.map((row) => (
                  <TableRow key={`${row.season}-${row.matchId ?? row.round}`}>
                    <TableCell>R{row.round}</TableCell>
                    <TableCell className="text-muted-foreground">{row.opponent || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{row.venue || '-'}</TableCell>
                    <TableCell>
                      {row.win === true ? (
                        <Badge variant="outline" className="border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">Win</Badge>
                      ) : row.win === false ? (
                        <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">Loss</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">{row.fantasyPoints}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
