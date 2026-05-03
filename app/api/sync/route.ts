import { NextResponse } from 'next/server'
import { fetchMySquadWithStats, SQUAD_ID_TO_TEAM } from '@/lib/aflFantasy'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    const result = await fetchMySquadWithStats()

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to fetch team data. Session cookie may have expired.' },
        { status: 500 }
      )
    }

    const { players } = result

    // Clear existing players and re-insert fresh from API
    await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    let synced = 0
    let errors = 0

    for (const player of players) {
      if (!player) continue

      const teamName = SQUAD_ID_TO_TEAM[player.squadId] || `Team ${player.squadId}`

      const { error } = await supabase
        .from('players')
        .insert({
          name: player.name,
          team: teamName,
          position: player.position,
          position2: player.position2,
          avg_score: player.avgScore,
          last_score: player.lastScore,
          total_points: player.totalPoints,
          injured: player.injured,
          injury_note: player.injuryNote,
          scores: [],
          score_rounds: [],
          lineup_position: player.lineupPosition,
          is_captain: player.isCaptain,
          is_vice_captain: player.isViceCaptain,
          last3_avg: player.last3Avg,
          last5_avg: player.last5Avg,
          high_score: player.highScore,
          low_score: player.lowScore,
          games_played: player.gamesPlayed,
          afl_fantasy_id: player.id,
        })

      if (error) {
        console.error(`Error syncing ${player.name}:`, error)
        errors++
      } else {
        synced++
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      errors,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}