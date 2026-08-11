import { ProjectionFactor } from '@/types'

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

export function ProjectionFactorList({ factors, playerId }: { factors?: ProjectionFactor[]; playerId: string }) {
  if (!factors?.length) {
    return <p className="text-sm text-muted-foreground">No projection factors available yet.</p>
  }

  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {factors.map((factor) => <FactorBullet key={`${playerId}-${factor.kind}`} factor={factor} />)}
    </ul>
  )
}
