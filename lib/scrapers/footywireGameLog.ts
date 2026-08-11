import {
  calculateFantasyPoints,
  clubSlugForTeam,
  fetchFootywireHtml,
  loadHtml,
  parseStatCell,
  slugifyPlayerName,
  teamNameFromClubSlug,
} from './footywireShared'
import type { PlayerGameLogRow } from '@/types'

/**
 * Column order on the footywire "Games Log" table:
 * [0] Round  [1] Date  [2] Opponent  [3] Result  [4] K  [5] HB  [6] D  [7] M  [8] G
 * [9] B  [10] T  [11] HO  [12] GA  [13] I50  [14] CL  [15] CG  [16] R50  [17] FF  [18] FA  [19] BL
 * There is no "AF" column on this page - fantasy points are computed from the raw stats using
 * the real AFL Fantasy scoring formula (see footywireShared.calculateFantasyPoints).
 */
function parseGameLogHtml(html: string, playerName: string, team: string, season: number): PlayerGameLogRow[] {
  const $ = loadHtml(html)
  const rows: PlayerGameLogRow[] = []

  const titleCell = $('.tbtitle')
    .filter((_, el) => $(el).text().includes('Games Log for'))
    .first()

  if (titleCell.length === 0) return rows

  const outerTable = titleCell.closest('table')
  const dataTable = outerTable.find('table[width="998"]').first()

  dataTable.find('tr').each((_, tr) => {
    const cells = $(tr).find('td')
    if (cells.length < 20) return

    const roundText = $(cells[0]).text().replace(/ /g, ' ').trim()
    const roundMatch = roundText.match(/Round\s+(\d+)/i)
    if (!roundMatch) return

    const round = Number(roundMatch[1])
    const date = $(cells[1]).text().trim() || undefined

    const opponentLink = $(cells[2]).find('a')
    const opponentHref = opponentLink.attr('href') || ''
    const opponent = teamNameFromClubSlug(opponentHref) || opponentLink.text().trim() || undefined

    const resultLink = $(cells[3]).find('a')
    const resultText = resultLink.text().trim() || $(cells[3]).text().trim()
    const win = /^Win/i.test(resultText) ? true : /^Loss/i.test(resultText) ? false : undefined
    // Round numbers aren't a safe uniqueness key - a team can play two fixtures labelled the same
    // round in one season (e.g. rescheduled/make-up games), so key on footywire's own match id instead.
    const matchIdMatch = (resultLink.attr('href') || '').match(/mid=(\d+)/)
    const matchId = matchIdMatch ? Number(matchIdMatch[1]) : undefined

    const cellAt = (index: number) => parseStatCell($(cells[index]).text())

    const fantasyPoints = calculateFantasyPoints({
      kicks: cellAt(4),
      handballs: cellAt(5),
      marks: cellAt(7),
      goals: cellAt(8),
      behinds: cellAt(9),
      tackles: cellAt(10),
      hitouts: cellAt(11),
      freesFor: cellAt(17),
      freesAgainst: cellAt(18),
    })

    rows.push({
      playerName,
      team,
      season,
      round,
      matchId,
      date,
      opponent,
      win,
      fantasyPoints: Math.round(fantasyPoints),
      disposals: cellAt(6),
      goals: cellAt(8),
      kicks: cellAt(4),
      handballs: cellAt(5),
      marks: cellAt(7),
      behinds: cellAt(9),
      tackles: cellAt(10),
      hitouts: cellAt(11),
      goalAssists: cellAt(12),
      inside50s: cellAt(13),
      clearances: cellAt(14),
      clangers: cellAt(15),
      rebound50s: cellAt(16),
      freesFor: cellAt(17),
      freesAgainst: cellAt(18),
      bounces: cellAt(19),
    })
  })

  return rows
}

/**
 * Fetches one player's real per-round game log for a season from footywire.
 * Tries the plain name slug first, then footywire's -1/-2/-3 disambiguation suffixes
 * (footywire appends these when two players share a name, e.g. pp-st-kilda-saints--max-king-1).
 */
export async function fetchPlayerGameLog(
  playerName: string,
  team: string,
  season: number
): Promise<PlayerGameLogRow[]> {
  const clubSlug = clubSlugForTeam(team)
  if (!clubSlug) {
    console.warn(`No footywire club slug for team "${team}" - skipping game log for ${playerName}`)
    return []
  }

  const baseSlug = slugifyPlayerName(playerName)
  const candidateSlugs = [baseSlug, `${baseSlug}-1`, `${baseSlug}-2`, `${baseSlug}-3`]

  for (const nameSlug of candidateSlugs) {
    const html = await fetchFootywireHtml(
      `/afl/footy/pg-${clubSlug}--${nameSlug}?year=${season}`,
      60 * 60 * 12
    )

    if (!html || !html.includes('Games Log for')) continue

    const rows = parseGameLogHtml(html, playerName, team, season)
    if (rows.length > 0) return rows
  }

  return []
}

export async function fetchPlayerGameLogAcrossSeasons(
  playerName: string,
  team: string,
  seasons: number[]
): Promise<PlayerGameLogRow[]> {
  const all: PlayerGameLogRow[] = []

  for (const season of seasons) {
    const rows = await fetchPlayerGameLog(playerName, team, season)
    all.push(...rows)
  }

  return all
}
