'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useSquad } from '@/lib/squad-context'
import { Player } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const POSITIONS = ['DEF', 'MID', 'RUC', 'FWD']
const POSITIONS_WITH_NONE = ['', 'DEF', 'MID', 'RUC', 'FWD']

const AFL_TEAMS = [
  'Adelaide', 'Brisbane Lions', 'Carlton', 'Collingwood', 'Essendon',
  'Fremantle', 'Geelong', 'Gold Coast', 'GWS Giants', 'Hawthorn',
  'Melbourne', 'North Melbourne', 'Port Adelaide', 'Richmond', 'St Kilda',
  'Sydney', 'West Coast', 'Western Bulldogs',
]

interface PlayerFormState {
  name: string
  team: string
  position: string
  position2: string
  avgScore: number
  lastScore: number
  totalPoints: number
  injured: boolean
  injuryNote: string
}

const EMPTY_FORM: PlayerFormState = {
  name: '',
  team: 'Adelaide',
  position: 'MID',
  position2: '',
  avgScore: 0,
  lastScore: 0,
  totalPoints: 0,
  injured: false,
  injuryNote: '',
}

function positionBadge(position: string, position2?: string) {
  return (
    <div className="flex gap-1">
      <Badge variant="secondary">{position}</Badge>
      {position2 && <Badge variant="outline">{position2}</Badge>}
    </div>
  )
}

export default function SquadManager() {
  const { players, loading, refetchSquad } = useSquad()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PlayerFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function openAddDialog() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEditDialog(player: Player) {
    setEditingId(player.id)
    setForm({
      name: player.name,
      team: player.team,
      position: player.position,
      position2: player.position2 || '',
      avgScore: player.avgScore,
      lastScore: player.lastScore,
      totalPoints: player.totalPoints,
      injured: player.injured,
      injuryNote: player.injuryNote || '',
    })
    setDialogOpen(true)
  }

  async function savePlayer() {
    if (!form.name.trim()) return
    setSaving(true)

    const payload = {
      name: form.name,
      team: form.team,
      position: form.position,
      position2: form.position2 || null,
      avg_score: form.avgScore,
      last_score: form.lastScore,
      total_points: form.totalPoints,
      injured: form.injured,
      injury_note: form.injuryNote,
    }

    const { error } = editingId
      ? await supabase.from('players').update(payload).eq('id', editingId)
      : await supabase.from('players').insert(payload)

    setSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(editingId ? 'Player updated' : 'Player added')
    setDialogOpen(false)
    refetchSquad()
  }

  async function deletePlayer(id: string, name: string) {
    const { error } = await supabase.from('players').delete().eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(`Removed ${name}`)
    refetchSquad()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {players.length} player{players.length === 1 ? '' : 's'} in squad
        </p>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" onClick={openAddDialog}>
              <Plus className="h-3.5 w-3.5" /> Add Player
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Player' : 'Add Player'}</DialogTitle>
              <DialogDescription>
                Manual squad entries - use Sync to pull real data from AFL Fantasy Draft instead where possible.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Team</label>
                <Select value={form.team} onValueChange={(value) => setForm({ ...form, team: value })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AFL_TEAMS.map((team) => <SelectItem key={team} value={team}>{team}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Position</label>
                <Select value={form.position} onValueChange={(value) => setForm({ ...form, position: value })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((pos) => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">2nd Position</label>
                <Select value={form.position2 || '__none__'} onValueChange={(value) => setForm({ ...form, position2: value === '__none__' ? '' : value })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS_WITH_NONE.map((pos) => <SelectItem key={pos || '__none__'} value={pos || '__none__'}>{pos || 'None'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Avg Score</label>
                <Input type="number" value={form.avgScore} onChange={(e) => setForm({ ...form, avgScore: Number(e.target.value) })} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Last Score</label>
                <Input type="number" value={form.lastScore} onChange={(e) => setForm({ ...form, lastScore: Number(e.target.value) })} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Total Points</label>
                <Input type="number" value={form.totalPoints} onChange={(e) => setForm({ ...form, totalPoints: Number(e.target.value) })} />
              </div>

              <div className="col-span-2 flex items-center gap-2 pt-1">
                <input
                  id="injured-checkbox"
                  type="checkbox"
                  checked={form.injured}
                  onChange={(e) => setForm({ ...form, injured: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                <label htmlFor="injured-checkbox" className="text-sm text-foreground">Injured</label>
              </div>

              {form.injured && (
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Injury note</label>
                  <Input value={form.injuryNote} onChange={(e) => setForm({ ...form, injuryNote: e.target.value })} />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={savePlayer} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Position</TableHead>
              <TableHead className="text-right">Avg</TableHead>
              <TableHead className="text-right">Last</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading && players.map((player) => (
              <TableRow key={player.id}>
                <TableCell className="font-medium">{player.name}</TableCell>
                <TableCell className="text-muted-foreground">{player.team}</TableCell>
                <TableCell>{positionBadge(player.position, player.position2)}</TableCell>
                <TableCell className="text-right">{player.avgScore}</TableCell>
                <TableCell className="text-right">{player.lastScore}</TableCell>
                <TableCell>
                  {player.injured
                    ? <Badge variant="destructive">{player.injuryNote || 'Injured'}</Badge>
                    : <Badge variant="outline" className="text-emerald-700">Fit</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(player)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => deletePlayer(player.id, player.name)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
