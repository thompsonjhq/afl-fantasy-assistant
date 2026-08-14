'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useSquad } from '@/lib/squad-context'
import type { Player } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PlayerStatCards } from '@/components/PlayerStatCards'
import { ScoreBreakdownChart } from '@/components/ScoreBreakdownChart'

function PlayerPicker({
  label,
  pool,
  selected,
  onSelect,
}: {
  label: string
  pool: Player[]
  selected: Player | null
  onSelect: (player: Player | null) => void
}) {
  const [search, setSearch] = useState('')

  const matches = search.trim()
    ? pool.filter((player) => player.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
    : []

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
        <div>
          <div className="font-medium text-foreground">{selected.name}</div>
          <div className="text-xs text-muted-foreground">{selected.position}{selected.position2 ? `/${selected.position2}` : ''} · {selected.team}</div>
        </div>
        <button onClick={() => onSelect(null)} className="text-muted-foreground hover:text-foreground" aria-label={`Clear ${label}`}>
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={`Search for ${label}`}
        className="pl-8"
      />
      {matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-popover shadow-md">
          {matches.map((player) => (
            <button
              key={player.id}
              onClick={() => { onSelect(player); setSearch('') }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span>{player.name}</span>
              <span className="text-xs text-muted-foreground">{player.position} · {player.team}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PlayerColumn({ player }: { player: Player }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-foreground">{player.name}</h3>
        <Badge variant="outline">{player.position}{player.position2 ? `/${player.position2}` : ''}</Badge>
        <span className="text-sm text-muted-foreground">{player.team}</span>
        {player.injured && (
          <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
            {player.injuryNote || 'Injured'}
          </Badge>
        )}
      </div>

      <PlayerStatCards player={player} />

      {player.projectedScore !== undefined && (
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground">Next round projection</div>
          <div className="text-lg font-semibold text-primary">
            {player.projectedScore}
            {player.projectionLow !== undefined && player.projectionHigh !== undefined && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({player.projectionLow}-{player.projectionHigh})</span>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Score breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ScoreBreakdownChart playerName={player.name} />
        </CardContent>
      </Card>
    </div>
  )
}

export default function ComparePage() {
  const { players: squadPlayers, round, loading: squadLoading } = useSquad()
  const [pool, setPool] = useState<Player[]>([])
  const [loadingPool, setLoadingPool] = useState(true)
  const [playerA, setPlayerA] = useState<Player | null>(null)
  const [playerB, setPlayerB] = useState<Player | null>(null)

  useEffect(() => {
    if (squadLoading) return

    fetch('/api/projections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ players: squadPlayers, round, includeFreeAgents: true, freeAgentLimit: 150 }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || 'Failed to load player pool')
        const combined: Player[] = [...(data.projections || []), ...(data.freeAgents || [])]
        setPool(combined)
      })
      .catch(() => setPool(squadPlayers))
      .finally(() => setLoadingPool(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squadLoading, round])

  const poolWithoutSelected = useMemo(
    () => pool.filter((player) => player.id !== playerA?.id && player.id !== playerB?.id),
    [pool, playerA, playerB]
  )

  if (squadLoading || loadingPool) return <Skeleton className="h-96" />

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Compare players</h2>
        <p className="text-sm text-muted-foreground">Pick any two players from your squad or the free agent pool to see them side by side.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PlayerPicker label="Player A" pool={poolWithoutSelected} selected={playerA} onSelect={setPlayerA} />
        <PlayerPicker label="Player B" pool={poolWithoutSelected} selected={playerB} onSelect={setPlayerB} />
      </div>

      {playerA && playerB ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PlayerColumn player={playerA} />
          <PlayerColumn player={playerB} />
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Pick two players above to compare them.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
