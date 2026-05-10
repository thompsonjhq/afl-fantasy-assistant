import { FixtureContext, SquiggleGame } from '@/types'

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

function cleanTeamName(team: string): string {
  return team.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
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