import * as cheerio from 'cheerio'
import { normaliseTeamName } from '@/lib/matchups'

export const FOOTYWIRE_CLUB_SLUGS: Record<string, string> = {
  Adelaide: 'adelaide-crows',
  'Brisbane Lions': 'brisbane-lions',
  Carlton: 'carlton-blues',
  Collingwood: 'collingwood-magpies',
  Essendon: 'essendon-bombers',
  Fremantle: 'fremantle-dockers',
  Geelong: 'geelong-cats',
  'Gold Coast': 'gold-coast-suns',
  'Greater Western Sydney': 'greater-western-sydney-giants',
  Hawthorn: 'hawthorn-hawks',
  Melbourne: 'melbourne-demons',
  'North Melbourne': 'kangaroos',
  'Port Adelaide': 'port-adelaide-power',
  Richmond: 'richmond-tigers',
  'St Kilda': 'st-kilda-saints',
  Sydney: 'sydney-swans',
  'West Coast': 'west-coast-eagles',
  'Western Bulldogs': 'western-bulldogs',
}

const SLUG_TO_TEAM: Record<string, string> = Object.fromEntries(
  Object.entries(FOOTYWIRE_CLUB_SLUGS).map(([team, slug]) => [slug, team])
)

/** Footywire hrefs look like "th-sydney-swans" or "/afl/footy/pp-sydney-swans--name". Strips the page prefix and resolves to our canonical team name. */
export function teamNameFromClubSlug(hrefOrSlug: string): string | undefined {
  const withoutPath = hrefOrSlug.replace(/^\/?afl\/footy\//, '')
  const slug = withoutPath.replace(/^(th|pp|pg|pr)-/, '').split('--')[0]
  return SLUG_TO_TEAM[slug]
}

export function clubSlugForTeam(team: string): string | undefined {
  return FOOTYWIRE_CLUB_SLUGS[normaliseTeamName(team)]
}

/** Best-effort name -> footywire slug. Footywire disambiguates duplicate names with -1/-2 suffixes, which callers should try as fallbacks. */
export function slugifyPlayerName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const USER_AGENT = 'Mozilla/5.0 (compatible; afl-fantasy-assistant/1.0; +https://github.com)'

export async function fetchFootywireHtml(path: string, revalidateSeconds = 60 * 60): Promise<string | null> {
  try {
    const res = await fetch(`https://www.footywire.com${path}`, {
      headers: { 'user-agent': USER_AGENT },
      next: { revalidate: revalidateSeconds },
    })

    if (!res.ok) return null
    return await res.text()
  } catch (error) {
    console.error(`Failed to fetch footywire ${path}:`, error)
    return null
  }
}

export function loadHtml(html: string) {
  return cheerio.load(html)
}

/** Supabase/Postgrest errors are plain {message, details, hint, code} objects, not Error instances - handle both shapes for useful route error responses. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message)
  return 'Unknown error'
}

export function parseStatCell(text: string): number {
  const cleaned = text.replace(/ /g, '').trim()
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : 0
}

/** Real AFL Fantasy scoring formula: 3 kicks, 3 marks, 2 handballs, 4 tackles, 6 goals, 1 behind, 1 hitout, 1 free for, -3 free against. */
export function calculateFantasyPoints(stats: {
  kicks: number
  handballs: number
  marks: number
  tackles: number
  goals: number
  behinds: number
  hitouts: number
  freesFor: number
  freesAgainst: number
}): number {
  return (
    stats.kicks * 3 +
    stats.marks * 3 +
    stats.handballs * 2 +
    stats.tackles * 4 +
    stats.goals * 6 +
    stats.behinds * 1 +
    stats.hitouts * 1 +
    stats.freesFor * 1 -
    stats.freesAgainst * 3
  )
}
