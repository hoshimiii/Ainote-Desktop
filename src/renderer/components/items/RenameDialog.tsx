import { useState } from 'react'
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../ui'
import { Button, Input } from '../ui'

interface RenameDialogProps {
  initialName: string
  title?: string
  onConfirm: (newName: string) => void
  trigger?: React.ReactNode
  /** Controlled open state */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function RenameDialog({ initialName, title = 'Rename', onConfirm, trigger, open: controlledOpen, onOpenChange }: RenameDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen
  const [name, setName] = useState(initialName)

  const handleOpen = (v: boolean) => {
    setOpen(v)
    if (v) setName(initialName)
  }

  const handleConfirm = () => {
    if (!name.trim()) return
    onConfirm(name.trim())
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon">
            <span className="material-symbols-outlined text-sm">edit</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirm}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
