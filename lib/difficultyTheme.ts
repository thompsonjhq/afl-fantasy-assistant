/** Badge colour for a fixture's opponent difficulty ('Easy'/'Medium'/'Hard'/'Unknown'),
 * shared between the Dashboard and Projections tables. */
export function difficultyBadgeClass(difficulty: string | undefined): string {
  switch (difficulty) {
    case 'Easy':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
    case 'Hard':
      return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-400'
    case 'Medium':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400'
    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}
