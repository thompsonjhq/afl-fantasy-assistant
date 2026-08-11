'use client'

import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Player } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { difficultyBadgeClass } from '@/lib/difficultyTheme'
import { opponentLine } from '@/lib/playerDisplay'
import { ProjectionFactorList } from '@/components/ProjectionFactorList'

interface ProjectionsTableProps {
  players: Player[]
}

const POSITION_FILTERS = ['ALL', 'DEF', 'MID', 'RUC', 'FWD'] as const
type PositionFilter = (typeof POSITION_FILTERS)[number]

const RANGE_SCALE_MAX = 150

function matchesFilter(player: Player, filter: PositionFilter): boolean {
  if (filter === 'ALL') return true
  return player.position === filter || player.position2 === filter
}

function RangeBar({ low, score, high }: { low?: number; score?: number; high?: number }) {
  const toPercent = (value: number) => Math.min(100, Math.max(0, (value / RANGE_SCALE_MAX) * 100))

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-20 rounded-full bg-muted">
        {low !== undefined && high !== undefined && (
          <div
            className="absolute inset-y-0 rounded-full bg-primary/30"
            style={{ left: `${toPercent(low)}%`, width: `${toPercent(high) - toPercent(low)}%` }}
          />
        )}
        {score !== undefined && (
          <div className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-primary" style={{ left: `${toPercent(score)}%` }} />
        )}
      </div>
      <span className="font-semibold text-primary">{score ?? '-'}</span>
    </div>
  )
}

export default function ProjectionsTable({ players }: ProjectionsTableProps) {
  const [filter, setFilter] = useState<PositionFilter>('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sorted = [...players]
    .filter((player) => matchesFilter(player, filter))
    .sort((a, b) => (b.projectedScore || 0) - (a.projectedScore || 0))

  return (
    <div className="flex flex-col gap-3">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as PositionFilter)}>
        <TabsList>
          {POSITION_FILTERS.map((option) => (
            <TabsTrigger key={option} value={option}>{option}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Player</TableHead>
            <TableHead>Opponent</TableHead>
            <TableHead className="text-right">Avg</TableHead>
            <TableHead>Range</TableHead>
            <TableHead className="text-right">Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((player) => {
            const expanded = expandedId === player.id

            return (
              <Fragment key={player.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : player.id)}
                >
                  <TableCell>
                    {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">{player.name}</span>
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                        {player.position}{player.position2 ? `/${player.position2}` : ''}
                      </Badge>
                    </div>
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
                  <TableCell>
                    <RangeBar low={player.projectionLow} score={player.projectedScore} high={player.projectionHigh} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{player.projectionConfidence || 'Medium'}</Badge>
                  </TableCell>
                </TableRow>

                {expanded && (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={6}>
                      <div className="mb-2 text-xs text-muted-foreground">{opponentLine(player)}</div>
                      <ProjectionFactorList factors={player.projectionFactors} playerId={player.id} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
