interface Step {
  id: string
  type: 'EMAIL' | 'DELAY' | 'TAG' | 'SEGMENT'
  order: number
  subject?: string | null
  content?: { type: string; content?: unknown[] } | null
  delayValue?: number | null
  delayUnit?: string | null
  tagAction?: string | null
  tagValue?: string | null
  targetSegmentId?: string | null
}

interface ValidationError {
  stepIndex?: number
  stepId?: string
  message: string
}

export function validateSequence(steps: Step[]): ValidationError[] {
  const errors: ValidationError[] = []

  // Keine Steps
  if (steps.length === 0) {
    errors.push({ message: 'Sequenz hat keine Steps' })
    return errors
  }

  // Erster Step ist Delay
  if (steps[0].type === 'DELAY') {
    errors.push({ 
      stepIndex: 0, 
      stepId: steps[0].id,
      message: 'Erster Step darf kein Delay sein' 
    })
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const prevStep = i > 0 ? steps[i - 1] : null

    if (step.type === 'EMAIL') {
      // E-Mail ohne Betreff
      if (!step.subject || step.subject.trim() === '' || step.subject === 'Neuer Betreff') {
        errors.push({
          stepIndex: i,
          stepId: step.id,
          message: `E-Mail ${i + 1} hat keinen Betreff`
        })
      }

      // E-Mail ohne Inhalt
      const hasContent = step.content && 
        step.content.content && 
        Array.isArray(step.content.content) && 
        step.content.content.length > 0

      if (!hasContent) {
        errors.push({
          stepIndex: i,
          stepId: step.id,
          message: `E-Mail ${i + 1} hat keinen Inhalt`
        })
      }

      // Prüfe ob firstName Variable vorhanden
      if (hasContent) {
        const contentString = JSON.stringify(step.content)
        if (!contentString.includes('{{firstName}}') && !contentString.includes('{{ firstName }}')) {
          errors.push({
            stepIndex: i,
            stepId: step.id,
            message: `E-Mail ${i + 1} enthält nicht {{firstName}}`
          })
        }
      }

      // 2 E-Mails hintereinander
      if (prevStep && prevStep.type === 'EMAIL') {
        errors.push({
          stepIndex: i,
          stepId: step.id,
          message: `Zwischen E-Mail ${i} und ${i + 1} fehlt ein Delay`
        })
      }
    }

    if (step.type === 'DELAY') {
      // Delay ohne Wert
      if (!step.delayValue || step.delayValue <= 0) {
        errors.push({
          stepIndex: i,
          stepId: step.id,
          message: `Delay ${i + 1} hat keinen gültigen Wert`
        })
      }

      // 2 Delays hintereinander
      if (prevStep && prevStep.type === 'DELAY') {
        errors.push({
          stepIndex: i,
          stepId: step.id,
          message: `Zwei Delays hintereinander (Step ${i} und ${i + 1})`
        })
      }
    }

    if (step.type === 'TAG') {
      // Tag ohne Wert
      if (!step.tagValue || step.tagValue.trim() === '') {
        errors.push({
          stepIndex: i,
          stepId: step.id,
          message: `Tag ${i + 1} hat keinen Namen`
        })
      }
    }

    if (step.type === 'SEGMENT') {
      // Segment ohne ID
      if (!step.targetSegmentId || step.targetSegmentId.trim() === '') {
        errors.push({
          stepIndex: i,
          stepId: step.id,
          message: `Segment ${i + 1} hat kein Ziel-Segment`
        })
      }
    }
  }

  // Letzter Step ist Delay
  const lastStep = steps[steps.length - 1]
  if (lastStep.type === 'DELAY') {
    errors.push({
      stepIndex: steps.length - 1,
      stepId: lastStep.id,
      message: 'Letzter Step darf kein Delay sein'
    })
  }

  return errors
}

export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return ''
  
  const lines = errors.map(e => `• ${e.message}`)
  return `Sequenz kann nicht aktiviert werden:\n${lines.join('\n')}`
}
