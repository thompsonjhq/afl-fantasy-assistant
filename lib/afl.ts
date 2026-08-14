import { FixtureContext, FixtureStripEntry, SquiggleGame } from '@/types'

const TEAM_ALIASES: Record<string, string[]> = {
  Adelaide: ['Adelaide', 'Adelaide Crows'],
  'Brisbane Lions': ['Brisbane Lions', 'Brisbane'],
  Carlton: ['Carlton'],
  Collingwood: ['Collingwood'],
  Essendon: ['Essendon'],
  Fremantle: ['Fremantle'],
  Geelong: ['Geelong', 'Geelong Cats'],
  'Gold Coast': ['Gold Coast', 'Gold Coast Suns'],
  'Greater Western Sydney': ['Greater Western Sydney', 'GWS', 'GWS Giants'],
  Hawthorn: ['Hawthorn'],
  Melbourne: ['Melbourne'],
  'North Melbourne': ['North Melbourne', 'North Melbourne Kangaroos'],
  'Port Adelaide': ['Port Adelaide', 'Port'],
  Richmond: ['Richmond'],
  'St Kilda': ['St Kilda', 'St Kilda Saints'],
  Sydney: ['Sydney', 'Sydney Swans'],
  'West Coast': ['West Coast', 'West Coast Eagles'],
  'Western Bulldogs': ['Western Bulldogs', 'Footscray'],
}

const TEAM_ABBREVIATIONS: Record<string, string> = {
  Adelaide: 'ADE',
  'Brisbane Lions': 'BRL',
  Carlton: 'CAR',
  Collingwood: 'COL',
  Essendon: 'ESS',
  Fremantle: 'FRE',
  Geelong: 'GEE',
  'Gold Coast': 'GCS',
  'Greater Western Sydney': 'GWS',
  Hawthorn: 'HAW',
  Melbourne: 'MEL',
  'North Melbourne': 'NTH',
  'Port Adelaide': 'PTA',
  Richmond: 'RIC',
  'St Kilda': 'STK',
  Sydney: 'SYD',
  'West Coast': 'WCE',
  'Western Bulldogs': 'WBD',
}

/** Squiggle can return placeholder fixture rows with a null hteam/ateam for rounds that aren't
 * fully scheduled yet (finals, byes) - this only started getting exercised once the Fixtures
 * strip began fetching rounds beyond "the current one", which is always fully populated. Treat
 * a null/missing team name as never matching a real one, rather than crashing. */
function cleanTeamName(team: string | null | undefined): string {
  return (team || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
}

function normaliseTeamName(team: string): string {
  const clean = cleanTeamName(team)

  for (const [canonical, aliases] of Object.entries(TEAM_ALIASES)) {
    if (aliases.some((alias) => cleanTeamName(alias) === clean)) {
      return canonical
    }
  }

  return team
}

/** Short 3-letter code for a team name, for use in space-constrained UI (field view tiles). */
export function teamAbbr(team: string): string {
  const canonical = normaliseTeamName(team)
  return TEAM_ABBREVIATIONS[canonical] || team.slice(0, 3).toUpperCase()
}

function sameTeam(a: string, b: string): boolean {
  return normaliseTeamName(a) === normaliseTeamName(b)
}

function getDifficultyForFixture(team: string, fixture: SquiggleGame): string {
  const tip = fixture.tip || ''
  const confidence = Number(fixture.hconfidence || 0)

  if (!tip || confidence === 0) return 'Unknown'

  const userTeamIsTipped = sameTeam(tip, team)

  if (userTeamIsTipped && confidence >= 70) return 'Easy'
  if (!userTeamIsTipped && confidence >= 70) return 'Hard'

  return 'Medium'
}

export async function getSquiggleFixtures(round: number, year: number): Promise<SquiggleGame[]> {
  try {
    const res = await fetch(
      `https://api.squiggle.com.au/?q=games;year=${year};round=${round}`,
      {
        headers: {
          'User-Agent': 'afl-fantasy-assistant',
        },
        next: { revalidate: 60 * 60 },
      }
    )

    if (!res.ok) {
      throw new Error(`Squiggle API returned ${res.status}`)
    }

    const data = await res.json()
    return Array.isArray(data.games) ? data.games : []
  } catch (error) {
    console.error('Failed to fetch Squiggle fixtures:', error)
    return []
  }
}

/**
 * The lowest round number that still has an unfinished game, per Squiggle's own
 * completion data - the authoritative "current round" rather than one inferred from
 * whatever scores happen to be recorded locally (which lags behind for teams that
 * play later in the round).
 */
export async function getCurrentRound(year: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.squiggle.com.au/?q=games;year=${year}`,
      {
        headers: {
          'User-Agent': 'afl-fantasy-assistant',
        },
        next: { revalidate: 60 * 60 },
      }
    )

    if (!res.ok) {
      throw new Error(`Squiggle API returned ${res.status}`)
    }

    const data = await res.json()
    const games: SquiggleGame[] = Array.isArray(data.games) ? data.games : []
    if (games.length === 0) return null

    const incompleteRounds = games
      .filter((game) => Number(game.complete) < 100)
      .map((game) => game.round)

    if (incompleteRounds.length > 0) return Math.min(...incompleteRounds)

    return Math.max(...games.map((game) => game.round))
  } catch (error) {
    console.error('Failed to fetch Squiggle current round:', error)
    return null
  }
}

export function getFixtureForTeam(team: string, fixtures: SquiggleGame[]): SquiggleGame | undefined {
  return fixtures.find((game) => sameTeam(game.hteam, team) || sameTeam(game.ateam, team))
}

export function getOpponentDifficulty(team: string, fixtures: SquiggleGame[]) {
  const fixture = getFixtureForTeam(team, fixtures)

  if (!fixture) {
    return {
      opponent: 'Unknown',
      difficulty: 'Unknown',
      confidence: 0,
    }
  }

  const isHome = sameTeam(fixture.hteam, team)
  const opponent = isHome ? fixture.ateam : fixture.hteam
  const difficulty = getDifficultyForFixture(team, fixture)

  return {
    opponent,
    difficulty,
    confidence: Number(fixture.hconfidence || 0),
  }
}

/** Next `count` rounds' opponents for every distinct team in `teams`, for the Projections
 * table's Fixtures strip. Fetches each round's fixture list once (cached by getSquiggleFixtures)
 * regardless of squad size, then derives every team's context from that shared list in memory -
 * cheap even for a full free-agent pool. Rounds past the end of the fixture list (or a real bye)
 * both fall out as opponent 'Unknown' via getFixtureContext's existing "no fixture found" path -
 * the UI renders that as a bye chip either way. */
export async function getFixtureStripsForTeams(
  teams: string[],
  fromRound: number,
  season: number,
  count = 5
): Promise<Record<string, FixtureStripEntry[]>> {
  const uniqueTeams = [...new Set(teams)]
  const rounds = Array.from({ length: count }, (_, i) => fromRound + i)

  const fixturesByRound = await Promise.all(rounds.map((round) => getSquiggleFixtures(round, season)))

  const result: Record<string, FixtureStripEntry[]> = {}

  for (const team of uniqueTeams) {
    result[team] = rounds.map((round, index) => {
      const context = getFixtureContext(team, fixturesByRound[index])
      return { round, opponent: context.opponent, isHome: context.isHome, difficulty: context.difficulty }
    })
  }

  return result
}

export function getFixtureContext(team: string, fixtures: SquiggleGame[]): FixtureContext {
  const fixture = getFixtureForTeam(team, fixtures)

  if (!fixture) {
    return {
      opponent: 'Unknown',
      difficulty: 'Unknown',
      confidence: 0,
      venue: undefined,
      isHome: undefined,
      date: undefined,
    }
  }

  const isHome = sameTeam(fixture.hteam, team)
  const opponent = isHome ? fixture.ateam : fixture.hteam
  const difficulty = getDifficultyForFixture(team, fixture)

  return {
    opponent,
    difficulty,
    confidence: Number(fixture.hconfidence || 0),
    venue: fixture.venue || undefined,
    isHome,
    date: fixture.date || undefined,
  }
}