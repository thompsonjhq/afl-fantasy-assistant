import { Player } from '@/types'
import { teamAbbr } from '@/lib/afl'

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase()
}

export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1] || name
}

export function opponentLine(player: Player): string {
  const fixture = player.fixture

  if (!fixture || !fixture.opponent || fixture.opponent === 'Unknown') return 'Bye / opponent unconfirmed'

  const venuePart = fixture.venue ? ` · ${fixture.venue}` : ''
  const homeAway = fixture.isHome === true ? 'H' : fixture.isHome === false ? 'A' : ''

  return `vs ${fixture.opponent}${homeAway ? ` (${homeAway})` : ''}${venuePart}`
}

/** Compact "vs GEE (A)" form of the fixture, for space-constrained tiles. */
export function opponentShort(player: Player): string {
  const fixture = player.fixture

  if (!fixture || !fixture.opponent || fixture.opponent === 'Unknown') return 'Bye'

  const homeAway = fixture.isHome === true ? 'H' : fixture.isHome === false ? 'A' : ''

  return `${teamAbbr(fixture.opponent)}${homeAway ? ` (${homeAway})` : ''}`
}
