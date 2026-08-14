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
import { teamAbbr } from '@/lib/afl'
import { getConsistencyScore, getFormLabel, getTrendLabel } from '@/lib/projections'
import { computeTiers, gradeForTier } from '@/lib/tiers'
import { getPlayerFlags } from '@/lib/flags'
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
  Hot: 'rounded border-positive/30 bg-positive/10 text-positive',
  Cold: 'rounded border-negative/30 bg-negative/10 text-negative',
  Steady: 'rounded',
}

function FormBadge({ factors }: { factors?: Player['projectionFactors'] }) {
  const form = getFormLabel(factors)
  if (!form) return <span className="text-muted-foreground">-</span>

  return (
    <Badge variant="outline" className={`text-[10px] ${FORM_BADGE_CLASS[form]}`}>
      {form}
    </Badge>
  )
}

const TREND_CLASS: Record<'Up' | 'Down' | 'Flat', string> = {
  Up: 'text-positive',
  Down: 'text-negative',
  Flat: 'text-muted-foreground',
}

const TREND_ARROW: Record<'Up' | 'Down' | 'Flat', string> = {
  Up: '▲',
  Down: '▼',
  Flat: '–',
}

function TrendCell({ player }: { player: Player }) {
  const trend = getTrendLabel(player)
  if (!trend) return <span className="text-muted-foreground">-</span>

  return (
    <span className={`text-xs font-semibold ${TREND_CLASS[trend]}`}>
      {TREND_ARROW[trend]} {trend}
    </span>
  )
}

const CONFIDENCE_BADGE_CLASS: Record<'High' | 'Medium' | 'Low', string> = {
  High: 'rounded border-positive/30 bg-positive/10 text-positive',
  Medium: 'rounded',
  Low: 'rounded border-warning/30 bg-warning/10 text-warning',
}

function ConfidenceBadge({ confidence }: { confidence?: Player['projectionConfidence'] }) {
  const value = confidence || 'Medium'

  return (
    <Badge variant="outline" className={`text-[10px] ${CONFIDENCE_BADGE_CLASS[value]}`}>
      {value}
    </Badge>
  )
}

const GRADE_TONE_CLASS: Record<'positive' | 'negative' | 'warning' | 'neutral', string> = {
  positive: 'border-positive/30 bg-positive/10 text-positive',
  negative: 'border-negative/30 bg-negative/10 text-negative',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  neutral: '',
}

function GradeBadge({ tier }: { tier?: number }) {
  if (tier === undefined) return <span className="text-muted-foreground">-</span>

  const grade = gradeForTier(tier)

  return (
    <Badge variant="outline" className={`rounded text-[10px] font-bold ${GRADE_TONE_CLASS[grade.tone]}`}>
      {grade.label}
    </Badge>
  )
}

const FLAG_TONE_CLASS: Record<'positive' | 'negative' | 'warning', string> = {
  positive: 'border-positive/30 bg-positive/10 text-positive',
  negative: 'border-negative/30 bg-negative/10 text-negative',
  warning: 'border-warning/30 bg-warning/10 text-warning',
}

function FlagsCell({ player }: { player: Player }) {
  const flags = getPlayerFlags(player)
  if (flags.length === 0) return <span className="text-muted-foreground">-</span>

  return (
    <div className="flex flex-wrap gap-1">
      {flags.map((flag) => (
        <span
          key={flag.label}
          className={`rounded border px-1 py-0 text-[9px] font-medium whitespace-nowrap ${FLAG_TONE_CLASS[flag.tone]}`}
        >
          {flag.label}
        </span>
      ))}
    </div>
  )
}

function FixtureStripCell({ strip }: { strip?: Player['fixtureStrip'] }) {
  if (!strip || strip.length === 0) return <span className="text-muted-foreground">-</span>

  return (
    <div className="flex flex-wrap items-center gap-1">
      {strip.map((entry) => {
        const isBye = entry.opponent === 'Unknown'
        const label = isBye ? 'BYE' : `${teamAbbr(entry.opponent)}(${entry.isHome ? 'H' : 'A'})`
        const toneClass = isBye ? 'border-transparent bg-muted text-muted-foreground' : difficultyBadgeClass(entry.difficulty)

        return (
          <span
            key={entry.round}
            className={`rounded border px-1 py-0 text-[8px] font-medium whitespace-nowrap ${toneClass}`}
          >
            {label}
          </span>
        )
      })}
    </div>
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
      <span className="font-semibold tabular-nums text-primary">{score ?? '-'}</span>
    </div>
  )
}

const BASE_COLUMN_COUNT = 12

// Responsive column hiding, layered on top of the manual column picker (which only governs
// EXTRA_COLUMNS) - progressively drops less-critical columns on narrower viewports instead of
// forcing horizontal scroll. Player/Grade/Avg always show; everything else earns its way back in
// as space allows. Header and body cells for the same column must share the identical class or
// the table's columns misalign.
const HIDE_BELOW_MD = 'hidden md:table-cell'
const HIDE_BELOW_LG = 'hidden lg:table-cell'

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

      <Table className="[&_td]:py-1.5 [&_th]:h-8 [&_th]:text-xs">
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Player</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead className={HIDE_BELOW_MD}>Opponent</TableHead>
            <TableHead className={HIDE_BELOW_LG}>Fixtures</TableHead>
            <TableHead className="text-right">Avg</TableHead>
            <TableHead className={HIDE_BELOW_MD}>Range</TableHead>
            <TableHead className={HIDE_BELOW_LG}>Form</TableHead>
            <TableHead className={HIDE_BELOW_LG}>Trend</TableHead>
            <TableHead className={`text-right ${HIDE_BELOW_LG}`}>Consistency</TableHead>
            <TableHead className={`text-right ${HIDE_BELOW_MD}`}>Confidence</TableHead>
            {EXTRA_COLUMNS.filter((column) => visibleColumns.includes(column.key)).map((column) => (
              <TableHead key={column.key} className={`${HIDE_BELOW_LG} ${column.align === 'right' ? 'text-right' : ''}`}>
                {column.label}
              </TableHead>
            ))}
            <TableHead className={HIDE_BELOW_LG}>Flags</TableHead>
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
                      <Badge variant="outline" className="h-5 rounded px-1.5 text-[10px]">
                        {player.position}{player.position2 ? `/${player.position2}` : ''}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{player.team}</div>
                  </TableCell>
                  <TableCell>
                    <GradeBadge tier={tier} />
                  </TableCell>
                  <TableCell className={HIDE_BELOW_MD}>
                    {player.fixture?.opponent && player.fixture.opponent !== 'Unknown' ? (
                      <Badge variant="outline" className={difficultyBadgeClass(player.fixture.difficulty)}>
                        {player.fixture.opponent}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Bye</span>
                    )}
                  </TableCell>
                  <TableCell className={HIDE_BELOW_LG}>
                    <FixtureStripCell strip={player.fixtureStrip} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{player.avgScore}</TableCell>
                  <TableCell className={HIDE_BELOW_MD}>
                    <RangeBar low={player.projectionLow} score={player.projectedScore} high={player.projectionHigh} />
                  </TableCell>
                  <TableCell className={HIDE_BELOW_LG}>
                    <FormBadge factors={player.projectionFactors} />
                  </TableCell>
                  <TableCell className={HIDE_BELOW_LG}>
                    <TrendCell player={player} />
                  </TableCell>
                  <TableCell className={`text-right ${HIDE_BELOW_LG}`}>
                    <ConsistencyCell factors={player.projectionFactors} />
                  </TableCell>
                  <TableCell className={`text-right ${HIDE_BELOW_MD}`}>
                    <ConfidenceBadge confidence={player.projectionConfidence} />
                  </TableCell>
                  {EXTRA_COLUMNS.filter((column) => visibleColumns.includes(column.key)).map((column) => (
                    <TableCell key={column.key} className={`${HIDE_BELOW_LG} ${column.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                      {extraColumnValue(player, column.key)}
                    </TableCell>
                  ))}
                  <TableCell className={HIDE_BELOW_LG}>
                    <FlagsCell player={player} />
                  </TableCell>
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
