import { Input } from './input'
import { Label } from './label'

interface TimeInputProps {
  label: string
  value: string | undefined
  onChange: (val: string | undefined) => void
  hint?: string
}

export function TimeInput({ label, value, onChange, hint }: TimeInputProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="time"
        value={value ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
