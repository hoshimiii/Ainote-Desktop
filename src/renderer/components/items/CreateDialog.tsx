import { useState } from 'react'
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../ui'
import { Button, Input } from '../ui'

interface CreateDialogProps {
  initialName?: string
  title?: string
  onConfirm: (name: string) => void
  trigger?: React.ReactNode
}

export function CreateDialog({ initialName = '', title = 'Create', onConfirm, trigger }: CreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)

  const handleConfirm = () => {
    if (!name.trim()) return
    onConfirm(name.trim())
    setName(initialName)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">Create</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name..."
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirm}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
