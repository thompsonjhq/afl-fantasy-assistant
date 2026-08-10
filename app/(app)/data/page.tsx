import UpdateAllPanel from '@/components/UpdateAllPanel'

export default function DataPage() {
  return (
    <>
      <UpdateAllPanel />
      <p className="text-xs text-muted-foreground">
        The <strong>Sync</strong> button in the header only pulls your squad from AFL Fantasy Draft.
        <strong> Update All</strong> above does that plus the real match-log/injury scraping and model refit.
      </p>
    </>
  )
}
