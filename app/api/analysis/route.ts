import { NextRequest, NextResponse } from 'next/server'
import { analyzeWithGroq } from '@/lib/groq'
import { getSquiggleFixtures, getOpponentDifficulty } from '@/lib/afl'
import { getPlayerNews, getTeamNews } from '@/lib/newsSearch'
import { enrichPlayerStats, buildPlayerContext } from '@/lib/playerStats'
import { Player, PlayerWithStats } from '@/types'

const CURRENT_YEAR = 2025

const SYSTEM_PROMPTS = {
  strengths: `You are an expert AFL Fantasy Draft coach. You have been given detailed data about each player including their full season score history, form trends, consistency ratings, opponent difficulty, and current news. 

Analyse this team thoroughly and provide specific, actionable insights. Reference actual player names, their specific scores, and concrete trends. Do NOT give generic advice. Point out specific players who are risks or opportunities based on the data provided.

Structure your response with: Team Overview, Key Strengths (name specific players), Key Weaknesses (name specific players and why), Injury Concerns, and Priority Actions.`,

  projections: `You are an expert AFL Fantasy statistician with deep knowledge of AFL players. You have been given each player's full season score history, recent form, consistency rating, and upcoming opponent.

Project a specific score for each player this round. Use their actual score history to inform your projection - look at patterns, how they perform against similar opponents, and their current trend. Give a specific projected score range (e.g. 95-110) with clear reasoning based on their actual numbers.

Format as a ranked list from highest to lowest projected score. Be specific and reference their actual scores.`,

  freeagents: `You are an expert AFL Fantasy Draft team manager. Analyse the user's squad weaknesses based on the detailed player data provided, then recommend free agent targets.

Consider: which positions are underperforming, which players have declining form, and what type of player would best fill the gaps. Give specific recommendations with reasoning tied to the actual squad data.`,

  trades: `You are an expert AFL Fantasy Draft trade analyst. Review the squad data carefully and identify trade targets. 

Consider: players whose form has dropped significantly below their season average (trade away), positions that need strengthening, and what fair trade value looks like based on season averages. Be specific about which players to trade and why, referencing their actual numbers.`,

  captain: `You are an expert AFL Fantasy Draft captain selector with deep AFL knowledge. Based on the detailed player data provided, recommend the best captain and vice-captain for this round.

Consider: ceiling scores (look at their highest scores this season), upcoming opponent difficulty, current form trend, home vs away patterns if evident, and consistency. Give a top 3 captain ranking with specific reasoning for each. Then recommend the optimal starting 18 based on current form.`,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, players, round, freeAgents } = body

    if (!type || !players) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Step 1: Get fixture data
    const fixtures = await getSquiggleFixtures(round || 1, CURRENT_YEAR)

    // Step 2: Enrich players with stats
    const enrichedPlayers: PlayerWithStats[] = players.map((p: Player) => enrichPlayerStats(p))

    // Step 3: Get opponent info for each player
    const playersWithFixtures = enrichedPlayers.map((player) => ({
      ...player,
      fixture: getOpponentDifficulty(player.team, fixtures),
    }))

    // Step 4: Get player news (run in parallel for speed)
    const playerNewsPromises = playersWithFixtures.map((p) =>
      getPlayerNews(p.name, p.team)
    )

    // Step 5: Get team news for opponents
    const opponentTeams = playersWithFixtures.map((p) => p.fixture.opponent).filter(t => t !== 'Unknown')
    const [playerNewsResults, teamNews] = await Promise.all([
      Promise.all(playerNewsPromises),
      getTeamNews(opponentTeams),
    ])

    // Step 6: Build rich context for each player
    const playerContexts = playersWithFixtures.map((player, i) => {
      const baseContext = buildPlayerContext(
        player,
        player.fixture.opponent,
        player.fixture.difficulty
      )
      const news = playerNewsResults[i]
      const opponentInfo = teamNews[player.fixture.opponent] || ''

      return `${baseContext}
Player Profile & Notes: ${news}
${opponentInfo ? `Opponent Notes (${player.fixture.opponent}): ${opponentInfo}` : ''}`
    })

    // Step 7: Build the full prompt
    let userPrompt = `AFL Fantasy Draft Analysis - Round ${round || 1}\n\n`
    userPrompt += `DRAFT LINEUP STRUCTURE: 3 DEF, 4 MID, 1 RUC, 3 FWD, 1 FLEX (any position), 4 BENCH\n\n`
    userPrompt += `=== MY SQUAD ===\n\n`
    userPrompt += playerContexts.join('\n\n---\n\n')

    if (type === 'freeagents' && freeAgents?.length > 0) {
      userPrompt += `\n\n=== AVAILABLE FREE AGENTS ===\n`
      userPrompt += freeAgents.map((p: Player) => {
        const enriched = enrichPlayerStats(p)
        return `- ${p.name} (${p.position}${p.position2 ? '/' + p.position2 : ''}, ${p.team}) | Season Avg: ${enriched.seasonAvg} | Form: ${enriched.formRating} | Trend: ${enriched.trend}`
      }).join('\n')
    }

    userPrompt += `\n\nPlease provide a detailed, specific ${type} analysis based on the data above.`

    const analysis = await analyzeWithGroq(
      SYSTEM_PROMPTS[type as keyof typeof SYSTEM_PROMPTS],
      userPrompt
    )

    return NextResponse.json({
      type,
      content: analysis,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 })
  }
}