import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CateringInputProps {
  label: string
  value: string | undefined
  onChange: (val: string | undefined) => void
  options: string[]
}

export function CateringInput({ label, value, onChange, options }: CateringInputProps) {
  const [open, setOpen] = useState(false)

  const filtered = options.filter(opt =>
    value ? opt.toLowerCase().includes(value.toLowerCase()) : true
  )

  return (
    <div className="relative space-y-2">
      <Label>{label}</Label>
      <Input
        value={value ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="הזן שם קייטרינג"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-10 w-full bg-background border rounded-md shadow-md mt-1 max-h-40 overflow-y-auto">
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              className="w-full px-3 py-2 text-right text-sm hover:bg-accent"
              onMouseDown={() => {
                onChange(opt)
                setOpen(false)
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
