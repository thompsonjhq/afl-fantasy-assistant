/** Simple gap-detection tiering: given a list already sorted by score descending, starts a new
 * tier wherever the drop to the next player is unusually large relative to the list's own
 * average drop. No ML, no fixed band sizes - a tight top group stays one tier, a group with a
 * real talent cliff splits. Mirrors what Smart Draft Board's Tiers view does for draft strategy,
 * adapted here for "who's actually still worth starting/picking up" in a season context. */
export function computeTiers<T>(sortedDesc: T[], scoreOf: (item: T) => number): Map<T, number> {
  const scores = sortedDesc.map(scoreOf)
  const gaps: number[] = []

  for (let i = 0; i < scores.length - 1; i++) {
    gaps.push(scores[i] - scores[i + 1])
  }

  const meanGap = gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0
  const threshold = Math.max(meanGap * 1.8, 3)

  const tierByItem = new Map<T, number>()
  let tier = 1

  sortedDesc.forEach((item, index) => {
    tierByItem.set(item, tier)
    if (index < gaps.length && gaps[index] > threshold) tier += 1
  })

  return tierByItem
}

export interface TierGrade {
  label: string
  tone: 'positive' | 'negative' | 'warning' | 'neutral'
}

const TIER_GRADES: TierGrade[] = [
  { label: 'A+', tone: 'positive' },
  { label: 'A', tone: 'positive' },
  { label: 'B+', tone: 'neutral' },
  { label: 'B', tone: 'neutral' },
  { label: 'C+', tone: 'warning' },
  { label: 'C', tone: 'warning' },
  { label: 'D', tone: 'negative' },
]

/** Maps a 1-indexed tier (see computeTiers) to a single-letter grade, the same at-a-glance
 * quality signal Smart Draft Board shows next to the player name. Tiers past the lookup table
 * all collapse to the lowest grade rather than throwing - a squad with more gap-detected tiers
 * than grades just bottoms out at D, it doesn't crash. */
export function gradeForTier(tier: number): TierGrade {
  return TIER_GRADES[Math.min(tier - 1, TIER_GRADES.length - 1)] ?? TIER_GRADES[TIER_GRADES.length - 1]
}
