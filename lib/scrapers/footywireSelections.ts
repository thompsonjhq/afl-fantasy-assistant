import { fetchFootywireHtml, loadHtml } from './footywireShared'
import { normaliseTeamName } from '@/lib/matchups'
import type { TeamSelectionChange } from '@/types'

/**
 * Real per-round team selections: footywire.com/afl/footy/afl_team_selections.
 * Each fixture is a ".tbtitle" heading "Team A v Team B (Venue)" followed immediately by a
 * <tr> with three <td>s: left 18%-width column (Team A's Interchange/Emergencies/Ins/Outs),
 * a centre ladder/lineup grid, and a right 18%-width column (Team B's lists) - in that order.
 * Column-order assumption is a heuristic: if it's ever backwards, the impact is limited to a
 * swapped ins/outs list for one fixture, since this only feeds approximate "sentiment" context.
 */
export async function fetchTeamSelectionChanges(): Promise<TeamSelectionChange[]> {
  const html = await fetchFootywireHtml('/afl/footy/afl_team_selections', 60 * 30)
  if (!html) return []

  const $ = loadHtml(html)
  const scrapedAt = new Date().toISOString()

  const headingText = $('h1.centertitle').text()
  const headingMatch = headingText.match(/AFL\s+(\d{4})\s+Round\s+(\d+)\s+Team Selections/i)
  const season = headingMatch ? Number(headingMatch[1]) : new Date().getFullYear()
  const round = headingMatch ? Number(headingMatch[2]) : 0

  const changes: TeamSelectionChange[] = []

  $('td.tbtitle').each((_, titleEl) => {
    const titleText = $(titleEl).text().trim()
    const matchupMatch = titleText.match(/^(.+?)\s+v\.?\s+(.+?)\s*\(([^)]+)\)\s*$/i)
    if (!matchupMatch) return

    const [, teamA, teamB] = matchupMatch
    const fixtureRow = $(titleEl).closest('tr')
    const contentRow = fixtureRow.next('tr')
    const sideColumns = contentRow.children('td[width="18%"]')

    if (sideColumns.length < 2) return

    const teams = [teamA.trim(), teamB.trim()]

    sideColumns.each((index, col) => {
      const team = teams[index]
      if (!team) return

      const ins: string[] = []
      const outs: string[] = []
      let current: 'ins' | 'outs' | null = null

      $(col).find('tr').each((_, tr) => {
        const boldText = $(tr).find('b').text().trim()

        if (/^Ins$/i.test(boldText)) { current = 'ins'; return }
        if (/^Outs$/i.test(boldText)) { current = 'outs'; return }
        if (boldText) { current = null; return }

        const link = $(tr).find('a')
        if (link.length === 0 || !current) return

        const name = link.text().trim()
        if (!name) return

        if (current === 'ins') ins.push(name)
        else outs.push(name)
      })

      changes.push({
        club: normaliseTeamName(team),
        season,
        round,
        ins,
        outs,
        scrapedAt,
      })
    })
  })

  return changes
}
