'use client'

import { useState } from 'react'
import { SequenceTable } from './sequence-table'
import { SequenceAnalyticsSheet } from './sequence-analytics-sheet'

interface Sequence {
  id: string
  name: string
  isActive: boolean
  trigger: string
  createdAt: Date
  steps: { type: string }[]
  _count: { states: number }
}

interface SequencesPageClientProps {
  sequences: Sequence[]
}

export function SequencesPageClient({ sequences }: SequencesPageClientProps) {
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null)

  const handleOpenAnalytics = (sequence: Sequence) => {
    setSelectedSequence(sequence)
    setAnalyticsOpen(true)
  }

  return (
    <>
      <SequenceTable
        sequences={sequences}
        onOpenAnalytics={handleOpenAnalytics}
      />
      <SequenceAnalyticsSheet
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        sequence={selectedSequence}
      />
    </>
  )
}
