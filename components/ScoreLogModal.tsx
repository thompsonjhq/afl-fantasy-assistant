'use client'

import { useState } from 'react'
import { Player } from '@/types'

interface ScoreLogModalProps {
  players: Player[]
  round: number
  onClose: () => void
  onSaved: () => void
}

export default function ScoreLogModal({ players, round, onClose, onSaved }: ScoreLogModalProps) {
  const [scores, setScores] = useState<Record<string, string>>(() => Object.fromEntries(
    players.map((player) => {
      const roundIndex = player.scoreRounds?.findIndex((value) => value === round) ?? -1
      const existingScore = roundIndex >= 0 ? player.scores?.[roundIndex] : player.lastScore || ''
      return [player.id, existingScore ? String(existingScore) : '']
    })
  ))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function saveScores() {
    setSaving(true)
    setError('')

    const payload = Object.entries(scores)
      .map(([playerId, value]) => ({ playerId, round, score: Number(value) }))
      .filter((entry) => Number.isFinite(entry.score) && entry.score >= 0)

    try {
      const res = await fetch('/api/round-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: payload }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save scores')

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scores')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Log Round {round} Scores</h2>
            <p className="text-xs text-gray-500 mt-0.5">Saved scores update last score, averages, form and projections.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
        </div>

        <div className="overflow-y-auto divide-y divide-gray-100">
          {players.map((player) => (
            <label key={player.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">{player.name}</div>
                <div className="text-xs text-gray-500">{player.position}{player.position2 ? `/${player.position2}` : ''} · Avg {player.avgScore}</div>
              </div>
              <input
                type="number"
                min={0}
                value={scores[player.id] || ''}
                onChange={(e) => setScores((current) => ({ ...current, [player.id]: e.target.value }))}
                className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-green-500"
                placeholder="0"
              />
            </label>
          ))}
        </div>

        {error && <div className="mx-5 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700">Cancel</button>
          <button
            onClick={saveScores}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium disabled:bg-gray-300"
          >
            {saving ? 'Saving...' : 'Save Scores'}
          </button>
        </div>
      </div>
    </div>
  )
}