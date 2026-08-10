import { SquadProvider } from '@/lib/squad-context'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <SquadProvider>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex min-h-svh w-full flex-col">
          <AppHeader />
          <main className="flex-1 bg-muted/30 p-4 sm:p-6">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
          </main>
        </div>
      </SidebarProvider>
    </SquadProvider>
  )
}
