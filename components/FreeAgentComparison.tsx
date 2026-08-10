'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Player } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Comparison {
  player: Player
  replacementPlayer?: Player
  netGain?: number
  reason: string
}

interface FreeAgentComparisonProps {
  players: Player[]
  round: number
}

function positionLabel(player: Player) {
  return `${player.position}${player.position2 ? `/${player.position2}` : ''}`
}

export default function FreeAgentComparison({ players, round }: FreeAgentComparisonProps) {
  const [comparisons, setComparisons] = useState<Comparison[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadComparisons() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/projections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players, round, includeFreeAgents: true, freeAgentLimit: 100 }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to compare free agents')

      setComparisons(data.comparisons || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare free agents')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Free Agent Projection Comparison</CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">Compares available players against the weakest comparable player on your squad.</p>
        </div>
        <Button onClick={loadComparisons} disabled={loading || players.length === 0} className="gap-1.5">
          <Search className="h-3.5 w-3.5" />
          {loading ? 'Comparing…' : 'Compare'}
        </Button>
      </CardHeader>

      {(error || comparisons.length > 0) && (
        <CardContent className="pt-0">
          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          {comparisons.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Free agent</TableHead>
                  <TableHead className="text-right">Proj</TableHead>
                  <TableHead>Compare to</TableHead>
                  <TableHead className="text-right">Gain</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisons.slice(0, 20).map((comparison) => (
                  <TableRow key={comparison.player.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{comparison.player.name}</div>
                      <div className="text-xs text-muted-foreground">{positionLabel(comparison.player)} · {comparison.player.team}</div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">{comparison.player.projectedScore ?? '-'}</TableCell>
                    <TableCell>
                      {comparison.replacementPlayer ? (
                        <>
                          <div className="text-foreground">{comparison.replacementPlayer.name}</div>
                          <div className="text-xs text-muted-foreground">Proj {comparison.replacementPlayer.projectedScore ?? comparison.replacementPlayer.avgScore}</div>
                        </>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {comparison.netGain === undefined ? (
                        '—'
                      ) : (
                        <Badge variant={comparison.netGain >= 0 ? 'default' : 'destructive'} className={comparison.netGain >= 0 ? 'bg-emerald-600' : undefined}>
                          {comparison.netGain >= 0 ? '+' : ''}{comparison.netGain}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="min-w-64 text-xs text-muted-foreground">{comparison.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      )}
    </Card>
  )
}
