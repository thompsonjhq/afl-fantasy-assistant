'use client'

import { useState } from 'react'
import { Player } from '@/types'

interface Comparison {
  player: Player
  replacementPlayer?: Player
  netGain?: number
  reason: string
}

interface FreeAgentComparisonProps {
  players: Player[]
  round: number
}

function positionLabel(player: Player) {
  return `${player.position}${player.position2 ? `/${player.position2}` : ''}`
}

export default function FreeAgentComparison({ players, round }: FreeAgentComparisonProps) {
  const [comparisons, setComparisons] = useState<Comparison[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadComparisons() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/projections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players, round, includeFreeAgents: true, freeAgentLimit: 100 }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to compare free agents')

      setComparisons(data.comparisons || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare free agents')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">Free Agent Projection Comparison</h2>
          <p className="text-sm text-gray-500 mt-0.5">Compares available players against the weakest comparable player on your squad.</p>
        </div>
        <button
          onClick={loadComparisons}
          disabled={loading || players.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          {loading ? 'Comparing...' : 'Compare'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

      {comparisons.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 font-medium">Free agent</th>
                <th className="py-2 font-medium">Proj</th>
                <th className="py-2 font-medium">Compare to</th>
                <th className="py-2 font-medium">Gain</th>
                <th className="py-2 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {comparisons.slice(0, 20).map((comparison) => (
                <tr key={comparison.player.id}>
                  <td className="py-2 pr-3">
                    <div className="font-medium text-gray-900">{comparison.player.name}</div>
                    <div className="text-xs text-gray-500">{positionLabel(comparison.player)} · {comparison.player.team}</div>
                  </td>
                  <td className="py-2 pr-3 font-semibold text-green-700">{comparison.player.projectedScore ?? '-'}</td>
                  <td className="py-2 pr-3">
                    {comparison.replacementPlayer ? (
                      <>
                        <div className="text-gray-900">{comparison.replacementPlayer.name}</div>
                        <div className="text-xs text-gray-500">Proj {comparison.replacementPlayer.projectedScore ?? comparison.replacementPlayer.avgScore}</div>
                      </>
                    ) : '—'}
                  </td>
                  <td className={`py-2 pr-3 font-semibold ${(comparison.netGain ?? 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {comparison.netGain === undefined ? '—' : `${comparison.netGain >= 0 ? '+' : ''}${comparison.netGain}`}
                  </td>
                  <td className="py-2 text-xs text-gray-600 min-w-64">{comparison.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}