'use client'

import { useState } from 'react'
import { Player, ProjectionFactor } from '@/types'

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
  { key: 'DEF', label: 'DEFENDERS', target: 3 },
  { key: 'MID', label: 'MIDFIELDERS', target: 4 },
  { key: 'RUC', label: 'RUCKS', target: 1 },
  { key: 'FWD', label: 'FORWARDS', target: 3 },
  { key: 'FLX', label: 'FLEX', target: 1 },
  { key: 'BENCH', label: 'BENCH', target: 4 },
]

function getTrend(player: Player): { arrow: string; color: string } {
  const avg = player.avgScore || 0
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

function formatImpact(impact: number) {
  if (!impact) return '0'
  return `${impact > 0 ? '+' : ''}${impact}`
}

function FactorRow({ factor }: { factor: ProjectionFactor }) {
  return (
    <div className="grid grid-cols-[90px_70px_60px_1fr] gap-2 text-xs py-1 border-b border-gray-100 last:border-0">
      <div className="font-medium text-gray-700">{factor.label}</div>
      <div className={factor.available ? 'text-gray-700' : 'text-gray-400'}>
        {factor.value}
      </div>
      <div className={factor.impact > 0 ? 'text-green-700' : factor.impact < 0 ? 'text-red-600' : 'text-gray-500'}>
        {formatImpact(factor.impact)}
      </div>
      <div className={factor.available ? 'text-gray-500' : 'text-gray-400'}>
        {factor.description}
      </div>
    </div>
  )
}

function FactorPill({ factor }: { factor: ProjectionFactor }) {
  return (
    <span
      title={factor.description}
      className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
        factor.available
          ? 'bg-white text-gray-600 border-gray-200'
          : 'bg-gray-50 text-gray-400 border-gray-100'
      }`}
    >
      {factor.label}: {factor.value}
      {factor.impact !== 0 ? ` (${formatImpact(factor.impact)})` : ''}
    </span>
  )
}

function PlayerCard({ player }: { player: Player }) {
  const [expanded, setExpanded] = useState(false)
  const trend = getTrend(player)
  const isBench = player.lineupPosition === 'BENCH'
  const projection = player.projectedScore
  const hasFactors = Boolean(player.projectionFactors?.length)

  return (
    <div className={`border-b border-gray-100 last:border-0 ${isBench ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-6 text-center shrink-0">
            {player.isCaptain && (
              <span className="bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">C</span>
            )}
            {player.isViceCaptain && (
              <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">VC</span>
            )}
          </div>

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
                <span className="text-xs text-red-600 font-medium">
                  ⚠ {player.injuryNote || 'Injured'}
                </span>
              )}
            </div>

            <div className="text-xs text-gray-500 mt-0.5">{player.team}</div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-right">
            <div className="hidden sm:block w-7">
              <div className="text-xs text-gray-400">GP</div>
              <div className="text-sm font-medium text-gray-700">{player.gamesPlayed ?? '-'}</div>
            </div>

            <div className="w-10">
              <div className="text-xs text-gray-400">AVG</div>
              <div className="text-sm font-semibold text-gray-900">{player.avgScore}</div>
            </div>

            <div className="w-12">
              <div className="text-xs text-gray-400">PROJ</div>
              <div className={`text-sm font-bold rounded px-1.5 py-0.5 text-center ${
                projection ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
              }`}>
                {projection || '-'}
              </div>
            </div>

            <div className="hidden sm:block w-10">
              <div className="text-xs text-gray-400">L3</div>
              <div className={`text-sm font-medium ${trend.color}`}>
                {player.last3Avg ?? '-'}
              </div>
            </div>

            <div className="hidden sm:block w-10">
              <div className="text-xs text-gray-400">FORM</div>
              <div className={`text-sm font-bold ${trend.color}`}>{trend.arrow}</div>
            </div>

            <div className="hidden md:block w-16">
              <div className="text-xs text-gray-400">RANGE</div>
              <div className="text-xs text-gray-600">
                {player.projectionLow !== undefined && player.projectionHigh !== undefined
                  ? `${player.projectionLow}-${player.projectionHigh}`
                  : `${player.highScore ?? '-'}/${player.lowScore ?? '-'}`}
              </div>
            </div>

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

            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              disabled={!hasFactors}
              className="w-12 text-xs text-green-700 disabled:text-gray-300 disabled:cursor-not-allowed text-center"
            >
              {expanded ? 'Hide' : 'Why?'}
            </button>
          </div>
        </div>

        {hasFactors && (
          <div className="ml-9 mt-2 flex gap-1.5 flex-wrap">
            {player.projectionFactors!.slice(0, 5).map((factor) => (
              <FactorPill key={`${player.id}-${factor.kind}`} factor={factor} />
            ))}
          </div>
        )}
      </div>

      {expanded && hasFactors && (
        <div className="ml-9 mr-4 mb-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold text-gray-700">Projection breakdown</div>
            <div className="text-xs text-gray-500">
              {player.projectionConfidence || 'Medium'} confidence
            </div>
          </div>

          <div className="mb-2 text-xs text-gray-500">
            {player.projectionReason || 'Projection uses current AFL Fantasy average, recent form, fixture and volatility.'}
          </div>

          <div>
            {player.projectionFactors!.map((factor) => (
              <FactorRow key={`${player.id}-row-${factor.kind}`} factor={factor} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHeader({
  sectionKey,
  label,
  count,
  target,
}: {
  sectionKey: string
  label: string
  count: number
  target: number
}) {
  const color = SECTION_COLORS[sectionKey] || 'bg-gray-400'

  return (
    <div className={`${color} text-white px-4 py-2 flex items-center justify-between`}>
      <span className="text-xs font-bold tracking-wider">{label}</span>
      <span className="text-xs opacity-75">{count}/{target}</span>
    </div>
  )
}

export default function SquadView({ players }: SquadViewProps) {
  if (players.length === 0) return null

  const grouped = SECTIONS.reduce((acc, section) => {
    acc[section.key] = players.filter((player) => (player.lineupPosition || 'BENCH') === section.key)
    return acc
  }, {} as Record<string, Player[]>)

  const totalAvg = players.reduce((sum, player) => sum + (player.avgScore || 0), 0)
  const startingPlayers = players.filter((player) => player.lineupPosition !== 'BENCH')
  const startingAvg = startingPlayers.reduce((sum, player) => sum + (player.avgScore || 0), 0)
  const projectedTotal = startingPlayers.reduce((sum, player) => sum + (player.projectedScore || player.avgScore || 0), 0)

  return (
    <div className="flex flex-col gap-0">
      <div className="flex gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 flex-wrap">
        <div className="text-xs">
          <span className="text-gray-500">Squad avg </span>
          <span className="font-bold text-gray-900">{(totalAvg / players.length).toFixed(1)}</span>
        </div>

        <div className="text-xs">
          <span className="text-gray-500">Starting avg </span>
          <span className="font-bold text-gray-900">
            {startingPlayers.length ? (startingAvg / startingPlayers.length).toFixed(1) : '0.0'}
          </span>
        </div>

        <div className="text-xs">
          <span className="text-gray-500">Projected start </span>
          <span className="font-bold text-green-700">{Math.round(projectedTotal)}</span>
        </div>

        <div className="text-xs">
          <span className="text-gray-500">Season total </span>
          <span className="font-bold text-gray-900">
            {players.reduce((sum, player) => sum + (player.totalPoints || 0), 0).toLocaleString()}
          </span>
        </div>

        <div className="text-xs hidden sm:block">
          <span className="text-gray-500">High scorer </span>
          <span className="font-bold text-gray-900">
            {[...players].sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))[0]?.name.split(' ').pop()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-1.5 bg-white border-b border-gray-100">
        <div className="w-6" />
        <div className="flex-1 text-xs text-gray-400 font-medium">PLAYER</div>

        <div className="flex gap-3 shrink-0 text-right">
          <div className="hidden sm:block w-7 text-xs text-gray-400">GP</div>
          <div className="w-10 text-xs text-gray-400">AVG</div>
          <div className="w-12 text-xs text-gray-400">PROJ</div>
          <div className="hidden sm:block w-10 text-xs text-gray-400">L3</div>
          <div className="hidden sm:block w-10 text-xs text-gray-400">FORM</div>
          <div className="hidden md:block w-16 text-xs text-gray-400">RANGE</div>
          <div className="w-12 text-xs text-gray-400">LAST</div>
          <div className="w-12 text-xs text-gray-400">WHY</div>
        </div>
      </div>

      {SECTIONS.map((section) => {
        const sectionPlayers = grouped[section.key] || []

        if (sectionPlayers.length === 0) return null

        return (
          <div key={section.key} className="border-b border-gray-200 last:border-0">
            <SectionHeader
              sectionKey={section.key}
              label={section.label}
              count={sectionPlayers.length}
              target={section.target}
            />

            {sectionPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        )
      })}
    </div>
  )
}