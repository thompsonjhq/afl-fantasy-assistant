import { fetchFootywireHtml, loadHtml } from './footywireShared'
import type { InjuryEntry } from '@/types'

/**
 * Real, current injury list grouped by club: footywire.com/afl/footy/injury_list.
 * Each club section is a <table> with a ".tbtitle" heading like "Adelaide Crows (8 Players)"
 * followed by a 3-column table: Player | Injury | Returning.
 */
export async function fetchInjuryList(): Promise<InjuryEntry[]> {
  const html = await fetchFootywireHtml('/afl/footy/injury_list', 60 * 60 * 3)
  if (!html) return []

  const $ = loadHtml(html)
  const entries: InjuryEntry[] = []
  const scrapedAt = new Date().toISOString()

  $('.tbtitle').each((_, titleEl) => {
    const titleText = $(titleEl).text().trim()
    const clubMatch = titleText.match(/^(.*?)\s*\(\d+\s*Players?\)$/i)
    if (!clubMatch) return

    const club = clubMatch[1].trim()
    const outerTable = $(titleEl).closest('table')
    const dataRows = outerTable.find('table').first().find('tr').slice(1)

    dataRows.each((_, tr) => {
      const cells = $(tr).find('td')
      if (cells.length < 3) return

      const playerName = $(cells[0]).find('a').text().trim() || $(cells[0]).text().trim()
      const injuryType = $(cells[1]).text().trim()
      const returning = $(cells[2]).text().trim()
      if (!playerName) return

      entries.push({ playerName, club, injuryType, returning, scrapedAt })
    })
  })

  return entries
}
