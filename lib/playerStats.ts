import { Player, PlayerWithStats } from '@/types'

export function enrichPlayerStats(player: Player): PlayerWithStats {
  const scores = player.scores || []

  const seasonAvg = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : player.avgScore

  const recent = scores.slice(-5)
  const recentAvg = recent.length > 0
    ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length)
    : player.lastScore

  // Trend: compare last 3 to previous 3
  const last3 = scores.slice(-3)
  const prev3 = scores.slice(-6, -3)
  const last3Avg = last3.length > 0 ? last3.reduce((a, b) => a + b, 0) / last3.length : 0
  const prev3Avg = prev3.length > 0 ? prev3.reduce((a, b) => a + b, 0) / prev3.length : 0

  let trend = 'Stable'
  if (prev3.length > 0) {
    if (last3Avg > prev3Avg + 10) trend = '↑ Rising'
    else if (last3Avg < prev3Avg - 10) trend = '↓ Falling'
    else trend = '→ Stable'
  }

  // Consistency: standard deviation
  let consistency = 'Unknown'
  if (scores.length >= 3) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length
    const stdDev = Math.sqrt(variance)
    if (stdDev < 15) consistency = 'Very Consistent'
    else if (stdDev < 25) consistency = 'Consistent'
    else if (stdDev < 35) consistency = 'Variable'
    else consistency = 'Highly Variable'
  }

  // Form rating
  let formRating = 'Average'
  if (recentAvg >= seasonAvg + 15) formRating = 'Excellent'
  else if (recentAvg >= seasonAvg + 5) formRating = 'Good'
  else if (recentAvg <= seasonAvg - 15) formRating = 'Poor'
  else if (recentAvg <= seasonAvg - 5) formRating = 'Below Average'

  return {
    ...player,
    seasonAvg,
    recentAvg,
    trend,
    consistency,
    formRating,
  }
}

export interface SelectionContext {
  ins: string[]
  outs: string[]
}

export function buildPlayerContext(
  player: PlayerWithStats,
  opponent: string,
  difficulty: string,
  selectionContext?: SelectionContext
): string {
  const scores = player.scores || []
  const scoreHistory = scores.length > 0
    ? scores.map((s, i) => `R${player.scoreRounds?.[i] ?? i + 1}: ${s}`).join(', ')
    : 'No scores recorded yet'

  const positions = player.position2
    ? `${player.position}/${player.position2}`
    : player.position

  const injuryStatus = player.injured
    ? `INJURED - ${player.injuryNote || 'Flagged, no further detail available'} (source: footywire injury list)`
    : 'Fit'

  const hasSelectionNews = selectionContext && (selectionContext.ins.length > 0 || selectionContext.outs.length > 0)
  const selectionLine = hasSelectionNews
    ? `\nThis week's real team selection changes for ${player.team} - Ins: ${selectionContext!.ins.join(', ') || 'none'} | Outs: ${selectionContext!.outs.join(', ') || 'none'} (source: footywire team selections)`
    : ''

  return `
PLAYER: ${player.name}
Team: ${player.team} | Position: ${positions}
Season Average: ${player.seasonAvg} | Recent Average (last 5): ${player.recentAvg}
Last Score: ${player.lastScore}
Form Rating: ${player.formRating} | Trend: ${player.trend} | Consistency: ${player.consistency}
Score History: ${scoreHistory}
Highest Score: ${scores.length > 0 ? Math.max(...scores) : 'N/A'} | Lowest Score: ${scores.length > 0 ? Math.min(...scores) : 'N/A'}
Upcoming Opponent: ${opponent} (Difficulty: ${difficulty})
Injury Status: ${injuryStatus}${selectionLine}
`.trim()
}