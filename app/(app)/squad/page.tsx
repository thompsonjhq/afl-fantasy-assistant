'use client'

import { useState } from 'react'
import { NotebookPen } from 'lucide-react'
import { useSquad } from '@/lib/squad-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import SquadManager from '@/components/SquadManager'
import SquadView from '@/components/SquadView'
import ScoreLogModal from '@/components/ScoreLogModal'

export default function SquadPage() {
  const { players, round, loading, handleScoresSaved } = useSquad()
  const [showScoreLog, setShowScoreLog] = useState(false)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Squad</CardTitle>
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
        <CardContent>
          <SquadManager />
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-64" />
      ) : players.length > 0 ? (
        <SquadView players={players} />
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No players yet - add one above or hit Sync.
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
