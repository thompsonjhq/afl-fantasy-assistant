import { fetchFootywireHtml, loadHtml, parseStatCell } from './footywireShared'
import { normaliseTeamName } from '@/lib/matchups'
import type { PlayerAdvancedStatRow } from '@/types'

export interface MatchRoundRef {
  matchId: number
  round: number
}

/**
 * Footywire's season fixture/results index (ft_match_list?year=Y) groups matches under
 * "Round N" heading rows (<td class="tbtitle"><a name="round_N">Round N</a></td>), followed by
 * one row per match with a result link to ft_match_statistics?mid=<id>. The match-statistics
 * page itself doesn't carry its own round number, so this is the only place to get the
 * matchId -> round mapping needed to store advanced stats against a real round.
 */
export async function fetchMatchRefsForSeason(season: number): Promise<MatchRoundRef[]> {
  const html = await fetchFootywireHtml(`/afl/footy/ft_match_list?year=${season}`, 60 * 60)
  if (!html) return []

  const $ = loadHtml(html)
  const refs: MatchRoundRef[] = []
  let currentRound: number | null = null

  $('tr').each((_, tr) => {
    const $tr = $(tr)
    const roundHeading = $tr.find('td.tbtitle').first()

    if (roundHeading.length > 0) {
      const roundMatch = roundHeading.text().match(/Round\s+(\d+)/i)
      currentRound = roundMatch ? Number(roundMatch[1]) : null
      return
    }

    if (currentRound === null) return

    const link = $tr.find('a[href*="ft_match_statistics?mid="]').first()
    if (link.length === 0) return

    const matchIdMatch = (link.attr('href') || '').match(/mid=(\d+)/)
    if (!matchIdMatch) return

    refs.push({ matchId: Number(matchIdMatch[1]), round: currentRound })
  })

  return refs
}

function teamNameFromHeading(headingText: string): string {
  const match = headingText.match(/^(.*?)\s+Match Statistics/i)
  return normaliseTeamName((match ? match[1] : headingText).trim())
}

/**
 * Column order on the advanced-stats table (view via ?advv=Y - the default ?mid=X page shows
 * basic stats instead): [0] CP [1] UP [2] ED [3] DE% [4] CM [5] GA [6] MI5 [7] 1% [8] BO
 * [9] CCL [10] SCL [11] SI [12] MG [13] TO [14] ITC [15] T5 [16] TOG%. No literal centre-bounce-
 * attendance count exists on footywire - CCL (Centre Clearances) is the closest available proxy.
 *
 * The player name cell shows a truncated "F Surname" as its link text, but the link's `title`
 * attribute carries the real full name (e.g. title="Stephen Coniglio", text "S Coniglio") - using
 * that avoids the truncated-name join risk entirely, no initial+surname fuzzy matching needed.
 */
function parseTeamBlock(
  $: ReturnType<typeof loadHtml>,
  blockId: string,
  team: string,
  opponent: string,
  season: number,
  matchId: number
): PlayerAdvancedStatRow[] {
  const rows: PlayerAdvancedStatRow[] = []

  $(`#${blockId}`).find('tr').each((_, tr) => {
    const $tr = $(tr)
    const nameLink = $tr.find('td').first().find('a[title]').first()
    if (nameLink.length === 0) return

    const playerName = nameLink.attr('title')?.trim()
    if (!playerName) return

    const statCells = $tr.find('td.statdata')
    if (statCells.length < 17) return

    const cellAt = (index: number) => parseStatCell($(statCells[index]).text())

    rows.push({
      playerName,
      team,
      opponent,
      season,
      matchId,
      contestedPossessions: cellAt(0),
      uncontestedPossessions: cellAt(1),
      effectiveDisposals: cellAt(2),
      disposalEfficiencyPct: cellAt(3),
      contestedMarks: cellAt(4),
      goalAssists: cellAt(5),
      marksInside50: cellAt(6),
      onePercenters: cellAt(7),
      bounces: cellAt(8),
      centreClearances: cellAt(9),
      stoppageClearances: cellAt(10),
      scoreInvolvements: cellAt(11),
      metresGained: cellAt(12),
      turnovers: cellAt(13),
      intercepts: cellAt(14),
      tacklesInside50: cellAt(15),
      togPct: cellAt(16),
    })
  })

  return rows
}

/** Fetches one match's advanced stats for both teams in a single request (see module doc for
 * column layout and the name-resolution approach). Returns an empty array for matches that
 * don't exist, haven't been played yet, or don't have an advanced-stats table (e.g. very old
 * seasons before footywire tracked these columns). */
export async function fetchAdvancedStatsForMatch(matchId: number, season: number): Promise<PlayerAdvancedStatRow[]> {
  const html = await fetchFootywireHtml(`/afl/footy/ft_match_statistics?mid=${matchId}&advv=Y`, 60 * 60 * 24)
  if (!html) return []

  const $ = loadHtml(html)

  const team1Heading = $('#match-statistics-team1-row .innertbtitle').first().text().trim()
  const team2Heading = $('#match-statistics-team2-row .innertbtitle').first().text().trim()

  if (!team1Heading || !team2Heading) return []

  const team1 = teamNameFromHeading(team1Heading)
  const team2 = teamNameFromHeading(team2Heading)

  return [
    ...parseTeamBlock($, 'match-statistics-team1-row', team1, team2, season, matchId),
    ...parseTeamBlock($, 'match-statistics-team2-row', team2, team1, season, matchId),
  ]
}
