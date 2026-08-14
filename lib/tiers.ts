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
