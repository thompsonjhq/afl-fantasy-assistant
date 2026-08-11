'use client'

import { useState } from 'react'
import { NotebookPen, Goal, List, ChevronDown, Pencil } from 'lucide-react'
import { useSquad } from '@/lib/squad-context'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import SquadManager from '@/components/SquadManager'
import SquadView from '@/components/SquadView'
import SquadFieldView from '@/components/SquadFieldView'
import ScoreLogModal from '@/components/ScoreLogModal'

export default function SquadPage() {
  const { players, round, loading, handleScoresSaved } = useSquad()
  const [showScoreLog, setShowScoreLog] = useState(false)
  const [view, setView] = useState<'field' | 'list'>('field')
  const [manageOpen, setManageOpen] = useState(false)

  return (
    <>
      <Collapsible open={manageOpen} onOpenChange={setManageOpen}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" /> Manual edit
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${manageOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={players.length === 0}
              onClick={() => setShowScoreLog(true)}
            >
              <NotebookPen className="h-3.5 w-3.5" /> Log Scores
            </Button>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <SquadManager />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {loading ? (
        <Skeleton className="h-64" />
      ) : players.length > 0 ? (
        <div className="flex flex-col gap-4">
          <Tabs value={view} onValueChange={(value) => setView(value as 'field' | 'list')}>
            <TabsList>
              <TabsTrigger value="field" className="gap-1.5">
                <Goal className="h-3.5 w-3.5" /> Field
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5">
                <List className="h-3.5 w-3.5" /> List
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {view === 'field' ? <SquadFieldView players={players} /> : <SquadView players={players} />}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No players yet - open Manual edit above to add one, or hit Sync.
          </CardContent>
        </Card>
      )}

      <ScoreLogModal
        players={players}
        round={round}
        open={showScoreLog}
        onOpenChange={setShowScoreLog}
        onSaved={handleScoresSaved}
      />
    </>
  )
}
