'use client'

import { useState } from 'react'
import { ArrowUp, ArrowDown, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { Player, ProjectionFactor } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'

/** Shared expandable player+projection-factors row, used by both the Squad page's grouped tables and the flat Projections table. */
export const PROJECTION_ROW_COLUMN_COUNT = 9

function getTrend(player: Player) {
  const avg = player.avgScore || 0
  const last3 = player.last3Avg || avg
  const diff = last3 - avg

  if (diff > 8) return { Icon: ArrowUp, className: 'text-emerald-600' }
  if (diff < -8) return { Icon: ArrowDown, className: 'text-red-500' }
  return { Icon: ArrowRight, className: 'text-muted-foreground' }
}

function formatImpact(impact: number) {
  if (!impact) return '0'
  return `${impact > 0 ? '+' : ''}${impact}`
}

function FactorRow({ factor }: { factor: ProjectionFactor }) {
  return (
    <div className="grid grid-cols-[90px_70px_60px_1fr] gap-2 border-b border-border/60 py-1 text-xs last:border-0">
      <div className="font-medium text-foreground">{factor.label}</div>
      <div className={factor.available ? 'text-foreground' : 'text-muted-foreground'}>{factor.value}</div>
      <div className={factor.impact > 0 ? 'text-emerald-600' : factor.impact < 0 ? 'text-red-600' : 'text-muted-foreground'}>
        {formatImpact(factor.impact)}
      </div>
      <div className={factor.available ? 'text-muted-foreground' : 'text-muted-foreground/60'}>{factor.description}</div>
    </div>
  )
}

export function PlayerProjectionRow({ player, showTeam = true }: { player: Player; showTeam?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const trend = getTrend(player)
  const hasFactors = Boolean(player.projectionFactors?.length)

  return (
    <>
      <TableRow className={player.lineupPosition === 'BENCH' ? 'bg-muted/40' : undefined}>
        <TableCell>
          <div className="flex items-center gap-2">
            {player.isCaptain && <Badge className="bg-primary text-primary-foreground">C</Badge>}
            {player.isViceCaptain && <Badge variant="secondary">VC</Badge>}
            <div>
              <div className="font-medium text-foreground">{player.name}</div>
              {showTeam && <div className="text-xs text-muted-foreground">{player.team}</div>}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Badge variant="secondary">{player.position}</Badge>
            {player.position2 && <Badge variant="outline">{player.position2}</Badge>}
          </div>
        </TableCell>
        <TableCell className="text-right">{player.gamesPlayed ?? '-'}</TableCell>
        <TableCell className="text-right font-medium">{player.avgScore}</TableCell>
        <TableCell className="text-right">
          <Badge className={player.projectedScore ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}>
            {player.projectedScore || '-'}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <span className="inline-flex items-center gap-1">
            {player.last3Avg ?? '-'}
            <trend.Icon className={`h-3.5 w-3.5 ${trend.className}`} />
          </span>
        </TableCell>
        <TableCell className="text-right text-xs text-muted-foreground">
          {player.projectionLow !== undefined && player.projectionHigh !== undefined
            ? `${player.projectionLow}-${player.projectionHigh}`
            : `${player.highScore ?? '-'}/${player.lowScore ?? '-'}`}
        </TableCell>
        <TableCell className="text-right">
          {player.injured
            ? <Badge variant="destructive" className="whitespace-nowrap">{player.injuryNote || 'Injured'}</Badge>
            : <span className="text-xs text-muted-foreground">Fit</span>}
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="sm"
            disabled={!hasFactors}
            onClick={() => setExpanded((v) => !v)}
            className="gap-1 text-xs"
          >
            Why? {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </TableCell>
      </TableRow>

      {expanded && hasFactors && (
        <TableRow>
          <TableCell colSpan={PROJECTION_ROW_COLUMN_COUNT} className="bg-muted/30">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-semibold text-foreground">Projection breakdown</span>
              <Badge variant="outline">{player.projectionConfidence || 'Medium'} confidence</Badge>
            </div>
            <p className="pb-2 text-xs text-muted-foreground">{player.projectionReason}</p>
            {player.projectionFactors!.map((factor) => (
              <FactorRow key={`${player.id}-${factor.kind}`} factor={factor} />
            ))}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
