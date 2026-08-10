'use client'

import { Player } from '@/types'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PlayerProjectionRow } from '@/components/PlayerProjectionRow'

interface SquadViewProps {
  players: Player[]
}

const SECTIONS = [
  { key: 'DEF', label: 'Defenders', target: 3 },
  { key: 'MID', label: 'Midfielders', target: 4 },
  { key: 'RUC', label: 'Rucks', target: 1 },
  { key: 'FWD', label: 'Forwards', target: 3 },
  { key: 'FLX', label: 'Flex', target: 1 },
  { key: 'BENCH', label: 'Bench', target: 4 },
]

export default function SquadView({ players }: SquadViewProps) {
  if (players.length === 0) return null

  const grouped = SECTIONS.reduce((acc, section) => {
    acc[section.key] = players.filter((player) => (player.lineupPosition || 'BENCH') === section.key)
    return acc
  }, {} as Record<string, Player[]>)

  return (
    <div className="flex flex-col gap-6">
      {SECTIONS.map((section) => {
        const sectionPlayers = grouped[section.key] || []
        if (sectionPlayers.length === 0) return null

        return (
          <div key={section.key} className="overflow-hidden rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{section.label}</span>
              <span className="text-xs text-muted-foreground">{sectionPlayers.length}/{section.target}</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Pos</TableHead>
                  <TableHead className="text-right">GP</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">Proj</TableHead>
                  <TableHead className="text-right">L3</TableHead>
                  <TableHead className="text-right">Range</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Why</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectionPlayers.map((player) => <PlayerProjectionRow key={player.id} player={player} showTeam={false} />)}
              </TableBody>
            </Table>
          </div>
        )
      })}
    </div>
  )
}
