'use client'

import { AlertCircle } from 'lucide-react'
import { Player } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TableCell, TableRow } from '@/components/ui/table'
import { avatarColorFor } from '@/lib/positionTheme'
import { initials, opponentLine } from '@/lib/playerDisplay'

export function SquadRosterRow({ player }: { player: Player }) {
  const avatarColor = avatarColorFor(player)

  return (
    <TableRow className={player.lineupPosition === 'BENCH' ? 'bg-muted/40' : undefined}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor}`}>
            {initials(player.name)}
            {player.injured && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white ring-2 ring-background">
                    <AlertCircle className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{player.injuryNote || 'Injured'}</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {player.isCaptain && <Badge className="h-5 bg-primary px-1.5 text-[10px] text-primary-foreground">C</Badge>}
              {player.isViceCaptain && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">VC</Badge>}
              <span className="truncate font-medium text-foreground">{player.name}</span>
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{player.position}{player.position2 ? `/${player.position2}` : ''}</Badge>
            </div>
            <div className="truncate text-xs text-muted-foreground">{opponentLine(player)}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right text-muted-foreground">{player.gamesPlayed ?? '-'}</TableCell>
      <TableCell className="text-right font-medium">{player.avgScore}</TableCell>
      <TableCell className="text-right text-muted-foreground">{player.last3Avg ?? '-'}</TableCell>
      <TableCell className="text-right text-muted-foreground">{player.last5Avg ?? '-'}</TableCell>
      <TableCell className="text-right">
        <Badge className={player.projectedScore ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}>
          {player.projectedScore || '-'}
        </Badge>
      </TableCell>
    </TableRow>
  )
}
