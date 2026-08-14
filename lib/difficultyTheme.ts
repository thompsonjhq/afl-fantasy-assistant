/** Badge colour for a fixture's opponent difficulty ('Easy'/'Medium'/'Hard'/'Unknown'),
 * shared between the Dashboard and Projections tables. Uses the same positive/negative/warning
 * status tokens every other badge in the app now draws from (see app/globals.css), rather than
 * a one-off emerald/rose/amber palette - the same "soft tint" shape (bg at 10%, text at full
 * strength, border at 30%) as Smart Draft Board's badges. */
export function difficultyBadgeClass(difficulty: string | undefined): string {
  switch (difficulty) {
    case 'Easy':
      return 'rounded border-positive/30 bg-positive/10 text-positive'
    case 'Hard':
      return 'rounded border-negative/30 bg-negative/10 text-negative'
    case 'Medium':
      return 'rounded border-warning/30 bg-warning/10 text-warning'
    default:
      return 'rounded border-border bg-muted text-muted-foreground'
  }
}
