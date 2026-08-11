'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { Player } from '@/types'

export const SQUAD_SECTIONS = [
  { key: 'DEF', label: 'Defenders', target: 3, accent: 'bg-rose-500' },
  { key: 'MID', label: 'Midfielders', target: 4, accent: 'bg-amber-500' },
  { key: 'RUC', label: 'Rucks', target: 1, accent: 'bg-violet-500' },
  { key: 'FWD', label: 'Forwards', target: 3, accent: 'bg-emerald-600' },
  { key: 'FLX', label: 'Flex', target: 1, accent: 'bg-sky-500' },
  { key: 'BENCH', label: 'Bench', target: 4, accent: 'bg-slate-500' },
]

export function groupBySection(players: Player[]): Record<string, Player[]> {
  return SQUAD_SECTIONS.reduce((acc, section) => {
    acc[section.key] = players.filter((player) => (player.lineupPosition || 'BENCH') === section.key)
    return acc
  }, {} as Record<string, Player[]>)
}

function ChecklistPill({ label, count, target }: { label: string; count: number; target: number }) {
  const met = count >= target

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${met ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted text-muted-foreground'}`}>
      {met ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
      {label} {count}/{target}
    </span>
  )
}

export default function SquadChecklist({ players }: { players: Player[] }) {
  const grouped = groupBySection(players)
  const hasCaptain = players.some((p) => p.isCaptain)
  const hasViceCaptain = players.some((p) => p.isViceCaptain)

  return (
    <div className="flex flex-wrap gap-2">
      {SQUAD_SECTIONS.map((section) => (
        <ChecklistPill key={section.key} label={section.label} count={(grouped[section.key] || []).length} target={section.target} />
      ))}
      <ChecklistPill label="Captain" count={hasCaptain ? 1 : 0} target={1} />
      <ChecklistPill label="Vice-Captain" count={hasViceCaptain ? 1 : 0} target={1} />
    </div>
  )
}
