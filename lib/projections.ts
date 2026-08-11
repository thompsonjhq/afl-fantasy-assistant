import { FixtureContext, Player, ProjectionConfidence, ProjectionFactor } from '@/types'
import type { FittedModel } from '@/lib/model'
import { MIN_TRAINING_ROWS } from '@/lib/model'

export interface FixtureProjectionInput extends FixtureContext {}

export interface HistoricalProjectionInput {
  opponentAverage?: number
  fantasyAverageFromAflTables?: number
  gamesInSample?: number
  dataQuality?: 'none' | 'partial' | 'good'

  playerVenueGames?: number
  playerVenueAverage?: number
  playerVenuePointsVsExpected?: number

  opponentVenueGames?: number
  opponentVenueAverage?: number
  opponentVenuePointsVsExpected?: number
}

export interface RoleSecurityProjectionInput {
  recentTogPct?: number
  seasonTogPct?: number
  recentCentreClearances?: number
  seasonCentreClearances?: number
  gamesInSample: number
}

export interface MatchupProjectionInput {
  team: string
  position: string
  games: number
  avgScoreConceded: number
  avgExpectedScore: number
  pointsConcededVsExpected: number
}

export interface PlayerProjection {
  projectedScore: number
  projectionLow: number
  projectionHigh: number
  projectionConfidence: ProjectionConfidence
  projectionReason: string
  projectionFactors: ProjectionFactor[]
  projectionUpdatedAt: string
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const round1 = (value: number) => Math.round(value * 10) / 10

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function fantasyScoresFromPlayer(player: Player): number[] {
  return Array.isArray(player.scores)
    ? player.scores.filter((score) => typeof score === 'number' && Number.isFinite(score) && score > 0)
    : []
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const avg = mean(values)
  const variance = mean(values.map((value) => Math.pow(value - avg, 2)))
  return Math.sqrt(variance)
}

function formatSigned(value: number) {
  return `${value > 0 ? '+' : ''}${value}`
}

function getBaseAverage(player: Player, historical?: HistoricalProjectionInput): number {
  const apiAverage = safeNumber(player.avgScore)
  const historicalAverage = safeNumber(historical?.fantasyAverageFromAflTables)

  if (apiAverage > 0 && historicalAverage > 0) {
    return (apiAverage * 0.85) + (historicalAverage * 0.15)
  }

  if (apiAverage > 0) return apiAverage
  if (historicalAverage > 0) return historicalAverage

  return mean(fantasyScoresFromPlayer(player))
}

function getRecentAverage(player: Player): number {
  const scores = fantasyScoresFromPlayer(player)
  const last3 = safeNumber(player.last3Avg)
  const last5 = safeNumber(player.last5Avg)
  const lastScore = safeNumber(player.lastScore)

  if (last3 > 0 && last5 > 0) return (last3 * 0.65) + (last5 * 0.35)
  if (last3 > 0) return last3
  if (last5 > 0) return last5
  if (scores.length >= 3) return mean(scores.slice(-3))
  if (scores.length > 0) return mean(scores)
  if (lastScore > 0) return lastScore

  return 0
}

function getFormMultiplier(player: Player, baseAverage: number): number {
  if (baseAverage <= 0) return 1

  const recentAverage = getRecentAverage(player)
  if (recentAverage <= 0) return 1

  return clamp(recentAverage / baseAverage, 0.82, 1.18)
}

function getOpponentMultiplier(baseAverage: number, opponentAverage?: number, fixtureDifficulty?: string): number {
  if (baseAverage > 0 && opponentAverage && opponentAverage > 0) {
    return clamp(opponentAverage / baseAverage, 0.9, 1.1)
  }

  switch (fixtureDifficulty) {
    case 'Easy':
      return 1.035
    case 'Hard':
      return 0.96
    case 'Medium':
      return 1
    default:
      return 1
  }
}

function getHomeAwayAdjustment(fixture?: FixtureProjectionInput): number {
  if (!fixture || typeof fixture.isHome !== 'boolean') return 0
  return fixture.isHome ? 1.5 : -1.5
}

function getPlayerVenueAdjustment(historical?: HistoricalProjectionInput): number {
  const games = safeNumber(historical?.playerVenueGames)
  const pointsVsExpected = safeNumber(historical?.playerVenuePointsVsExpected)

  if (games <= 0 || pointsVsExpected === 0) return 0

  if (games === 1) return clamp(pointsVsExpected * 0.25, -2, 2)
  if (games === 2) return clamp(pointsVsExpected * 0.4, -4, 4)
  if (games <= 4) return clamp(pointsVsExpected * 0.6, -6, 6)

  return clamp(pointsVsExpected * 0.75, -8, 8)
}

function getOpponentVenueAdjustment(historical?: HistoricalProjectionInput): number {
  const games = safeNumber(historical?.opponentVenueGames)
  const pointsVsExpected = safeNumber(historical?.opponentVenuePointsVsExpected)

  if (games < 4 || pointsVsExpected === 0) return 0

  if (games < 8) return clamp(pointsVsExpected * 0.5, -4, 4)

  return clamp(pointsVsExpected * 0.7, -6, 6)
}

function getMatchupAdjustment(matchup?: MatchupProjectionInput | null): number {
  if (!matchup || matchup.games < 4) return 0
  return clamp(matchup.pointsConcededVsExpected, -12, 12)
}

/** Nudges the projection from a player's own recent-vs-season TOG%/Centre Clearances trend
 * (see lib/roleSecurity.ts) - a role-trust signal independent of raw scoring. Needs at least
 * a handful of games in the sample (enforced by the caller) so a single blowout game doesn't
 * swing it. Coefficients are deliberately small: this is a nudge on top of form/opponent, not
 * a replacement for them. */
function getRoleSecurityAdjustment(input?: RoleSecurityProjectionInput): number {
  if (!input) return 0

  const togDelta = (input.recentTogPct ?? input.seasonTogPct ?? 0) - (input.seasonTogPct ?? 0)
  const cclDelta = (input.recentCentreClearances ?? input.seasonCentreClearances ?? 0) - (input.seasonCentreClearances ?? 0)

  return clamp(togDelta * 0.15 + cclDelta * 1.2, -6, 6)
}

/** Maps a real scraped injury/return-timeframe note (from footywire's injury list) to a severity-aware penalty multiplier, replacing the old flat 0.25 constant used when all we had was a boolean flag. */
function getInjuryPenaltyMultiplier(injuryNote?: string): number {
  if (!injuryNote) return 0.25

  const note = injuryNote.toLowerCase()

  if (note.includes('season')) return 0
  if (note.includes('test')) return 0.85
  if (/\d+\s*-?\s*\d*\s*weeks?/.test(note)) return 0.05
  if (/round\s+\d+/.test(note)) return 0.05

  return 0.25
}

function getConfidence(player: Player, factors: ProjectionFactor[], volatility: number): ProjectionConfidence {
  const gamesPlayed = safeNumber(player.gamesPlayed)
  const unavailableFactors = factors.filter((factor) => !factor.available).length

  if (player.injured || gamesPlayed < 3 || unavailableFactors >= 4) return 'Low'
  if (gamesPlayed >= 8 && volatility <= 14 && unavailableFactors <= 1) return 'High'

  return 'Medium'
}

function getOpponentValue(fixture?: FixtureProjectionInput, historical?: HistoricalProjectionInput): string | number {
  if (historical?.opponentAverage) return round1(historical.opponentAverage)

  if (fixture?.opponent && fixture.opponent !== 'Unknown') {
    return fixture.difficulty && fixture.difficulty !== 'Unknown'
      ? `${fixture.opponent} (${fixture.difficulty})`
      : fixture.opponent
  }

  return 'Unknown'
}

function getOpponentDescription(fixture?: FixtureProjectionInput, historical?: HistoricalProjectionInput): string {
  if (historical?.opponentAverage) {
    return `Uses historical fantasy average against ${fixture?.opponent || 'this opponent'}.`
  }

  if (fixture?.opponent && fixture.opponent !== 'Unknown') {
    if (fixture.difficulty && fixture.difficulty !== 'Unknown') {
      return `Opponent is ${fixture.opponent}. Squiggle difficulty ${fixture.difficulty} used as a small fallback adjustment.`
    }

    return `Opponent is ${fixture.opponent}, but no direct player-vs-opponent scoring split is available; neutral opponent multiplier used.`
  }

  return 'No fixture opponent found; neutral opponent multiplier used.'
}

function isOpponentAvailable(fixture?: FixtureProjectionInput, historical?: HistoricalProjectionInput): boolean {
  return Boolean(
    historical?.opponentAverage ||
    (fixture?.opponent && fixture.opponent !== 'Unknown')
  )
}

/** Applies fitted regression coefficients (see lib/model.ts) to the same inputs the heuristic chain uses, so the fitted model can replace the hand-tuned constants once enough real game-log data exists to trust it. */
function getFittedModelScore(
  fittedModel: FittedModel | undefined,
  baseAverage: number,
  recentAverage: number,
  historical: HistoricalProjectionInput | undefined,
  matchup: MatchupProjectionInput | null | undefined,
  fixture: FixtureProjectionInput | undefined
): number | null {
  if (!fittedModel || fittedModel.sampleSize < MIN_TRAINING_ROWS || baseAverage <= 0) return null

  const { coefficients } = fittedModel
  const seasonAvg = baseAverage
  const recentForm = recentAverage > 0 ? recentAverage : baseAverage
  const opponentDvp = historical?.opponentAverage ?? matchup?.avgScoreConceded ?? baseAverage
  const venueEffect = historical?.playerVenuePointsVsExpected ?? 0
  const homeAway = fixture?.isHome === true ? 1 : fixture?.isHome === false ? -1 : 0

  return (
    coefficients.intercept +
    coefficients.seasonAvg * seasonAvg +
    coefficients.recentForm * recentForm +
    coefficients.opponentDvp * opponentDvp +
    coefficients.venueEffect * venueEffect +
    coefficients.homeAway * homeAway
  )
}

export function calculatePlayerProjection(
  player: Player,
  fixture?: FixtureProjectionInput,
  historical?: HistoricalProjectionInput,
  matchup?: MatchupProjectionInput | null,
  fittedModel?: FittedModel,
  roleSecurity?: RoleSecurityProjectionInput
): PlayerProjection {
  const baseAverage = getBaseAverage(player, historical)
  const recentAverage = getRecentAverage(player)
  const formMultiplier = getFormMultiplier(player, baseAverage)
  const opponentMultiplier = getOpponentMultiplier(baseAverage, historical?.opponentAverage, fixture?.difficulty)

  const matchupAdjustment = getMatchupAdjustment(matchup)
  const homeAwayAdjustment = getHomeAwayAdjustment(fixture)
  const playerVenueAdjustment = getPlayerVenueAdjustment(historical)
  const opponentVenueAdjustment = getOpponentVenueAdjustment(historical)
  const roleSecurityAdjustment = getRoleSecurityAdjustment(roleSecurity)
  const injuryMultiplier = player.injured ? getInjuryPenaltyMultiplier(player.injuryNote) : 1

  const afterForm = baseAverage * formMultiplier
  const afterOpponent = afterForm * opponentMultiplier
  const afterMatchup = afterOpponent + matchupAdjustment
  const afterHomeAway = afterMatchup + homeAwayAdjustment
  const afterPlayerVenue = afterHomeAway + playerVenueAdjustment
  const afterOpponentVenue = afterPlayerVenue + opponentVenueAdjustment
  const afterRoleSecurity = afterOpponentVenue + roleSecurityAdjustment

  const modelScore = getFittedModelScore(fittedModel, baseAverage, recentAverage, historical, matchup, fixture)
  const usedFittedModel = modelScore !== null

  const beforeInjury = usedFittedModel ? modelScore! : afterRoleSecurity
  const afterInjury = beforeInjury * injuryMultiplier

  const projectedScore = Math.max(0, Math.round(afterInjury))

  const scores = fantasyScoresFromPlayer(player)
  const rangeSource = scores.length >= 3
    ? standardDeviation(scores)
    : Math.max(8, Math.abs(safeNumber(player.highScore, projectedScore) - safeNumber(player.lowScore, projectedScore)) / 4)

  const volatility = clamp(rangeSource, 8, 26)

  const baseImpact = round1(baseAverage)
  const formImpact = round1(afterForm - baseAverage)
  const opponentImpact = round1(afterOpponent - afterForm)
  const injuryImpact = player.injured ? round1(afterInjury - beforeInjury) : 0

  const opponentValue = getOpponentValue(fixture, historical)
  const opponentDescription = getOpponentDescription(fixture, historical)
  const opponentAvailable = isOpponentAvailable(fixture, historical)

  const playerVenueGames = safeNumber(historical?.playerVenueGames)
  const playerVenuePointsVsExpected = safeNumber(historical?.playerVenuePointsVsExpected)
  const opponentVenueGames = safeNumber(historical?.opponentVenueGames)
  const opponentVenuePointsVsExpected = safeNumber(historical?.opponentVenuePointsVsExpected)

  const factors: ProjectionFactor[] = [
    {
      kind: 'baseline',
      label: 'Base',
      value: round1(baseAverage),
      impact: baseImpact,
      description: historical?.fantasyAverageFromAflTables
        ? 'AFL Fantasy average blended with AFL Tables-derived season average.'
        : 'AFL Fantasy season average used as the baseline.',
      available: baseAverage > 0,
    },
    {
      kind: 'form',
      label: 'Form',
      value: recentAverage > 0 ? `${Math.round(formMultiplier * 100)}%` : 'Neutral',
      impact: formImpact,
      description: recentAverage > 0
        ? `Recent average ${round1(recentAverage)} compared with base average.`
        : 'No recent score history available; neutral form multiplier used.',
      available: recentAverage > 0,
    },
    {
      kind: 'opponent',
      label: 'Opp',
      value: opponentValue,
      impact: opponentImpact,
      description: opponentDescription,
      available: opponentAvailable,
    },
    {
      kind: 'matchup',
      label: 'Matchup',
      value: matchup
        ? `${matchup.pointsConcededVsExpected > 0 ? '+' : ''}${matchup.pointsConcededVsExpected}`
        : 'No profile',
      impact: round1(matchupAdjustment),
      description: matchup
        ? `${fixture?.opponent || matchup.team} has allowed ${matchup.pointsConcededVsExpected > 0 ? '+' : ''}${matchup.pointsConcededVsExpected} points versus expectation to ${player.position}s over ${matchup.games} samples.`
        : 'No position-specific opponent profile available yet. Run build matchups.',
      available: Boolean(matchup && matchup.games >= 4),
    },
    {
     kind: 'home_away',
label: 'Home/Away',
      value: fixture?.isHome === true ? 'Home' : fixture?.isHome === false ? 'Away' : 'Unknown',
      impact: round1(homeAwayAdjustment),
      description: fixture?.isHome === true
        ? 'Small home-ground adjustment applied.'
        : fixture?.isHome === false
          ? 'Small away-game adjustment applied.'
          : 'Home/away status unavailable; neutral adjustment used.',
      available: typeof fixture?.isHome === 'boolean',
    },
    {
     kind: 'player_venue',
label: 'Player Venue',
      value: fixture?.venue || 'Neutral',
      impact: round1(playerVenueAdjustment),
      description: playerVenueGames > 0
        ? `${player.name} is ${playerVenuePointsVsExpected > 0 ? '+' : ''}${round1(playerVenuePointsVsExpected)} versus expectation at ${fixture?.venue || 'this venue'} over ${playerVenueGames} sample${playerVenueGames === 1 ? '' : 's'}. Adjustment is sample-size capped.`
        : fixture?.venue
          ? `No player-specific ${fixture.venue} sample found; neutral player venue adjustment used.`
          : 'No venue data available; neutral player venue adjustment used.',
      available: playerVenueGames > 0,
    },
    {
   kind: 'opponent_venue',
label: 'Opp Venue',
      value: fixture?.venue || 'Neutral',
      impact: round1(opponentVenueAdjustment),
      description: opponentVenueGames > 0
        ? `${fixture?.opponent || 'Opponent'} at ${fixture?.venue || 'this venue'} has allowed ${opponentVenuePointsVsExpected > 0 ? '+' : ''}${round1(opponentVenuePointsVsExpected)} versus expectation to ${player.position}s over ${opponentVenueGames} samples. Adjustment is sample-size capped.`
        : fixture?.venue && fixture?.opponent
          ? `No ${fixture.opponent} + ${fixture.venue} + ${player.position} venue matchup sample found; neutral opponent venue adjustment used.`
          : 'Opponent venue-position data unavailable; neutral adjustment used.',
      available: opponentVenueGames >= 4,
    },
    {
      kind: 'role_security',
      label: 'Role',
      value: roleSecurity
        ? `TOG ${round1(roleSecurity.recentTogPct ?? roleSecurity.seasonTogPct ?? 0)}%`
        : 'No data',
      impact: round1(roleSecurityAdjustment),
      description: roleSecurity
        ? `Last ${Math.min(3, roleSecurity.gamesInSample)} games' TOG%/Centre Clearances vs this season's own average (${round1(roleSecurity.seasonTogPct ?? 0)}% TOG, ${round1(roleSecurity.seasonCentreClearances ?? 0)} CCL) over ${roleSecurity.gamesInSample} sampled games.`
        : 'No advanced-stats history yet (needs footywire advanced-stats backfill) - neutral adjustment used.',
      available: Boolean(roleSecurity),
    },
    {
      kind: 'injury',
      label: 'Injury',
      value: player.injured ? player.injuryNote || 'Flagged' : 'Clear',
      impact: injuryImpact,
      description: player.injured
        ? `Penalty scaled to the real return timeframe (${player.injuryNote || 'unspecified'}) rather than a flat cut.`
        : 'No injury penalty applied.',
      available: true,
    },
    {
      kind: 'volatility',
      label: 'Vol',
      value: round1(volatility),
      impact: 0,
      description: scores.length >= 3
        ? 'Projection range uses actual score standard deviation.'
        : 'Projection range uses high/low fallback due to limited score history.',
      available: scores.length >= 3 || (safeNumber(player.highScore) > 0 && safeNumber(player.lowScore) > 0),
    },
    {
      kind: 'data',
      label: 'Model',
      value: usedFittedModel ? `Fitted (n=${fittedModel!.sampleSize}, R²=${fittedModel!.rSquared})` : 'Heuristic',
      impact: 0,
      description: usedFittedModel
        ? `Base score comes from a regression fitted on real footywire game-log history (${fittedModel!.sampleSize} rows, R² ${fittedModel!.rSquared}), not fixed constants.`
        : 'No fitted model available yet (or too little game-log data) - using the hand-tuned heuristic weights.',
      available: usedFittedModel,
    },
  ]

  const confidence = getConfidence(player, factors, volatility)
  const rangeMultiplier = confidence === 'High' ? 0.75 : confidence === 'Medium' ? 1 : 1.35
  const rangePadding = Math.round(volatility * rangeMultiplier)

  const reasonParts = factors
    .filter((factor) => factor.kind !== 'volatility')
    .map((factor) => `${factor.label}: ${factor.value}${factor.impact !== 0 ? ` (${formatSigned(factor.impact)})` : ''}`)

  return {
    projectedScore,
    projectionLow: Math.max(0, projectedScore - rangePadding),
    projectionHigh: projectedScore + rangePadding,
    projectionConfidence: confidence,
    projectionReason: reasonParts.join('; '),
    projectionFactors: factors,
    projectionUpdatedAt: new Date().toISOString(),
  }
}

export function calculateTeamProjections<T extends Player>(
  players: T[],
  fixturesByPlayerId: Record<string, FixtureProjectionInput | undefined> = {},
  historicalByPlayerId: Record<string, HistoricalProjectionInput | undefined> = {},
  matchupByPlayerId: Record<string, MatchupProjectionInput | null | undefined> = {},
  fittedModel?: FittedModel,
  roleSecurityByPlayerId: Record<string, RoleSecurityProjectionInput | undefined> = {}
) {
  return players
    .map((player) => ({
      ...player,
      ...calculatePlayerProjection(
        player,
        fixturesByPlayerId[player.id],
        historicalByPlayerId[player.id],
        matchupByPlayerId[player.id],
        fittedModel,
        roleSecurityByPlayerId[player.id]
      ),
      fixture: fixturesByPlayerId[player.id],
      matchup: matchupByPlayerId[player.id],
    }))
    .sort((a, b) => b.projectedScore - a.projectedScore)
}

/** Derives an at-a-glance Hot/Cold/Steady label from the same 'form' factor already computed
 * per player, so the Projections table can show it as a column without re-deriving anything. */
export function getFormLabel(factors?: ProjectionFactor[]): 'Hot' | 'Cold' | 'Steady' | null {
  const formFactor = factors?.find((factor) => factor.kind === 'form')
  if (!formFactor || !formFactor.available) return null
  if (formFactor.impact >= 2) return 'Hot'
  if (formFactor.impact <= -2) return 'Cold'
  return 'Steady'
}

/** Turns the existing volatility factor (8-26 range, lower = more consistent) into a 0-100
 * "Consistency" score for the table, where 100 is the steadiest scorer in the range. */
export function getConsistencyScore(factors?: ProjectionFactor[]): number | null {
  const volatilityFactor = factors?.find((factor) => factor.kind === 'volatility')
  if (!volatilityFactor || typeof volatilityFactor.value !== 'number') return null

  const volatility = clamp(volatilityFactor.value, 8, 26)
  return Math.round(100 - ((volatility - 8) / (26 - 8)) * 100)
}

export function isPositionEligible(player: Player, position: string): boolean {
  if (position === 'FLX' || position === 'BENCH') return true
  return player.position === position || player.position2 === position
}

export function findWeakestComparablePlayer(freeAgent: Player, squad: Player[]): Player | undefined {
  const comparable = squad
    .filter((player) => {
      const playerPosition = player.lineupPosition || player.position
      return isPositionEligible(freeAgent, playerPosition)
    })
    .filter((player) => !player.isCaptain && !player.isViceCaptain)

  return comparable.sort((a, b) => {
    const aValue = a.projectedScore || a.avgScore || 0
    const bValue = b.projectedScore || b.avgScore || 0
    return aValue - bValue
  })[0]
}