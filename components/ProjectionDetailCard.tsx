'use client'

import { Player, ProjectionFactor } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CONFIDENCE_BORDER: Record<string, string> = {
  High: 'border-l-emerald-500',
  Medium: 'border-l-amber-500',
  Low: 'border-l-red-500',
}

function matchupHeading(player: Player): string {
  const fixture = player.fixture

  if (!fixture || !fixture.opponent || fixture.opponent === 'Unknown') {
    return `${player.name} — bye / opponent unconfirmed`
  }

  const venuePart = fixture.venue ? ` at ${fixture.venue}` : ''
  return `${player.name} vs ${fixture.opponent}${venuePart}`
}

function formatImpact(impact: number) {
  if (!impact) return null
  return `${impact > 0 ? '+' : ''}${impact}`
}

function FactorBullet({ factor }: { factor: ProjectionFactor }) {
  const impact = formatImpact(factor.impact)

  return (
    <li className={factor.available ? 'text-foreground' : 'text-muted-foreground'}>
      <span className="font-medium">{factor.label}:</span>{' '}
      <span>{factor.value}</span>
      {impact && (
        <span className={factor.impact > 0 ? 'text-emerald-600' : 'text-red-600'}> ({impact})</span>
      )}
      <span className="text-muted-foreground"> — {factor.description}</span>
    </li>
  )
}

export function ProjectionDetailCard({ player }: { player: Player }) {
  const confidence = player.projectionConfidence || 'Medium'
  const homeAway = player.fixture?.isHome === true ? 'Home' : player.fixture?.isHome === false ? 'Away' : undefined

  return (
    <Card className={`border-l-4 ${CONFIDENCE_BORDER[confidence] || CONFIDENCE_BORDER.Medium}`}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{matchupHeading(player)}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {player.position}{player.position2 ? `/${player.position2}` : ''} · {player.team}
              {homeAway ? ` · ${homeAway}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{confidence} confidence</Badge>
            <Badge className="bg-primary text-primary-foreground">
              {player.projectedScore ?? '-'} pts
              {player.projectionLow !== undefined && player.projectionHigh !== undefined
                ? ` (${player.projectionLow}-${player.projectionHigh})`
                : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {player.projectionFactors?.length ? (
          <ul className="flex flex-col gap-1.5 text-sm">
            {player.projectionFactors.map((factor) => <FactorBullet key={`${player.id}-${factor.kind}`} factor={factor} />)}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No projection factors available yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
