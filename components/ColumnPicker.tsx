'use client'

import { Columns3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EXTRA_COLUMNS, ExtraColumnKey } from '@/lib/extraPlayerColumns'

interface ColumnPickerProps {
  visible: ExtraColumnKey[]
  onToggle: (key: ExtraColumnKey) => void
}

export function ColumnPicker({ visible, onToggle }: ColumnPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Columns3 className="h-3.5 w-3.5" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Show columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {EXTRA_COLUMNS.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={visible.includes(column.key)}
            onCheckedChange={() => onToggle(column.key)}
            onSelect={(event) => event.preventDefault()}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
