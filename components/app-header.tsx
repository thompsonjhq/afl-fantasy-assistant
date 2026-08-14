'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, RefreshCw, Sun } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSquad } from '@/lib/squad-context'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/squad': 'Squad',
  '/projections': 'Projections',
  '/free-agents': 'Free Agents',
  '/compare': 'Compare',
  '/dvp': 'DVP Stats',
  '/team-news': 'Team News',
  '/insights': 'AI Insights',
  '/model-accuracy': 'Model Accuracy',
  '/data': 'Data',
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!mounted) return <div className="h-8 w-8" />

  return (
    <Button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      aria-label="Toggle dark mode"
    >
      {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

export function AppHeader() {
  const pathname = usePathname()
  const { round, setRound, syncing, syncFromAFL, projecting } = useSquad()
  const title = PAGE_TITLES[pathname] || 'RoamingJT'

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />

      <div className="flex flex-1 items-center gap-2">
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
        {projecting && <span className="text-xs text-muted-foreground animate-pulse">updating projections…</span>}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-2 py-1">
        <label htmlFor="round-input" className="text-xs font-medium text-muted-foreground">
          Round
        </label>
        <Input
          id="round-input"
          type="number"
          min={1}
          max={24}
          value={round}
          onChange={(e) => setRound(Number(e.target.value))}
          className="h-6 w-12 border-0 p-0 text-center shadow-none focus-visible:ring-0"
        />
      </div>

      <Button onClick={syncFromAFL} disabled={syncing} size="sm" className="gap-1.5">
        <RefreshCw className={syncing ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
        {syncing ? 'Syncing…' : 'Sync'}
      </Button>

      <ThemeToggle />
    </header>
  )
}
