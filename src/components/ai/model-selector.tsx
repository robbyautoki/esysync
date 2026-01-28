'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'

interface Model {
  id: string
  name: string
  provider: string
  logo?: string
}

const MODELS: Model[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', logo: 'https://models.dev/logos/openai.svg' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', logo: 'https://models.dev/logos/openai.svg' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', logo: 'https://models.dev/logos/anthropic.svg' },
]

interface ModelSelectorProps {
  value?: string
  onChange?: (modelId: string) => void
  disabled?: boolean
}

export function ModelSelector({ value = 'gpt-4o', onChange, disabled }: ModelSelectorProps) {
  const selectedModel = MODELS.find(m => m.id === value) || MODELS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 gap-2 text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          {selectedModel.logo && (
            <img 
              src={selectedModel.logo} 
              alt={selectedModel.provider} 
              className="w-4 h-4"
            />
          )}
          <span className="text-sm">{selectedModel.name}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {MODELS.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onChange?.(model.id)}
            className="gap-2"
          >
            {model.logo && (
              <img 
                src={model.logo} 
                alt={model.provider} 
                className="w-4 h-4"
              />
            )}
            <span>{model.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
