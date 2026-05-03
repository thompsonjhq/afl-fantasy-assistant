import { SquiggleGame } from '@/types'

// Fetches upcoming fixtures from the free Squiggle API
export async function getSquiggleFixtures(round: number, year: number): Promise<SquiggleGame[]> {
  try {
    const res = await fetch(
      `https://api.squiggle.com.au/?q=games;round=${round};year=${year}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    return data.games || []
  } catch (error) {
    console.error('Failed to fetch Squiggle data:', error)
    return []
  }
}

// Gets the difficulty rating for a team's upcoming opponent
export function getOpponentDifficulty(
  team: string,
  games: SquiggleGame[]
): { opponent: string; difficulty: string; confidence: number } {
  const game = games.find(
    (g) => g.hteam === team || g.ateam === team
  )

  if (!game) return { opponent: 'Unknown', difficulty: 'Unknown', confidence: 0 }

  const isHome = game.hteam === team
  const opponent = isHome ? game.ateam : game.hteam
  const confidence = isHome ? game.hconfidence : 100 - game.hconfidence

  const difficulty =
    confidence >= 70 ? 'Easy' :
    confidence >= 45 ? 'Medium' :
    'Hard'

  return { opponent, difficulty, confidence }
}