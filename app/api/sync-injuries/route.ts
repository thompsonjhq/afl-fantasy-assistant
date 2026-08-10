import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchInjuryList } from '@/lib/scrapers/footywireInjuries'
import { fetchTeamSelectionChanges } from '@/lib/scrapers/footywireSelections'
import { getErrorMessage } from '@/lib/scrapers/footywireShared'
import { normaliseTeamName } from '@/lib/matchups'

function normaliseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
}

export async function POST() {
  try {
    const [injuries, selectionChanges] = await Promise.all([
      fetchInjuryList(),
      fetchTeamSelectionChanges(),
    ])

    if (injuries.length > 0) {
      const { error } = await supabase
        .from('injury_list')
        .upsert(
          injuries.map((entry) => ({
            player_name: entry.playerName,
            club: entry.club,
            injury_type: entry.injuryType,
            returning_timeframe: entry.returning,
            scraped_at: entry.scrapedAt,
          })),
          { onConflict: 'player_name,club' }
        )

      if (error) throw error
    }

    if (selectionChanges.length > 0) {
      const { error } = await supabase
        .from('team_selection_changes')
        .upsert(
          selectionChanges.map((change) => ({
            club: change.club,
            season: change.season,
            round: change.round,
            ins: change.ins,
            outs: change.outs,
            scraped_at: change.scrapedAt,
          })),
          { onConflict: 'club,season,round' }
        )

      if (error) throw error
    }

    // Match real injuries against squad players by name AND club - name alone isn't unique
    // (e.g. Max King plays for both St Kilda and Sydney as two different real players).
    const { data: squadPlayers, error: squadError } = await supabase
      .from('players')
      .select('id, name, team')

    if (squadError) throw squadError

    const injuryByKey = new Map(
      injuries.map((entry) => [`${normaliseName(entry.playerName)}__${normaliseTeamName(entry.club)}`, entry])
    )
    let updatedSquadPlayers = 0

    for (const squadPlayer of squadPlayers || []) {
      const match = injuryByKey.get(`${normaliseName(squadPlayer.name)}__${normaliseTeamName(squadPlayer.team)}`)

      const { error } = await supabase
        .from('players')
        .update({
          injured: Boolean(match),
          injury_note: match ? `${match.injuryType} - ${match.returning}` : '',
        })
        .eq('id', squadPlayer.id)

      if (error) throw error
      if (match) updatedSquadPlayers += 1
    }

    return NextResponse.json({
      success: true,
      injuriesScraped: injuries.length,
      selectionChangesScraped: selectionChanges.length,
      squadPlayersFlaggedInjured: updatedSquadPlayers,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('sync-injuries error:', error)

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}
