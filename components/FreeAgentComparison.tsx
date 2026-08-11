'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { Player } from '@/types'
import type { FreeAgentComparison as Comparison } from '@/lib/freeAgents'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FreeAgentComparisonTable from '@/components/FreeAgentComparisonTable'

interface FreeAgentComparisonProps {
  players: Player[]
  round: number
}

const POSITION_FILTERS = ['ALL', 'DEF', 'MID', 'RUC', 'FWD'] as const
type PositionFilter = (typeof POSITION_FILTERS)[number]

const SORT_OPTIONS = [
  { value: 'netGain', label: 'Net gain' },
  { value: 'vorp', label: 'VORP' },
  { value: 'projected', label: 'Projected' },
  { value: 'avg', label: 'Season avg' },
] as const
type SortBy = (typeof SORT_OPTIONS)[number]['value']

function sortValue(comparison: Comparison, sortBy: SortBy): number {
  if (sortBy === 'projected') return comparison.player.projectedScore || 0
  if (sortBy === 'avg') return comparison.player.avgScore || 0
  if (sortBy === 'vorp') return comparison.vorp ?? -999
  return comparison.netGain ?? -999
}

export default function FreeAgentComparison({ players, round }: FreeAgentComparisonProps) {
  const [comparisons, setComparisons] = useState<Comparison[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('netGain')

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (players.length > 0) loadComparisons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  const filtered = comparisons
    .filter((c) => positionFilter === 'ALL' || c.player.position === positionFilter || c.player.position2 === positionFilter)
    .filter((c) => {
      if (!search.trim()) return true
      const needle = search.trim().toLowerCase()
      return c.player.name.toLowerCase().includes(needle) || c.player.team.toLowerCase().includes(needle)
    })
    .sort((a, b) => sortValue(b, sortBy) - sortValue(a, sortBy))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Free Agent Projection Comparison</CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">Compares available players against the weakest comparable player on your squad.</p>
        </div>
        <Button onClick={loadComparisons} disabled={loading || players.length === 0} variant="outline" size="sm" className="shrink-0 gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Comparing…' : 'Refresh'}
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 pt-0">
        {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {comparisons.length > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Tabs value={positionFilter} onValueChange={(value) => setPositionFilter(value as PositionFilter)}>
                <TabsList>
                  {POSITION_FILTERS.map((option) => (
                    <TabsTrigger key={option} value={option}>{option}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search player or team"
                    className="h-8 w-48 pl-8 text-sm"
                  />
                </div>
                <Tabs value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                  <TabsList>
                    {SORT_OPTIONS.map((option) => (
                      <TabsTrigger key={option.value} value={option.value}>{option.label}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <FreeAgentComparisonTable comparisons={filtered} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
