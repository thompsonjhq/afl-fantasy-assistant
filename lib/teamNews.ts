import { supabase } from '@/lib/supabase'
import type { InjuryEntry, TeamSelectionChange } from '@/types'

function rowToInjury(row: Record<string, unknown>): InjuryEntry {
  return {
    playerName: String(row.player_name),
    club: String(row.club || ''),
    injuryType: String(row.injury_type || ''),
    returning: String(row.returning_timeframe || ''),
    scrapedAt: String(row.scraped_at || ''),
  }
}

function rowToSelectionChange(row: Record<string, unknown>): TeamSelectionChange {
  return {
    club: String(row.club || ''),
    season: Number(row.season),
    round: Number(row.round),
    ins: Array.isArray(row.ins) ? (row.ins as string[]) : [],
    outs: Array.isArray(row.outs) ? (row.outs as string[]) : [],
    scrapedAt: String(row.scraped_at || ''),
  }
}

/** League-wide "who's out this round" - the real injury list is already scraped by
 * lib/scrapers/footywireInjuries.ts and synced via /api/sync-injuries, but until now it was
 * only ever read back to flag the current squad's own players, never surfaced as its own view. */
export async function getAllInjuries(): Promise<InjuryEntry[]> {
  const { data, error } = await supabase
    .from('injury_list')
    .select('*')
    .order('club', { ascending: true })
    .order('player_name', { ascending: true })

  if (error || !data) return []
  return data.map(rowToInjury)
}

export async function getLatestSelectionChanges(limit = 60): Promise<TeamSelectionChange[]> {
  const { data, error } = await supabase
    .from('team_selection_changes')
    .select('*')
    .order('round', { ascending: false })
    .order('club', { ascending: true })
    .limit(limit)

  if (error || !data) return []
  return data.map(rowToSelectionChange)
}
