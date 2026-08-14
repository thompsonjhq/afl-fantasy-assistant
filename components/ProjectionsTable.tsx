'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Player } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { difficultyBadgeClass } from '@/lib/difficultyTheme'
import { opponentLine } from '@/lib/playerDisplay'
import { getConsistencyScore, getFormLabel } from '@/lib/projections'
import { computeTiers } from '@/lib/tiers'
import { ProjectionFactorList } from '@/components/ProjectionFactorList'
import { ScoreBreakdownChart } from '@/components/ScoreBreakdownChart'
import { ColumnPicker } from '@/components/ColumnPicker'
import { DEFAULT_VISIBLE_COLUMNS, EXTRA_COLUMNS, ExtraColumnKey, extraColumnValue } from '@/lib/extraPlayerColumns'
import { useColumnPreferences } from '@/lib/useColumnPreferences'

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

const FORM_BADGE_CLASS: Record<'Hot' | 'Cold' | 'Steady', string> = {
  Hot: 'border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  Cold: 'border-sky-600/40 bg-sky-600/10 text-sky-700 dark:text-sky-400',
  Steady: '',
}

function FormBadge({ factors }: { factors?: Player['projectionFactors'] }) {
  const form = getFormLabel(factors)
  if (!form) return <span className="text-muted-foreground">-</span>

  return (
    <Badge variant="outline" className={FORM_BADGE_CLASS[form]}>
      {form}
    </Badge>
  )
}

function ConsistencyCell({ factors }: { factors?: Player['projectionFactors'] }) {
  const score = getConsistencyScore(factors)
  if (score === null) return <span className="text-muted-foreground">-</span>

  return (
    <div className="flex items-center justify-end gap-1.5">
      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary/60" style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{score}</span>
    </div>
  )
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

const BASE_COLUMN_COUNT = 8

export default function ProjectionsTable({ players }: ProjectionsTableProps) {
  const [filter, setFilter] = useState<PositionFilter>('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { visible: visibleColumns, toggle: toggleColumn } = useColumnPreferences<ExtraColumnKey>(
    'projections-table-columns',
    DEFAULT_VISIBLE_COLUMNS
  )

  const sorted = [...players]
    .filter((player) => matchesFilter(player, filter))
    .sort((a, b) => (b.projectedScore || 0) - (a.projectedScore || 0))

  const tierByPlayer = computeTiers(sorted, (player) => player.projectedScore || player.avgScore || 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as PositionFilter)}>
          <TabsList>
            {POSITION_FILTERS.map((option) => (
              <TabsTrigger key={option} value={option}>{option}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <ColumnPicker visible={visibleColumns} onToggle={toggleColumn} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Player</TableHead>
            <TableHead>Opponent</TableHead>
            <TableHead className="text-right">Avg</TableHead>
            <TableHead>Range</TableHead>
            <TableHead>Form</TableHead>
            <TableHead className="text-right">Consistency</TableHead>
            <TableHead className="text-right">Confidence</TableHead>
            {EXTRA_COLUMNS.filter((column) => visibleColumns.includes(column.key)).map((column) => (
              <TableHead key={column.key} className={column.align === 'right' ? 'text-right' : undefined}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((player, index) => {
            const expanded = expandedId === player.id
            const tier = tierByPlayer.get(player)
            const showTierDivider = index > 0 && tier !== tierByPlayer.get(sorted[index - 1])

            return (
              <Fragment key={player.id}>
                {showTierDivider && (
                  <TableRow className="border-none hover:bg-transparent">
                    <TableCell colSpan={BASE_COLUMN_COUNT + visibleColumns.length} className="bg-muted/50 py-1 text-xs font-medium text-muted-foreground">
                      Tier {tier}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow
                  className="cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : player.id)}
                >
                  <TableCell>
                    {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/players/${player.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="font-medium text-foreground hover:underline"
                      >
                        {player.name}
                      </Link>
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
                  <TableCell>
                    <FormBadge factors={player.projectionFactors} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ConsistencyCell factors={player.projectionFactors} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{player.projectionConfidence || 'Medium'}</Badge>
                  </TableCell>
                  {EXTRA_COLUMNS.filter((column) => visibleColumns.includes(column.key)).map((column) => (
                    <TableCell key={column.key} className={column.align === 'right' ? 'text-right' : undefined}>
                      {extraColumnValue(player, column.key)}
                    </TableCell>
                  ))}
                </TableRow>

                {expanded && (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={BASE_COLUMN_COUNT + visibleColumns.length}>
                      <div className="mb-2 text-xs text-muted-foreground">{opponentLine(player)}</div>
                      <ProjectionFactorList factors={player.projectionFactors} playerId={player.id} />
                      <div className="mt-3 border-t border-border pt-3">
                        <ScoreBreakdownChart playerName={player.name} />
                      </div>
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
