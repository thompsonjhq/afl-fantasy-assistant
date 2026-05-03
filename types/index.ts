export interface Player {
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

export interface AnalysisResult {
  type: 'strengths' | 'projections' | 'freeagents' | 'trades' | 'captain'
  content: string
  generatedAt: string
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