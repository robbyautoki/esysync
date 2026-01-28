interface FalseStep {
  id: string
  type: 'EMAIL' | 'DELAY' | 'TAG'
  subject?: string | null
  delayValue?: number | null
  delayUnit?: string | null
  tagAction?: string | null
  tagValue?: string | null
}

interface Step {
  id: string
  type: 'EMAIL' | 'DELAY' | 'TAG' | 'SEGMENT' | 'CONDITION'
  order: number
  subject?: string | null
  content?: { type: string; content?: unknown[] } | null
  delayValue?: number | null
  delayUnit?: string | null
  tagAction?: string | null
  tagValue?: string | null
  targetSegmentId?: string | null
  conditionType?: string | null
  conditionValue?: string | null
  falseSteps?: FalseStep[] | null
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

    if (step.type === 'CONDITION') {
      // Bedingung ohne Typ
      if (!step.conditionType || step.conditionType.trim() === '') {
        errors.push({
          stepIndex: i,
          stepId: step.id,
          message: `Bedingung ${i + 1} hat keinen Typ`
        })
      }
      
      // Bedingung ohne Wert (außer für allgemeine Typen)
      if (step.conditionType && !step.conditionValue?.trim()) {
        errors.push({
          stepIndex: i,
          stepId: step.id,
          message: `Bedingung ${i + 1} hat keinen Wert`
        })
      }

      // Validiere False-Steps
      if (step.falseSteps && step.falseSteps.length > 0) {
        for (let j = 0; j < step.falseSteps.length; j++) {
          const fs = step.falseSteps[j]
          if (fs.type === 'EMAIL' && (!fs.subject || fs.subject.trim() === '')) {
            errors.push({
              stepIndex: i,
              stepId: step.id,
              message: `Bedingung ${i + 1}: Falls-NEIN E-Mail ${j + 1} hat keinen Betreff`
            })
          }
          if (fs.type === 'TAG' && (!fs.tagValue || fs.tagValue.trim() === '')) {
            errors.push({
              stepIndex: i,
              stepId: step.id,
              message: `Bedingung ${i + 1}: Falls-NEIN Tag ${j + 1} hat keinen Namen`
            })
          }
        }
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
