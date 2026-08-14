import { Fragment } from 'react'
import Link from 'next/link'
import type { FreeAgentComparison } from '@/lib/freeAgents'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { difficultyBadgeClass } from '@/lib/difficultyTheme'
import { EXTRA_COLUMNS, ExtraColumnKey, extraColumnValue } from '@/lib/extraPlayerColumns'

function positionLabel(player: FreeAgentComparison['player']) {
  return `${player.position}${player.position2 ? `/${player.position2}` : ''}`
}

interface FreeAgentComparisonTableProps {
  comparisons: FreeAgentComparison[]
  visibleColumns?: ExtraColumnKey[]
  tierByComparison?: Map<FreeAgentComparison, number>
}

export default function FreeAgentComparisonTable({ comparisons, visibleColumns = [], tierByComparison }: FreeAgentComparisonTableProps) {
  if (comparisons.length === 0) {
    return <p className="text-sm text-muted-foreground">No comparisons to show.</p>
  }

  const extraColumns = EXTRA_COLUMNS.filter((column) => visibleColumns.includes(column.key))
  const totalColumns = 6 + extraColumns.length + 1

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Free agent</TableHead>
          <TableHead>Opponent</TableHead>
          <TableHead className="text-right">Proj</TableHead>
          <TableHead>Compare to</TableHead>
          <TableHead className="text-right">Gain</TableHead>
          <TableHead className="text-right">VORP</TableHead>
          {extraColumns.map((column) => (
            <TableHead key={column.key} className={column.align === 'right' ? 'text-right' : undefined}>
              {column.label}
            </TableHead>
          ))}
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {comparisons.map((comparison, index) => {
          const tier = tierByComparison?.get(comparison)
          const previousTier = index > 0 ? tierByComparison?.get(comparisons[index - 1]) : undefined
          const showTierDivider = index > 0 && tier !== previousTier

          return (
          <Fragment key={comparison.player.id}>
            {showTierDivider && (
              <TableRow className="border-none hover:bg-transparent">
                <TableCell colSpan={totalColumns} className="bg-muted/50 py-1 text-xs font-medium text-muted-foreground">
                  Tier {tier}
                </TableCell>
              </TableRow>
            )}
          <TableRow>
            <TableCell>
              <Link href={`/players/${comparison.player.id}`} className="font-medium text-foreground hover:underline">
                {comparison.player.name}
              </Link>
              <div className="text-xs text-muted-foreground">{positionLabel(comparison.player)} · {comparison.player.team}</div>
            </TableCell>
            <TableCell>
              {comparison.player.fixture?.opponent && comparison.player.fixture.opponent !== 'Unknown' ? (
                <Badge variant="outline" className={difficultyBadgeClass(comparison.player.fixture.difficulty)}>
                  {comparison.player.fixture.opponent}
                </Badge>
              ) : (
                <span className="text-muted-foreground">Bye</span>
              )}
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
            <TableCell className="text-right">
              {comparison.vorp === undefined ? (
                '—'
              ) : (
                <span className={comparison.vorp >= 0 ? 'text-emerald-600' : 'text-muted-foreground'}>
                  {comparison.vorp >= 0 ? '+' : ''}{comparison.vorp}
                </span>
              )}
            </TableCell>
            {extraColumns.map((column) => (
              <TableCell key={column.key} className={column.align === 'right' ? 'text-right' : undefined}>
                {extraColumnValue(comparison.player, column.key)}
              </TableCell>
            ))}
            <TableCell className="min-w-64 text-xs text-muted-foreground">{comparison.reason}</TableCell>
          </TableRow>
          </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
