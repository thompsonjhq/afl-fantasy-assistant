export interface AFLFantasyPlayer {
  id: number
  firstName: string
  lastName: string
  position: string[]
  squadId: number
  status: string
  stats: {
    gamesPlayed: number
    averagePoints: number
    totalPoints: number
    last3Avg: number
    last5Avg: number
    highScore: number
    lowScore: number
  }
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
const TEAM_ID = parseInt(process.env.AFL_TEAM_ID || '111668')
const SESSION_COOKIE = process.env.AFL_SESSION_COOKIE || ''

// Fetch all players with their stats - public endpoint, no auth needed
export async function fetchAllPlayers(): Promise<AFLFantasyPlayer[]> {
  try {
    const res = await fetch('https://fantasy.afl.com.au/json/draft/players.json', {
      headers: {
        'accept': 'application/json',
        'accept-encoding': 'gzip, deflate, br',
      },
      next: { revalidate: 3600 }, // cache for 1 hour
    })

    if (!res.ok) throw new Error(`Failed to fetch players: ${res.status}`)
    const data = await res.json()
    const players = Array.isArray(data) ? data : data.players || []
    return players
  } catch (error) {
    console.error('Error fetching AFL Fantasy players:', error)
    return []
  }
}

// Fetch your specific team lineup
export async function fetchMyTeam(): Promise<AFLFantasyTeam | null> {
  try {
    const res = await fetch(
      `https://fantasy.afl.com.au/api/en/draft/league/teams/${LEAGUE_ID}`,
      {
        headers: {
          'accept': 'application/json',
          'cookie': SESSION_COOKIE,
        },
        next: { revalidate: 300 }, // cache for 5 minutes
      }
    )

    if (!res.ok) throw new Error(`Failed to fetch team: ${res.status}`)
    const data = await res.json()
    const teams: AFLFantasyTeam[] = data?.success?.teams || []
    const myTeam = teams.find((t) => t.id === TEAM_ID)
    return myTeam || null
  } catch (error) {
    console.error('Error fetching AFL Fantasy team:', error)
    return null
  }
}

// Get your full squad with stats merged in
export async function fetchMySquadWithStats() {
  const [allPlayers, myTeam] = await Promise.all([
    fetchAllPlayers(),
    fetchMyTeam(),
  ])

  if (!myTeam) return null

  const playerMap = new Map(allPlayers.map((p) => [p.id, p]))

  const allMyIds = [
    ...myTeam.lineup.DEF,
    ...myTeam.lineup.MID,
    ...myTeam.lineup.RUC,
    ...myTeam.lineup.FWD,
    ...myTeam.lineup.FLX,
    ...myTeam.bench,
  ]

  const squadPlayers = allMyIds.map((id) => {
    const player = playerMap.get(id)
    if (!player) return null

    // Determine lineup slot
    let lineupPosition = 'BENCH'
    if (myTeam.lineup.DEF.includes(id)) lineupPosition = 'DEF'
    else if (myTeam.lineup.MID.includes(id)) lineupPosition = 'MID'
    else if (myTeam.lineup.RUC.includes(id)) lineupPosition = 'RUC'
    else if (myTeam.lineup.FWD.includes(id)) lineupPosition = 'FWD'
    else if (myTeam.lineup.FLX.includes(id)) lineupPosition = 'FLX'

    const isCaptain = id === myTeam.captainId
    const isViceCaptain = id === myTeam.viceCaptainId

    return {
      id: String(id),
      name: `${player.firstName} ${player.lastName}`,
      team: String(player.squadId),
      position: player.position[0] || 'MID',
      position2: player.position[1] || '',
      avgScore: player.stats?.averagePoints || 0,
      lastScore: 0, // not available from this endpoint
      totalPoints: player.stats?.totalPoints || 0,
      injured: player.status === 'injured',
      injuryNote: player.status !== 'playing' ? player.status : '',
      scores: [],
      scoreRounds: [],
      // Extra AFL Fantasy data
      last3Avg: player.stats?.last3Avg || 0,
      last5Avg: player.stats?.last5Avg || 0,
      highScore: player.stats?.highScore || 0,
      lowScore: player.stats?.lowScore || 0,
      gamesPlayed: player.stats?.gamesPlayed || 0,
      lineupPosition,
      isCaptain,
      isViceCaptain,
      squadId: player.squadId,
    }
  }).filter(Boolean)

  return {
    team: myTeam,
    players: squadPlayers,
  }
}

// Map squadId to team name
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
  1010: 'GWS Giants',
}