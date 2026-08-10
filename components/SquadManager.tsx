'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Player } from '@/types'

const POSITIONS = ['DEF', 'MID', 'RUC', 'FWD']
const POSITIONS_WITH_NONE = ['', 'DEF', 'MID', 'RUC', 'FWD']

const AFL_TEAMS = [
  'Adelaide', 'Brisbane Lions', 'Carlton', 'Collingwood', 'Essendon',
  'Fremantle', 'Geelong', 'Gold Coast', 'GWS Giants', 'Hawthorn',
  'Melbourne', 'North Melbourne', 'Port Adelaide', 'Richmond', 'St Kilda',
  'Sydney', 'West Coast', 'Western Bulldogs'
]

interface SquadManagerProps {
  onSquadChange: (players: Player[]) => void
}

export default function SquadManager({ onSquadChange }: SquadManagerProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    team: 'Adelaide',
    position: 'MID',
    position2: '',
    avgScore: 0,
    lastScore: 0,
    totalPoints: 0,
    injured: false,
    injuryNote: '',
  })

  useEffect(() => {
    fetchPlayers()
  }, [])

  async function fetchPlayers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('position', { ascending: true })

if (error) {
  console.error('Error fetching players:', error)
} else {
const mapped = (data || []).map((p) => ({
  id: p.id,
  name: p.name,
  team: p.team,
  position: p.position,
  position2: p.position2 || '',
  avgScore: p.avg_score,
  lastScore: p.last_score,
  totalPoints: p.total_points,
  injured: p.injured,
  injuryNote: p.injury_note,
  scores: p.scores || [],
  scoreRounds: p.score_rounds || [],
  lineupPosition: p.lineup_position || 'BENCH',
  isCaptain: p.is_captain || false,
  isViceCaptain: p.is_vice_captain || false,
  last3Avg: p.last3_avg || 0,
  last5Avg: p.last5_avg || 0,
  highScore: p.high_score || 0,
  lowScore: p.low_score || 0,
  gamesPlayed: p.games_played || 0,
  aflFantasyId: p.afl_fantasy_id || 0,
}))
  setPlayers(mapped)
  onSquadChange(mapped)
}
setLoading(false)
  }

  async function addPlayer() {
  if (!newPlayer.name.trim()) return
  setSaving(true)

  const { data, error } = await supabase
    .from('players')
    .insert({
      name: newPlayer.name,
      team: newPlayer.team,
      position: newPlayer.position,
      position2: newPlayer.position2,
      avg_score: newPlayer.avgScore,
      last_score: newPlayer.lastScore,
      total_points: newPlayer.totalPoints,
      injured: newPlayer.injured,
      injury_note: newPlayer.injuryNote,
    })
    .select('*')

  if (error) {
    console.error('Error adding player:', JSON.stringify(error), error.message)
  } else {
    const row = Array.isArray(data) ? data[0] : data
const added: Player = {
  id: row.id,
  name: row.name,
  team: row.team,
  position: row.position,
  position2: row.position2 || '',
  avgScore: row.avg_score,
  lastScore: row.last_score,
  totalPoints: row.total_points,
  injured: row.injured,
  injuryNote: row.injury_note,
  scores: row.scores || [],
  scoreRounds: row.score_rounds || [],
}
    const updated = [...players, added]
    setPlayers(updated)
    onSquadChange(updated)
    setNewPlayer({
      name: '',
      team: 'Adelaide',
      position: 'MID',
      position2: '',
      avgScore: 0,
      lastScore: 0,
      totalPoints: 0,
      injured: false,
      injuryNote: '',
    })
  }
  setSaving(false)
}

  async function updatePlayer(player: Player) {
    const { error } = await supabase
      .from('players')
      .update({
        name: player.name,
        team: player.team,
        position: player.position,
        position2: player.position2,
        avg_score: player.avgScore,
        last_score: player.lastScore,
        total_points: player.totalPoints,
        injured: player.injured,
        injury_note: player.injuryNote,
      })
      .eq('id', player.id)

    if (error) {
      console.error('Error updating player:', error)
    } else {
      const updated = players.map((p) => (p.id === player.id ? player : p))
      setPlayers(updated)
      onSquadChange(updated)
      setEditingId(null)
    }
  }

  async function deletePlayer(id: string) {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting player:', error)
    } else {
      const updated = players.filter((p) => p.id !== id)
      setPlayers(updated)
      onSquadChange(updated)
    }
  }

  function positionBadge(pos: string, pos2: string) {
    return (
      <div className="flex gap-1">
        <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">{pos}</span>
        {pos2 && <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">{pos2}</span>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        Loading your squad...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {players.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {['DEF', 'MID', 'RUC', 'FWD'].map((pos) => {
            const count = players.filter(
              (p) => p.position === pos || p.position2 === pos
            ).length
            return (
              <div key={pos} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
                <span className="text-gray-500">{pos} </span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            )
          })}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
            <span className="text-gray-500">Total </span>
            <span className="font-semibold text-gray-900">{players.length}</span>
          </div>
        </div>
      )}

      {players.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Team</th>
                <th className="pb-2 font-medium">Position</th>
                <th className="pb-2 font-medium">Avg</th>
                <th className="pb-2 font-medium">Last</th>
                <th className="pb-2 font-medium">Total</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {players.map((player) =>
                editingId === player.id ? (
                  <tr key={player.id} className="bg-green-50">
                    <td className="py-2 pr-2">
                      <input type="text" value={player.name}
                        onChange={(e) => setPlayers(players.map((p) => p.id === player.id ? { ...p, name: e.target.value } : p))}
                        className="w-full border border-green-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-green-500"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select value={player.team}
                        onChange={(e) => setPlayers(players.map((p) => p.id === player.id ? { ...p, team: e.target.value } : p))}
                        className="border border-green-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
                      >
                        {AFL_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex gap-1">
                        <select value={player.position}
                          onChange={(e) => setPlayers(players.map((p) => p.id === player.id ? { ...p, position: e.target.value } : p))}
                          className="border border-green-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
                        >
                          {POSITIONS.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
                        </select>
                        <select value={player.position2}
                          onChange={(e) => setPlayers(players.map((p) => p.id === player.id ? { ...p, position2: e.target.value } : p))}
                          className="border border-green-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
                        >
                          {POSITIONS_WITH_NONE.map((pos) => <option key={pos} value={pos}>{pos || '—'}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" value={player.avgScore}
                        onChange={(e) => setPlayers(players.map((p) => p.id === player.id ? { ...p, avgScore: Number(e.target.value) } : p))}
                        className="w-16 border border-green-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" value={player.lastScore}
                        onChange={(e) => setPlayers(players.map((p) => p.id === player.id ? { ...p, lastScore: Number(e.target.value) } : p))}
                        className="w-16 border border-green-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" value={player.totalPoints}
                        onChange={(e) => setPlayers(players.map((p) => p.id === player.id ? { ...p, totalPoints: Number(e.target.value) } : p))}
                        className="w-20 border border-green-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="checkbox" checked={player.injured}
                        onChange={(e) => setPlayers(players.map((p) => p.id === player.id ? { ...p, injured: e.target.checked } : p))}
                        className="w-4 h-4 accent-green-600"
                      />
                    </td>
                    <td className="py-2 flex gap-2">
                      <button onClick={() => updatePlayer(player)} className="text-green-600 hover:text-green-700 font-medium text-xs">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={player.id} className="group">
                    <td className="py-2 pr-2 font-medium text-gray-900">{player.name}</td>
                    <td className="py-2 pr-2 text-gray-600 text-xs">{player.team}</td>
                    <td className="py-2 pr-2">{positionBadge(player.position, player.position2)}</td>
                    <td className="py-2 pr-2 text-gray-700">{player.avgScore}</td>
                    <td className="py-2 pr-2 text-gray-700">{player.lastScore}</td>
                    <td className="py-2 pr-2 text-gray-700">{player.totalPoints}</td>
                    <td className="py-2 pr-2">
                      {player.injured
                        ? <span className="text-red-500 text-xs font-medium" title={player.injuryNote || undefined}>
                            ⚠ {player.injuryNote || 'Injured'}
                          </span>
                        : <span className="text-green-600 text-xs">✓ Fit</span>
                      }
                    </td>
                    <td className="py-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingId(player.id)} className="text-blue-500 hover:text-blue-600 text-xs">Edit</button>
                      <button onClick={() => deletePlayer(player.id)} className="text-red-400 hover:text-red-500 text-xs">Remove</button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500 font-medium mb-2">ADD PLAYER</p>
        <div className="flex flex-wrap gap-2 items-end">
          <input type="text" placeholder="Player name" value={newPlayer.name}
            onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
          />
          <select value={newPlayer.team}
            onChange={(e) => setNewPlayer({ ...newPlayer, team: e.target.value })}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500"
          >
            {AFL_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">Pos 1</label>
            <select value={newPlayer.position}
              onChange={(e) => setNewPlayer({ ...newPlayer, position: e.target.value })}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500"
            >
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">Pos 2</label>
            <select value={newPlayer.position2}
              onChange={(e) => setNewPlayer({ ...newPlayer, position2: e.target.value })}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500"
            >
              {POSITIONS_WITH_NONE.map((p) => <option key={p} value={p}>{p || '—'}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">Avg</label>
            <input type="number" value={newPlayer.avgScore}
              onChange={(e) => setNewPlayer({ ...newPlayer, avgScore: Number(e.target.value) })}
              className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">Last</label>
            <input type="number" value={newPlayer.lastScore}
              onChange={(e) => setNewPlayer({ ...newPlayer, lastScore: Number(e.target.value) })}
              className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">Total</label>
            <input type="number" value={newPlayer.totalPoints}
              onChange={(e) => setNewPlayer({ ...newPlayer, totalPoints: Number(e.target.value) })}
              className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <button onClick={addPlayer} disabled={saving || !newPlayer.name.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            {saving ? 'Adding...' : '+ Add'}
          </button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-500 mb-2">DRAFT LINEUP STRUCTURE</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-white border border-gray-200 rounded px-2 py-1">3 × DEF</span>
          <span className="bg-white border border-gray-200 rounded px-2 py-1">4 × MID</span>
          <span className="bg-white border border-gray-200 rounded px-2 py-1">1 × RUC</span>
          <span className="bg-white border border-gray-200 rounded px-2 py-1">3 × FWD</span>
          <span className="bg-white border border-gray-200 rounded px-2 py-1">1 × FLEX</span>
          <span className="bg-white border border-gray-200 rounded px-2 py-1">4 × BENCH</span>
        </div>
      </div>
    </div>
  )
}