import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface RoundScoreInput {
  playerId: string
  round: number
  score: number
}

interface RoundScoresRequestBody {
  scores?: RoundScoreInput[]
}

function upsertRoundScore(existingScores: number[], existingRounds: number[], round: number, score: number) {
  const scores = [...existingScores]
  const rounds = [...existingRounds]
  const index = rounds.findIndex((value) => value === round)

  if (index >= 0) {
    scores[index] = score
  } else {
    rounds.push(round)
    scores.push(score)
  }

  const combined = rounds.map((roundValue, i) => ({ round: roundValue, score: scores[i] || 0 }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => a.round - b.round)

  return {
    scoreRounds: combined.map((entry) => entry.round),
    scores: combined.map((entry) => entry.score),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RoundScoresRequestBody
    const scoreInputs = Array.isArray(body.scores) ? body.scores : []

    const validScores = scoreInputs.filter((entry) =>
      entry.playerId &&
      Number.isFinite(entry.round) &&
      entry.round > 0 &&
      Number.isFinite(entry.score) &&
      entry.score >= 0
    )

    if (validScores.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid scores supplied' }, { status: 400 })
    }

    const { data: rows, error: fetchError } = await supabase
      .from('players')
      .select('id, scores, score_rounds, total_points')
      .in('id', validScores.map((entry) => entry.playerId))

    if (fetchError) throw fetchError

    const rowMap = new Map((rows || []).map((row) => [row.id, row]))
    let updated = 0

    for (const input of validScores) {
      const row = rowMap.get(input.playerId)
      if (!row) continue

      const merged = upsertRoundScore(row.scores || [], row.score_rounds || [], input.round, input.score)
      const totalPoints = merged.scores.reduce((sum, score) => sum + score, 0)
      const avgScore = merged.scores.length > 0 ? Math.round((totalPoints / merged.scores.length) * 10) / 10 : 0
      const lastScore = merged.scores[merged.scores.length - 1] || 0
      const last3 = merged.scores.slice(-3)
      const last5 = merged.scores.slice(-5)
      const highScore = merged.scores.length > 0 ? Math.max(...merged.scores) : 0
      const lowScore = merged.scores.length > 0 ? Math.min(...merged.scores) : 0

      const { error: updateError } = await supabase
        .from('players')
        .update({
          scores: merged.scores,
          score_rounds: merged.scoreRounds,
          total_points: totalPoints,
          avg_score: avgScore,
          last_score: lastScore,
          last3_avg: last3.length ? Math.round((last3.reduce((sum, value) => sum + value, 0) / last3.length) * 10) / 10 : 0,
          last5_avg: last5.length ? Math.round((last5.reduce((sum, value) => sum + value, 0) / last5.length) * 10) / 10 : 0,
          high_score: highScore,
          low_score: lowScore,
          games_played: merged.scores.length,
        })
        .eq('id', input.playerId)

      if (updateError) throw updateError
      updated++
    }

    return NextResponse.json({ success: true, updated })
  } catch (error) {
    console.error('Round score update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update round scores' }, { status: 500 })
  }
}