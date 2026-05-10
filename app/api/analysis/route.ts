import { NextRequest, NextResponse } from 'next/server'
import { getFixtureContext, getSquiggleFixtures } from '@/lib/afl'
import { fetchFreeAgentsWithStats } from '@/lib/aflFantasy'
import { getHistoricalStatsForPlayers } from '@/lib/aflTables'
import { analyzeWithGroq } from '@/lib/groq'
import { enrichPlayerStats, buildPlayerContext } from '@/lib/playerStats'
import { calculateTeamProjections, findWeakestComparablePlayer } from '@/lib/projections'
import { Player, PlayerWithStats } from '@/types'

const CURRENT_YEAR = new Date().getFullYear()

const SYSTEM_PROMPTS = {
  strengths: `You are an expert AFL Fantasy Draft coach. You are given deterministic statistical projections and factor breakdowns for each player. Analyse the squad using those numbers as the source of truth. Do not invent projections. Reference specific player names, projected scores, ranges, confidence, form, injury and fixture factors.`,

  projections: `You are an AFL Fantasy Draft analyst. The application has already calculated the official projection for each player. Your job is to explain and support those projections, not replace them.

Rules:
- Do not invent different projected scores.
- Use the exact projection and range supplied for each player.
- Explain the supplied projection factors: base average, recent form, opponent, venue, injury and volatility.
- Say when venue or detailed opponent data is unavailable rather than pretending it exists.
- Rank players by the supplied projection.`,

  freeagents: `You are an AFL Fantasy Draft waiver analyst. You are given the user's squad, projected free agents, and direct replacement comparisons. Recommend pickups only when the projected gain and positional eligibility support it. Do not invent alternative scores.`,

  trades: `You are an AFL Fantasy Draft trade analyst. Use the supplied projections as the source of truth. Identify sell-high, buy-low and weak-position risks using projections, season averages, form trend, confidence and injury context.`,

  captain: `You are an AFL Fantasy Draft captain selector. Use supplied projections as the primary ranking signal, then consider ceiling, volatility, confidence, fixture, injury and recent form. Do not invent scores.`,
}

function projectionFactorText(player: Player) {
  if (!player.projectionFactors?.length) return 'No factor breakdown supplied.'

  return player.projectionFactors.map((factor) => (
    `- ${factor.label}: ${factor.value}; impact ${factor.impact > 0 ? '+' : ''}${factor.impact}; ${factor.available ? factor.description : `Unavailable: ${factor.description}`}`
  )).join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, players, round } = body

    if (!type || !players) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const fixtures = await getSquiggleFixtures(round || 1, CURRENT_YEAR)
    const enrichedPlayers: PlayerWithStats[] = players.map((p: Player) => enrichPlayerStats(p))
    const fixturesByPlayerId = Object.fromEntries(
      enrichedPlayers.map((player) => [player.id, getFixtureContext(player.team, fixtures)])
    )
    const historicalByPlayerId = await getHistoricalStatsForPlayers(enrichedPlayers, CURRENT_YEAR, fixturesByPlayerId)
    const projectedPlayers = calculateTeamProjections(enrichedPlayers, fixturesByPlayerId, historicalByPlayerId)

    const playerContexts = projectedPlayers.map((player) => {
      const baseContext = buildPlayerContext(
        player,
        player.fixture?.opponent || 'Unknown',
        player.fixture?.difficulty || 'Unknown'
      )

      return `${baseContext}
OFFICIAL APP PROJECTION: ${player.projectedScore} points (${player.projectionLow}-${player.projectionHigh})
Projection Confidence: ${player.projectionConfidence}
Projection Basis: ${player.projectionReason}
Projection Factors:
${projectionFactorText(player)}`
    })

    let userPrompt = `AFL Fantasy Draft Analysis - Round ${round || 1}\n\n`
    userPrompt += `Draft lineup structure: 3 DEF, 4 MID, 1 RUC, 3 FWD, 1 FLEX, 4 BENCH.\n\n`
    userPrompt += `The official projection numbers below are calculated by the app. Explain these numbers and do not create alternatives.\n\n`
    userPrompt += `=== OFFICIAL PROJECTION RANKINGS ===\n`
    userPrompt += projectedPlayers.map((p, index) => (
      `${index + 1}. ${p.name} - ${p.projectedScore} (${p.projectionLow}-${p.projectionHigh}, ${p.projectionConfidence} confidence) | ${p.projectionReason}`
    )).join('\n')
    userPrompt += `\n\n=== MY SQUAD DETAIL ===\n\n${playerContexts.join('\n\n---\n\n')}`

    if (type === 'freeagents') {
      const freeAgents = await fetchFreeAgentsWithStats(80)
      const freeAgentFixtures = Object.fromEntries(
        freeAgents.map((player) => [player.id, getFixtureContext(player.team, fixtures)])
      )
      const freeAgentHistorical = await getHistoricalStatsForPlayers(freeAgents, CURRENT_YEAR, freeAgentFixtures)
      const projectedFreeAgents = calculateTeamProjections(freeAgents, freeAgentFixtures, freeAgentHistorical)

      const comparisons = projectedFreeAgents.slice(0, 35).map((freeAgent) => {
        const replacementPlayer = findWeakestComparablePlayer(freeAgent, projectedPlayers)
        const netGain = replacementPlayer
          ? (freeAgent.projectedScore || 0) - (replacementPlayer.projectedScore || replacementPlayer.avgScore || 0)
          : undefined

        return { freeAgent, replacementPlayer, netGain }
      }).sort((a, b) => (b.netGain ?? -999) - (a.netGain ?? -999))

      userPrompt += `\n\n=== FREE AGENT REPLACEMENT COMPARISONS ===\n`
      userPrompt += comparisons.slice(0, 20).map((comparison, index) => (
        `${index + 1}. ${comparison.freeAgent.name} (${comparison.freeAgent.position}${comparison.freeAgent.position2 ? `/${comparison.freeAgent.position2}` : ''}, ${comparison.freeAgent.team}) projects ${comparison.freeAgent.projectedScore}. ` +
        (comparison.replacementPlayer
          ? `Comparable squad player: ${comparison.replacementPlayer.name}, projection ${comparison.replacementPlayer.projectedScore}. Net: ${comparison.netGain && comparison.netGain >= 0 ? '+' : ''}${comparison.netGain}.`
          : 'No comparable squad player found.')
      )).join('\n')
    }

    userPrompt += `\n\nProvide a detailed, specific ${type} analysis based only on the supplied data.`

    const analysis = await analyzeWithGroq(
      SYSTEM_PROMPTS[type as keyof typeof SYSTEM_PROMPTS],
      userPrompt
    )

    return NextResponse.json({
      type,
      content: analysis,
      projections: projectedPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        projectedScore: p.projectedScore,
        projectionLow: p.projectionLow,
        projectionHigh: p.projectionHigh,
        projectionConfidence: p.projectionConfidence,
        projectionReason: p.projectionReason,
        projectionFactors: p.projectionFactors,
      })),
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 })
  }
}