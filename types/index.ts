export type ProjectionConfidence = 'Low' | 'Medium' | 'High'

export type ProjectionFactorKind =
  | 'baseline'
  | 'form'
  | 'opponent'
  | 'matchup'
  | 'venue'
  | 'home_away'
  | 'player_venue'
  | 'opponent_venue'
  | 'injury'
  | 'volatility'
  | 'data'
  | 'role_security'

export interface ProjectionFactor {
  kind: ProjectionFactorKind
  label: string
  value: string | number
  impact: number
  description: string
  available: boolean
}

export interface PlayerProjectionFields {
  projectedScore?: number
  projectionLow?: number
  projectionHigh?: number
  projectionConfidence?: ProjectionConfidence
  projectionReason?: string
  projectionFactors?: ProjectionFactor[]
  projectionUpdatedAt?: string
}

export interface Player extends PlayerProjectionFields {
  id: string
  name: string
  team: string
  position: string
  position2: string
  avgScore: number
  lastScore: number
  totalPoints: number
  injured: boolean
  injuryNote: string
  scores: number[]
  scoreRounds: number[]
  lineupPosition?: string
  isCaptain?: boolean
  isViceCaptain?: boolean
  last3Avg?: number
  last5Avg?: number
  highScore?: number
  lowScore?: number
  gamesPlayed?: number
  aflFantasyId?: number
  squadId?: number
  status?: string
  ownedByTeamId?: number
  ownedByTeamName?: string
  ownershipPct?: number
  fixture?: FixtureContext
  fixtureStrip?: FixtureStripEntry[]
}

export interface PlayerWithStats extends Player {
  formRating: string
  trend: string
  consistency: string
  recentAvg: number
  seasonAvg: number
}

export interface SquiggleGame {
  id: number
  round: number
  year: number
  hteam: string
  ateam: string
  hscore: number | null
  ascore: number | null
  hscore_progression: null
  ascore_progression: null
  winner: string | null
  complete: number
  tip: string
  hconfidence: number
  date: string
  venue: string
}

export interface FixtureContext {
  opponent: string
  difficulty: string
  confidence: number
  venue?: string
  isHome?: boolean
  date?: string
}

/** One round in a multi-round look-ahead ("Fixtures" strip) - opponent 'Unknown' means no
 * fixture found for that round (bye, or past the end of the fixture list). */
export interface FixtureStripEntry {
  round: number
  opponent: string
  isHome?: boolean
  difficulty: string
}

export interface AnalysisResult {
  type: 'strengths' | 'projections' | 'freeagents' | 'trades' | 'captain'
  content: string
  generatedAt: string
}

export interface FreeAgentComparison {
  player: Player
  projectedScore: number
  replacementPlayer?: Player
  netGain?: number
  reason: string
}

export interface PlayerGameLogRow {
  playerName: string
  team?: string
  season: number
  round: number
  matchId?: number
  date?: string
  opponent?: string
  venue?: string
  isHome?: boolean
  win?: boolean
  fantasyPoints: number
  disposals?: number
  goals?: number
  kicks?: number
  handballs?: number
  marks?: number
  behinds?: number
  tackles?: number
  hitouts?: number
  goalAssists?: number
  inside50s?: number
  clearances?: number
  clangers?: number
  rebound50s?: number
  freesFor?: number
  freesAgainst?: number
  bounces?: number
}

/** Advanced per-match stats from footywire's ft_match_statistics?mid=<id>&advv=Y page (see
 * lib/scrapers/footywireAdvancedStats.ts). Unlike PlayerGameLogRow this comes from a per-match
 * page covering both teams at once, not a per-player-season page. */
export interface PlayerAdvancedStatRow {
  playerName: string
  team: string
  opponent: string
  season: number
  matchId: number
  togPct?: number
  contestedPossessions?: number
  uncontestedPossessions?: number
  effectiveDisposals?: number
  disposalEfficiencyPct?: number
  contestedMarks?: number
  goalAssists?: number
  marksInside50?: number
  onePercenters?: number
  bounces?: number
  centreClearances?: number
  stoppageClearances?: number
  scoreInvolvements?: number
  metresGained?: number
  turnovers?: number
  intercepts?: number
  tacklesInside50?: number
}

export interface InjuryEntry {
  playerName: string
  club: string
  injuryType: string
  returning: string
  scrapedAt: string
}

export interface TeamSelectionChange {
  club: string
  season: number
  round: number
  ins: string[]
  outs: string[]
  scrapedAt: string
}

export const LINEUP_STRUCTURE = [
  { label: 'DEF 1', position: 'DEF', flex: false },
  { label: 'DEF 2', position: 'DEF', flex: false },
  { label: 'DEF 3', position: 'DEF', flex: false },
  { label: 'MID 1', position: 'MID', flex: false },
  { label: 'MID 2', position: 'MID', flex: false },
  { label: 'MID 3', position: 'MID', flex: false },
  { label: 'MID 4', position: 'MID', flex: false },
  { label: 'RUC', position: 'RUC', flex: false },
  { label: 'FWD 1', position: 'FWD', flex: false },
  { label: 'FWD 2', position: 'FWD', flex: false },
  { label: 'FWD 3', position: 'FWD', flex: false },
  { label: 'FLEX', position: 'FLEX', flex: true },
  { label: 'BENCH 1', position: 'BENCH', flex: true },
  { label: 'BENCH 2', position: 'BENCH', flex: true },
  { label: 'BENCH 3', position: 'BENCH', flex: true },
  { label: 'BENCH 4', position: 'BENCH', flex: true },
]