'use client'

import { Player } from '@/types'

interface SquadViewProps {
  players: Player[]
}

const POSITION_COLORS: Record<string, string> = {
  DEF: 'bg-red-100 text-red-700',
  MID: 'bg-yellow-100 text-yellow-700',
  RUC: 'bg-purple-100 text-purple-700',
  FWD: 'bg-green-100 text-green-700',
  FLX: 'bg-blue-100 text-blue-700',
  BENCH: 'bg-gray-100 text-gray-600',
}

const SECTION_COLORS: Record<string, string> = {
  DEF: 'bg-red-600',
  MID: 'bg-yellow-500',
  RUC: 'bg-purple-600',
  FWD: 'bg-green-600',
  FLX: 'bg-blue-500',
  BENCH: 'bg-gray-400',
}

const SECTIONS = [
  { key: 'DEF', label: 'DEFENDERS' },
  { key: 'MID', label: 'MIDFIELDERS' },
  { key: 'RUC', label: 'RUCKS' },
  { key: 'FWD', label: 'FORWARDS' },
  { key: 'FLX', label: 'FLEX' },
  { key: 'BENCH', label: 'BENCH' },
]

function getTrend(player: Player): { arrow: string; color: string } {
  const avg = player.avgScore
  const last3 = player.last3Avg || avg
  const diff = last3 - avg
  if (diff > 8) return { arrow: '↑', color: 'text-green-600' }
  if (diff < -8) return { arrow: '↓', color: 'text-red-500' }
  return { arrow: '→', color: 'text-gray-400' }
}

function PositionBadge({ position }: { position: string }) {
  const color = POSITION_COLORS[position] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${color}`}>
      {position}
    </span>
  )
}

function PlayerCard({ player }: { player: Player }) {
  const trend = getTrend(player)
  const isBench = player.lineupPosition === 'BENCH'

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 ${isBench ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}>

      {/* Captain/VC badge */}
      <div className="w-6 text-center shrink-0">
        {player.isCaptain && (
          <span className="bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">C</span>
        )}
        {player.isViceCaptain && (
          <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">VC</span>
        )}
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold text-gray-900 ${isBench ? 'text-sm' : ''}`}>
            {player.name}
          </span>
          <div className="flex gap-1">
            <PositionBadge position={player.position} />
            {player.position2 && <PositionBadge position={player.position2} />}
          </div>
          {player.injured && (
            <span className="text-xs text-red-600 font-medium">⚠ {player.injuryNote || 'Injured'}</span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{player.team}</div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 shrink-0 text-right">
        {/* Games played */}
        <div className="hidden sm:block">
          <div className="text-xs text-gray-400">GP</div>
          <div className="text-sm font-medium text-gray-700">{player.gamesPlayed ?? '-'}</div>
        </div>

        {/* Season avg */}
        <div>
          <div className="text-xs text-gray-400">AVG</div>
          <div className="text-sm font-semibold text-gray-900">{player.avgScore}</div>
        </div>

        {/* Last 3 */}
        <div className="hidden sm:block">
          <div className="text-xs text-gray-400">L3</div>
          <div className={`text-sm font-medium ${trend.color}`}>
            {player.last3Avg ?? '-'}
          </div>
        </div>

        {/* Trend */}
        <div className="hidden sm:block">
          <div className="text-xs text-gray-400">FORM</div>
          <div className={`text-sm font-bold ${trend.color}`}>{trend.arrow}</div>
        </div>

        {/* High/Low */}
        <div className="hidden md:block">
          <div className="text-xs text-gray-400">H/L</div>
          <div className="text-xs text-gray-600">
            <span className="text-green-600 font-medium">{player.highScore ?? '-'}</span>
            <span className="text-gray-300 mx-0.5">/</span>
            <span className="text-red-500 font-medium">{player.lowScore ?? '-'}</span>
          </div>
        </div>

        {/* Total */}
        <div>
          <div className="text-xs text-gray-400">TOT</div>
          <div className="text-sm font-semibold text-gray-700">{player.totalPoints}</div>
        </div>

        {/* Last score */}
        <div className="w-12">
          <div className="text-xs text-gray-400">LAST</div>
          <div className={`text-sm font-bold rounded px-1.5 py-0.5 text-center ${
            player.lastScore > 0
              ? player.lastScore >= (player.avgScore * 1.1)
                ? 'bg-green-100 text-green-700'
                : player.lastScore <= (player.avgScore * 0.9)
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-700'
              : 'bg-gray-100 text-gray-400'
          }`}>
            {player.lastScore > 0 ? player.lastScore : '-'}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ sectionKey, label, count }: { sectionKey: string; label: string; count: number }) {
  const color = SECTION_COLORS[sectionKey] || 'bg-gray-400'
  return (
    <div className={`${color} text-white px-4 py-2 flex items-center justify-between`}>
      <span className="text-xs font-bold tracking-wider">{label}</span>
      <span className="text-xs opacity-75">{count}/{sectionKey === 'DEF' ? 3 : sectionKey === 'MID' ? 4 : sectionKey === 'RUC' ? 1 : sectionKey === 'FWD' ? 3 : sectionKey === 'FLX' ? 1 : 4}</span>
    </div>
  )
}

export default function SquadView({ players }: SquadViewProps) {
  if (players.length === 0) return null

  const grouped = SECTIONS.reduce((acc, section) => {
    acc[section.key] = players.filter(p =>
      (p.lineupPosition || 'BENCH') === section.key
    )
    return acc
  }, {} as Record<string, Player[]>)

  // Team summary stats
  const totalAvg = players.reduce((sum, p) => sum + p.avgScore, 0)
  const startingAvg = players
    .filter(p => p.lineupPosition !== 'BENCH')
    .reduce((sum, p) => sum + p.avgScore, 0)

  return (
    <div className="flex flex-col gap-0">

      {/* Team summary bar */}
      <div className="flex gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 flex-wrap">
        <div className="text-xs">
          <span className="text-gray-500">Squad avg </span>
          <span className="font-bold text-gray-900">{(totalAvg / players.length).toFixed(1)}</span>
        </div>
        <div className="text-xs">
          <span className="text-gray-500">Starting avg </span>
          <span className="font-bold text-gray-900">{(startingAvg / 12).toFixed(1)}</span>
        </div>
        <div className="text-xs">
          <span className="text-gray-500">Season total </span>
          <span className="font-bold text-gray-900">{players.reduce((sum, p) => sum + p.totalPoints, 0).toLocaleString()}</span>
        </div>
        <div className="text-xs hidden sm:block">
          <span className="text-gray-500">High scorer </span>
          <span className="font-bold text-gray-900">
            {[...players].sort((a, b) => b.avgScore - a.avgScore)[0]?.name.split(' ').pop()}
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-1.5 bg-white border-b border-gray-100">
        <div className="w-6" />
        <div className="flex-1 text-xs text-gray-400 font-medium">PLAYER</div>
        <div className="flex gap-4 shrink-0 text-right">
          <div className="hidden sm:block w-6 text-xs text-gray-400">GP</div>
          <div className="w-8 text-xs text-gray-400">AVG</div>
          <div className="hidden sm:block w-8 text-xs text-gray-400">L3</div>
          <div className="hidden sm:block w-10 text-xs text-gray-400">FORM</div>
          <div className="hidden md:block w-12 text-xs text-gray-400">H/L</div>
          <div className="w-8 text-xs text-gray-400">TOT</div>
          <div className="w-12 text-xs text-gray-400">LAST</div>
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map(section => {
        const sectionPlayers = grouped[section.key] || []
        if (sectionPlayers.length === 0) return null
        return (
          <div key={section.key} className="border-b border-gray-200 last:border-0">
            <SectionHeader
              sectionKey={section.key}
              label={section.label}
              count={sectionPlayers.length}
            />
            {sectionPlayers.map(player => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        )
      })}
    </div>
  )
}