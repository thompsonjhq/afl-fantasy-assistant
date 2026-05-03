'use client'

import { useState } from 'react'
import { Player } from '@/types'
import SquadManager from '@/components/SquadManager'
import SquadView from '@/components/SquadView'
import AnalysisCard from '@/components/AnalysisCard'

const ANALYSIS_FEATURES = [
  {
    type: 'strengths' as const,
    title: 'Strengths & Weaknesses',
    description: 'Injury risks, team deficiencies and overall health of your squad',
    icon: '🏆',
  },
  {
    type: 'projections' as const,
    title: 'Projected Scores',
    description: 'AI predicted scores based on form, averages and opponent difficulty',
    icon: '📊',
  },
  {
    type: 'freeagents' as const,
    title: 'Free Agent Targets',
    description: 'Best available players to strengthen your squad this week',
    icon: '🎯',
  },
  {
    type: 'trades' as const,
    title: 'Trade Recommendations',
    description: 'Smart trade options to improve your team value and scoring',
    icon: '🔄',
  },
  {
    type: 'captain' as const,
    title: 'Captain & Lineup',
    description: 'Optimal captain pick and starting 18 for this round',
    icon: '⭐',
  },
]

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([])
  const [round, setRound] = useState<number>(9)
  const [showEditor, setShowEditor] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

async function syncFromAFL() {
  setSyncing(true)
  setSyncMessage('')
  try {
    const res = await fetch('/api/sync', { method: 'POST' })
    const text = await res.text()
    console.log('Raw sync response:', text)
    const data = JSON.parse(text)
    if (data.success) {
      setSyncMessage(`✅ Synced ${data.synced} players — refreshing...`)
      setTimeout(() => window.location.reload(), 1500)
    } else {
      setSyncMessage(`❌ ${data.error || 'Sync failed'}`)
    }
  } catch (err) {
    console.error('Sync error:', err)
    setSyncMessage('❌ Network error — see console for details')
  } finally {
    setSyncing(false)
  }
}

  return (
    <main className="min-h-screen bg-gray-100">

      {/* Header */}
      <div className="bg-green-700 text-white px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">RoamingJT</h1>
            <p className="text-green-300 text-sm mt-0.5">AFL Fantasy Draft Assistant · Round {round}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-green-800 rounded-lg px-3 py-1.5">
                <label className="text-green-300 text-xs font-medium">RND</label>
                <input
                  type="number"
                  min={1}
                  max={23}
                  value={round}
                  onChange={(e) => setRound(Number(e.target.value))}
                  className="w-10 bg-transparent text-white text-sm font-bold focus:outline-none"
                />
              </div>
              <button
                onClick={syncFromAFL}
                disabled={syncing}
                className="bg-white text-green-700 hover:bg-green-50 disabled:opacity-60 font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {syncing ? (
                  <div className="w-3.5 h-3.5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                ) : '🔄'}
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            </div>
            {syncMessage && (
              <p className="text-xs text-green-300">{syncMessage}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Squad card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-900">My Squad</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {players.length > 0 ? `${players.length} players · Round ${round}` : 'Sync from AFL Fantasy to load your squad'}
              </p>
            </div>
            <button
              onClick={() => setShowEditor(!showEditor)}
              className="text-xs text-green-600 hover:text-green-700 font-medium border border-green-200 px-3 py-1.5 rounded-lg"
            >
              {showEditor ? 'Hide Editor' : 'Edit Squad'}
            </button>
          </div>

<div className={showEditor ? 'p-4 border-b border-gray-100' : 'hidden'}>
  <SquadManager onSquadChange={setPlayers} />
</div>

          {players.length > 0 ? (
            <SquadView players={players} />
          ) : (
            <div className="px-4 py-12 text-center">
              <p className="text-gray-400 text-sm">Click <strong className="text-green-600">Sync</strong> in the header to load your squad from AFL Fantasy</p>
            </div>
          )}
        </div>

        {/* Analysis cards */}
        {players.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wider px-1">AI Analysis</h2>
            {ANALYSIS_FEATURES.map((feature) => (
              <AnalysisCard
                key={feature.type}
                {...feature}
                players={players}
                round={round}
              />
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          Squiggle API · Groq AI · AFL Fantasy Draft
        </p>
      </div>
    </main>
  )
}