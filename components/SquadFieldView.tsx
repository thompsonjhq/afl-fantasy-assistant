'use client'

import { AlertCircle } from 'lucide-react'
import { Player } from '@/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { avatarColorFor } from '@/lib/positionTheme'
import { initials, opponentLine, opponentShort, shortName } from '@/lib/playerDisplay'
import SquadChecklist from '@/components/SquadChecklist'

interface SquadFieldViewProps {
  players: Player[]
}

/** Groups on-field players by the line they're actually slotted into this round
 * (lineupPosition), not their raw eligible position - a MID/FWD dual-position player
 * slotted at FWD should appear in the forward line, not the midfield line. The FLEX
 * slot has no line of its own, so a flex player joins the row matching their raw
 * position instead (that's the line they're actually standing in). */
function onField(players: Player[], line: string): Player[] {
  return players.filter((player) => {
    if (player.lineupPosition === 'FLX') return player.position === line
    return player.lineupPosition === line
  })
}

function FieldChip({ player }: { player: Player }) {
  const score = player.projectedScore || player.avgScore || null
  const accent = avatarColorFor(player)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex w-20 flex-col items-center gap-1 rounded-xl bg-card/95 p-1.5 shadow-sm ring-1 ring-black/10 sm:w-24 sm:p-2">
          <div className="flex w-full items-center justify-between">
            <span className={`rounded px-1 py-0.5 text-[9px] font-bold text-white ${accent}`}>
              {player.lineupPosition === 'BENCH' ? player.position : player.lineupPosition || player.position}
            </span>
            {(player.isCaptain || player.isViceCaptain) && (
              <span className="rounded bg-foreground px-1 py-0.5 text-[9px] font-bold text-background">
                {player.isCaptain ? 'C' : 'VC'}
              </span>
            )}
          </div>

          <div
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white sm:h-11 sm:w-11 ${accent}`}
          >
            {initials(player.name)}
            {player.injured && (
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-white ring-2 ring-card">
                <AlertCircle className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          <span className="text-base font-bold leading-none text-foreground sm:text-lg">
            {score ?? '-'}
          </span>

          <span className="max-w-full truncate text-[11px] font-medium text-foreground">
            {shortName(player.name)}
          </span>
          <span className="max-w-full truncate text-[10px] text-muted-foreground">
            {opponentShort(player)}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          <div className="font-medium">
            {player.name} · {player.position}
            {player.position2 ? `/${player.position2}` : ''}
          </div>
          <div className="text-muted-foreground">{opponentLine(player)}</div>
          <div className="text-muted-foreground">
            Avg {player.avgScore} · GP {player.gamesPlayed ?? '-'}
          </div>
          <div className="text-muted-foreground">
            L3 {player.last3Avg ?? '-'} · L5 {player.last5Avg ?? '-'}
          </div>
          {player.injured && <div className="text-destructive">{player.injuryNote || 'Injured'}</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function FieldRow({ players }: { players: Player[] }) {
  if (players.length === 0) return <div />

  return (
    <div className="flex flex-wrap items-start justify-center gap-2 sm:gap-3">
      {players.map((player) => (
        <FieldChip key={player.id} player={player} />
      ))}
    </div>
  )
}

export default function SquadFieldView({ players }: SquadFieldViewProps) {
  if (players.length === 0) return null

  const forwards = onField(players, 'FWD')
  const midfielders = onField(players, 'MID')
  const rucks = onField(players, 'RUC')
  const defenders = onField(players, 'DEF')
  const bench = players.filter((player) => player.lineupPosition === 'BENCH')

  return (
    <div className="flex flex-col gap-4">
      <SquadChecklist players={players} />

      <div className="relative mx-auto aspect-[3/4] w-full max-w-md">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 shadow-inner dark:from-emerald-700 dark:to-emerald-900" />

        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 133"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect x="4" y="4" width="92" height="125" rx="2" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="0.6" />
          <circle cx="50" cy="66.5" r="10" fill="none" stroke="white" strokeOpacity="0.45" strokeWidth="0.6" />
          <rect x="44" y="60.5" width="12" height="12" fill="none" stroke="white" strokeOpacity="0.45" strokeWidth="0.5" />
          <rect x="35" y="6" width="30" height="9" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="0.5" />
          <rect x="35" y="118" width="30" height="9" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="0.5" />
        </svg>

        <div className="absolute inset-0 flex flex-col justify-between px-2 py-6 sm:px-4 sm:py-8">
          <FieldRow players={forwards} />
          <FieldRow players={midfielders} />
          <FieldRow players={rucks} />
          <FieldRow players={defenders} />
        </div>
      </div>

      {bench.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bench</div>
          <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
            {bench.map((player) => (
              <FieldChip key={player.id} player={player} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
