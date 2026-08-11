import type { FreeAgentComparison } from '@/lib/freeAgents'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { difficultyBadgeClass } from '@/lib/difficultyTheme'

function positionLabel(player: FreeAgentComparison['player']) {
  return `${player.position}${player.position2 ? `/${player.position2}` : ''}`
}

export default function FreeAgentComparisonTable({ comparisons }: { comparisons: FreeAgentComparison[] }) {
  if (comparisons.length === 0) {
    return <p className="text-sm text-muted-foreground">No comparisons to show.</p>
  }

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
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {comparisons.map((comparison) => (
          <TableRow key={comparison.player.id}>
            <TableCell>
              <div className="font-medium text-foreground">{comparison.player.name}</div>
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
            <TableCell className="min-w-64 text-xs text-muted-foreground">{comparison.reason}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
