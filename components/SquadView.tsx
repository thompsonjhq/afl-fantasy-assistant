'use client'

import { Player } from '@/types'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SquadRosterRow } from '@/components/SquadRosterRow'
import SquadChecklist, { SQUAD_SECTIONS, groupBySection } from '@/components/SquadChecklist'

interface SquadViewProps {
  players: Player[]
}

export default function SquadView({ players }: SquadViewProps) {
  if (players.length === 0) return null

  const grouped = groupBySection(players)

  return (
    <div className="flex flex-col gap-4">
      <SquadChecklist players={players} />

      <div className="flex flex-col gap-6">
        {SQUAD_SECTIONS.map((section) => {
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
