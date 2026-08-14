import type { Player } from '@/types'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold text-foreground">{value}</span>
    </div>
  )
}

export function PlayerStatCards({ player }: { player: Player }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Avg" value={player.avgScore} />
      <StatCard label="L5" value={player.last5Avg ?? '-'} />
      <StatCard label="Max" value={player.highScore ?? '-'} />
      <StatCard label="Total" value={player.totalPoints} />
      <StatCard label="Games" value={player.gamesPlayed ?? '-'} />
      <StatCard label="Own%" value={player.ownershipPct != null ? `${player.ownershipPct}%` : '-'} />
    </div>
  )
}
