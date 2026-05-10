export interface AFLFantasyPlayer {
  id: number
  squadId: number
  firstName: string
  lastName: string
  status: string
  position: string[]
  originalPosition?: string[]
  stats: {
    gamesPlayed: number
    averagePoints: number
    totalPoints: number
    last3Avg: number
    last5Avg: number
    highScore: number
    lowScore: number
    lastRoundScore?: number
    prevRoundScore?: number
    scores?: Record<string, number>
    seasonRank?: number
    roundRank?: number
  }
  locked?: boolean
  lockedStandard?: boolean
  lockedSaturday?: boolean
  isRookie?: boolean
  dob?: string
  rosteredPercentage?: {
    redraft?: number
    keeper?: number
    dynasty?: number
  }
  startingPercentage?: number
  seasons?: string[]
}

export interface AFLFantasyTeam {
  id: number
  name: string
  captainId: number
  viceCaptainId: number
  lineup: {
    DEF: number[]
    MID: number[]
    RUC: number[]
    FWD: number[]
    FLX: number[]
  }
  bench: number[]
}

const LEAGUE_ID = process.env.AFL_LEAGUE_ID || '18066'
const TEAM_ID = parseInt(process.env.AFL_TEAM_ID || '111668', 10)
const SESSION_COOKIE = process.env.AFL_SESSION_COOKIE || ''

export const SQUAD_ID_TO_TEAM: Record<number, string> = {
  10: 'Adelaide',
  20: 'Brisbane Lions',
  30: 'Carlton',
  40: 'Collingwood',
  50: 'Essendon',
  60: 'Fremantle',
  70: 'Geelong',
  80: 'Hawthorn',
  90: 'Melbourne',
  100: 'North Melbourne',
  110: 'Port Adelaide',
  120: 'Richmond',
  130: 'St Kilda',
  140: 'Western Bulldogs',
  150: 'West Coast',
  160: 'Sydney',
  1000: 'Gold Coast',
  1010: 'Greater Western Sydney',
}

function getLineupIds(team: AFLFantasyTeam): number[] {
  return [
    ...(team.lineup?.DEF || []),
    ...(team.lineup?.MID || []),
    ...(team.lineup?.RUC || []),
    ...(team.lineup?.FWD || []),
    ...(team.lineup?.FLX || []),
    ...(team.bench || []),
  ]
}

function getScoresFromStats(player: AFLFantasyPlayer) {
  const scoresObject = player.stats?.scores || {}

  const entries = Object.entries(scoresObject)
    .map(([round, score]) => ({
      round: Number(round),
      score: Number(score),
    }))
    .filter((entry) =>
      Number.isFinite(entry.round) &&
      Number.isFinite(entry.score) &&
      entry.round > 0 &&
      entry.score >= 0
    )
    .sort((a, b) => a.round - b.round)

  return {
    scores: entries.map((entry) => entry.score),
    scoreRounds: entries.map((entry) => entry.round),
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

export function getAflFantasyTeamName(player: AFLFantasyPlayer): string {
  return SQUAD_ID_TO_TEAM[player.squadId] || `Team ${player.squadId}`
}

export async function fetchAllPlayers(): Promise<AFLFantasyPlayer[]> {
  try {
    const res = await fetch('https://fantasy.afl.com.au/json/draft/players.json', {
      headers: {
        accept: 'application/json',
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) throw new Error(`Failed to fetch players: ${res.status}`)

    const data = await res.json()
    return Array.isArray(data) ? data : data.players || []
  } catch (error) {
    console.error('Error fetching AFL Fantasy players:', error)
    return []
  }
}

export async function fetchLeagueTeams(): Promise<AFLFantasyTeam[]> {
  try {
    const res = await fetch(
      `https://fantasy.afl.com.au/api/en/draft/league/teams/${LEAGUE_ID}`,
      {
        headers: {
          accept: 'application/json',
          cookie: SESSION_COOKIE,
        },
        next: { revalidate: 300 },
      }
    )

    if (!res.ok) throw new Error(`Failed to fetch league teams: ${res.status}`)

    const data = await res.json()
    return data?.success?.teams || []
  } catch (error) {
    console.error('Error fetching AFL Fantasy league teams:', error)
    return []
  }
}

export async function fetchMyTeam(): Promise<AFLFantasyTeam | null> {
  const teams = await fetchLeagueTeams()
  return teams.find((team) => team.id === TEAM_ID) || null
}

export async function fetchOwnedPlayerIds(): Promise<Set<number>> {
  const teams = await fetchLeagueTeams()
  return new Set(teams.flatMap(getLineupIds))
}

export function mapAflFantasyPlayer(
  player: AFLFantasyPlayer,
  lineupPosition = 'BENCH',
  team?: AFLFantasyTeam
) {
  const id = player.id
  const scoreData = getScoresFromStats(player)
  const scores = scoreData.scores
  const last3 = scores.slice(-3)
  const last5 = scores.slice(-5)

  const calculatedTotal = scores.reduce((sum, score) => sum + score, 0)
  const calculatedAverage = average(scores)

  const lastScore =
    player.stats?.lastRoundScore ||
    player.stats?.prevRoundScore ||
    scores[scores.length - 1] ||
    0

  return {
    id: String(id),
    name: `${player.firstName} ${player.lastName}`,
    team: getAflFantasyTeamName(player),
    position: player.position?.[0] || 'MID',
    position2: player.position?.[1] || '',
    avgScore: player.stats?.averagePoints || calculatedAverage || 0,
    lastScore,
    totalPoints: player.stats?.totalPoints || calculatedTotal || 0,
    injured: player.status !== 'playing' && player.status !== 'available',
    injuryNote: player.status !== 'playing' && player.status !== 'available' ? player.status : '',
    scores,
    scoreRounds: scoreData.scoreRounds,
    last3Avg: player.stats?.last3Avg || average(last3),
    last5Avg: player.stats?.last5Avg || average(last5),
    highScore: player.stats?.highScore || (scores.length ? Math.max(...scores) : 0),
    lowScore: player.stats?.lowScore || (scores.length ? Math.min(...scores) : 0),
    gamesPlayed: player.stats?.gamesPlayed || scores.length,
    lineupPosition,
    isCaptain: team ? id === team.captainId : false,
    isViceCaptain: team ? id === team.viceCaptainId : false,
    aflFantasyId: id,
    squadId: player.squadId,
    status: player.status,
    rosteredPercentage: player.rosteredPercentage,
    startingPercentage: player.startingPercentage,
  }
}

export async function fetchMySquadWithStats() {
  const [allPlayers, myTeam] = await Promise.all([
    fetchAllPlayers(),
    fetchMyTeam(),
  ])

  if (!myTeam) return null

  const playerMap = new Map(allPlayers.map((player) => [player.id, player]))
  const allMyIds = getLineupIds(myTeam)

  const squadPlayers = allMyIds
    .map((id) => {
      const player = playerMap.get(id)
      if (!player) return null

      let lineupPosition = 'BENCH'

      if (myTeam.lineup.DEF.includes(id)) lineupPosition = 'DEF'
      else if (myTeam.lineup.MID.includes(id)) lineupPosition = 'MID'
      else if (myTeam.lineup.RUC.includes(id)) lineupPosition = 'RUC'
      else if (myTeam.lineup.FWD.includes(id)) lineupPosition = 'FWD'
      else if (myTeam.lineup.FLX.includes(id)) lineupPosition = 'FLX'

      return mapAflFantasyPlayer(player, lineupPosition, myTeam)
    })
    .filter(Boolean)

  return {
    team: myTeam,
    players: squadPlayers,
  }
}

export async function fetchFreeAgentsWithStats(limit = 120) {
  const [allPlayers, teams] = await Promise.all([
    fetchAllPlayers(),
    fetchLeagueTeams(),
  ])

  const ownedIds = new Set(teams.flatMap(getLineupIds))
  const ownerByPlayerId = new Map<number, AFLFantasyTeam>()

  teams.forEach((team) => {
    getLineupIds(team).forEach((playerId) => ownerByPlayerId.set(playerId, team))
  })

  return allPlayers
    .filter((player) => !ownedIds.has(player.id))
    .map((player) => {
      const mapped = mapAflFantasyPlayer(player)
      const owner = ownerByPlayerId.get(player.id)

      return {
        ...mapped,
        ownedByTeamId: owner?.id,
        ownedByTeamName: owner?.name,
      }
    })
    .filter((player) => player.avgScore > 0 || player.gamesPlayed > 0)
    .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
    .slice(0, limit)
}