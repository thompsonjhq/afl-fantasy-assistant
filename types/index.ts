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