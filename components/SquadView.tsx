'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { Player } from '@/types'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SquadRosterRow } from '@/components/SquadRosterRow'

interface SquadViewProps {
  players: Player[]
}

const SECTIONS = [
  { key: 'DEF', label: 'Defenders', target: 3, accent: 'bg-rose-500' },
  { key: 'MID', label: 'Midfielders', target: 4, accent: 'bg-amber-500' },
  { key: 'RUC', label: 'Rucks', target: 1, accent: 'bg-violet-500' },
  { key: 'FWD', label: 'Forwards', target: 3, accent: 'bg-emerald-600' },
  { key: 'FLX', label: 'Flex', target: 1, accent: 'bg-sky-500' },
  { key: 'BENCH', label: 'Bench', target: 4, accent: 'bg-slate-500' },
]

function ChecklistPill({ label, count, target }: { label: string; count: number; target: number }) {
  const met = count >= target

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${met ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border bg-muted text-muted-foreground'}`}>
      {met ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
      {label} {count}/{target}
    </span>
  )
}

export default function SquadView({ players }: SquadViewProps) {
  if (players.length === 0) return null

  const grouped = SECTIONS.reduce((acc, section) => {
    acc[section.key] = players.filter((player) => (player.lineupPosition || 'BENCH') === section.key)
    return acc
  }, {} as Record<string, Player[]>)

  const hasCaptain = players.some((p) => p.isCaptain)
  const hasViceCaptain = players.some((p) => p.isViceCaptain)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <ChecklistPill key={section.key} label={section.label} count={(grouped[section.key] || []).length} target={section.target} />
        ))}
        <ChecklistPill label="Captain" count={hasCaptain ? 1 : 0} target={1} />
        <ChecklistPill label="Vice-Captain" count={hasViceCaptain ? 1 : 0} target={1} />
      </div>

      <div className="flex flex-col gap-6">
        {SECTIONS.map((section) => {
          const sectionPlayers = grouped[section.key] || []
          if (sectionPlayers.length === 0) return null

          return (
            <div key={section.key} className="overflow-hidden rounded-lg border border-border">
              <div className={`flex items-center justify-between px-4 py-2 text-white ${section.accent}`}>
                <span className="text-xs font-semibold uppercase tracking-wide">{section.label}</span>
                <span className="text-xs opacity-90">{sectionPlayers.length}/{section.target}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">GP</TableHead>
                    <TableHead className="text-right">Avg</TableHead>
                    <TableHead className="text-right">L3</TableHead>
                    <TableHead className="text-right">L5</TableHead>
                    <TableHead className="text-right">Proj</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectionPlayers.map((player) => <SquadRosterRow key={player.id} player={player} />)}
                </TableBody>
              </Table>
            </div>
          )
        })}
      </div>
    </div>
  )
}
