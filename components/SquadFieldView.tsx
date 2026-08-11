'use client'

import { AlertCircle } from 'lucide-react'
import { Player } from '@/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { avatarColorFor } from '@/lib/positionTheme'
import { initials, opponentLine, shortName } from '@/lib/playerDisplay'

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
  const score = player.projectedScore || player.avgScore || '-'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex w-14 flex-col items-center gap-1 sm:w-16">
          <div
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-offset-2 ring-offset-emerald-700 sm:h-12 sm:w-12 ${avatarColorFor(player)} ${
              player.isCaptain
                ? 'ring-yellow-400'
                : player.isViceCaptain
                  ? 'ring-slate-200'
                  : 'ring-transparent'
            }`}
          >
            {initials(player.name)}
            {(player.isCaptain || player.isViceCaptain) && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-background text-[9px] font-bold text-foreground ring-1 ring-border">
                {player.isCaptain ? 'C' : 'VC'}
              </span>
            )}
            {player.injured && (
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-white ring-2 ring-emerald-700">
                <AlertCircle className="h-2.5 w-2.5" />
              </span>
            )}
          </div>

          <span className="max-w-full truncate text-[11px] font-medium text-white drop-shadow-sm">
            {shortName(player.name)}
          </span>
          <span className="rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {score}
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
          {player.injured && <div className="text-destructive">{player.injuryNote || 'Injured'}</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function FieldRow({ players }: { players: Player[] }) {
  if (players.length === 0) return <div />

  return (
    <div className="flex flex-wrap items-start justify-center gap-2 sm:gap-4">
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
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm">
        <div className="absolute inset-0 rounded-[50%] bg-gradient-to-b from-emerald-500 to-emerald-700 shadow-inner dark:from-emerald-700 dark:to-emerald-900" />

        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 133"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <ellipse cx="50" cy="66.5" rx="42" ry="60" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="0.6" />
          <circle cx="50" cy="66.5" r="10" fill="none" stroke="white" strokeOpacity="0.45" strokeWidth="0.6" />
          <rect x="44" y="60.5" width="12" height="12" fill="none" stroke="white" strokeOpacity="0.45" strokeWidth="0.5" />
          <rect x="35" y="6" width="30" height="9" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="0.5" />
          <rect x="35" y="118" width="30" height="9" fill="none" stroke="white" strokeOpacity="0.4" strokeWidth="0.5" />
        </svg>

        <div className="absolute inset-0 flex flex-col justify-between px-2 py-7 sm:px-4 sm:py-9">
          <FieldRow players={forwards} />
          <FieldRow players={midfielders} />
          <FieldRow players={rucks} />
          <FieldRow players={defenders} />
        </div>
      </div>

      {bench.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bench</div>
          <div className="flex flex-wrap justify-center gap-3 opacity-80 sm:justify-start">
            {bench.map((player) => (
              <FieldChip key={player.id} player={player} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
