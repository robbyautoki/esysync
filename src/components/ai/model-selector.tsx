'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Check, Sparkles, Zap } from 'lucide-react'

interface Model {
  id: string
  name: string
  provider: string
  description: string
  icon: typeof Sparkles
}

const MODELS: Model[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Bestes Modell', icon: Sparkles },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Schnell & günstig', icon: Zap },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5', provider: 'Anthropic', description: 'Kreativ & präzise', icon: Sparkles },
]

interface ModelSelectorProps {
  value?: string
  onChange?: (modelId: string) => void
  disabled?: boolean
}

export function ModelSelector({ value = 'gpt-4o', onChange, disabled }: ModelSelectorProps) {
  const selectedModel = MODELS.find(m => m.id === value) || MODELS[0]
  const Icon = selectedModel.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 gap-2 text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm">{selectedModel.name}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>KI-Modell wählen</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MODELS.map((model) => {
          const ModelIcon = model.icon
          const isSelected = model.id === value
          return (
            <DropdownMenuItem
              key={model.id}
              onClick={() => onChange?.(model.id)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ModelIcon className="w-4 h-4" />
                <div>
                  <div className="font-medium">{model.name}</div>
                  <div className="text-xs text-muted-foreground">{model.description}</div>
                </div>
              </div>
              {isSelected && <Check className="w-4 h-4" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
