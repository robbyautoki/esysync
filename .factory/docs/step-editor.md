# Step-Editor Architektur

Dokumentation für das Sequenz-Step-System in EsySync.

## Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                    STEP-EDITOR FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  UI (sequence-editor.tsx)                                   │
│       ↓                                                     │
│  Step-Card (step-card.tsx) - Anzeige + Bearbeitung          │
│       ↓                                                     │
│  Validierung (sequence-validation.ts) - Beim Aktivieren     │
│       ↓                                                     │
│  API (/api/sequences/[id]) - Speichern                      │
│       ↓                                                     │
│  Cron-Job (process-sequences) - Ausführung                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Dateien

| Datei | Verantwortung |
|-------|---------------|
| `prisma/schema.prisma` | StepType enum + SequenceStep Model |
| `src/components/sequences/sequence-editor.tsx` | Haupt-Editor, Step hinzufügen |
| `src/components/sequences/step-card.tsx` | Einzelne Step-Anzeige + Warnungen |
| `src/lib/sequence-validation.ts` | Validierung beim Aktivieren |
| `src/app/api/sequences/[id]/route.ts` | CRUD für Sequenz + Steps |
| `src/app/api/cron/process-sequences/route.ts` | Step-Ausführung |

---

## Step-Typen

### EMAIL
```prisma
type: EMAIL
subject: String       // Betreff
content: Json         // TipTap JSON Content
```

**Validierung:**
- Betreff darf nicht leer sein
- Content muss vorhanden sein
- `{{firstName}}` muss im Content sein
- Nicht 2 E-Mails hintereinander (Delay fehlt)

**Cron-Job:** Sendet E-Mail via Resend

---

### DELAY
```prisma
type: DELAY
delayValue: Int       // z.B. 3
delayUnit: String     // "minutes" | "hours" | "days"
```

**Validierung:**
- delayValue muss > 0 sein
- Nicht 2 Delays hintereinander
- Nicht am Ende der Sequenz
- Nicht als erster Step

**Cron-Job:** Berechnet nextRunAt und wartet

---

### TAG
```prisma
type: TAG
tagAction: String     // "add" | "remove"
tagValue: String      // Tag-Name z.B. "newsletter-subscriber"
```

**Validierung:**
- tagValue darf nicht leer sein

**Cron-Job:** 
- Bei "add": Tag zu Lead.customFields.tags hinzufügen
- Bei "remove": Tag aus Array entfernen

---

### SEGMENT
```prisma
type: SEGMENT
targetSegmentId: String   // Segment-ID
```

**Validierung:**
- targetSegmentId muss gesetzt sein

**Cron-Job:** Lead in Segment hinzufügen via LeadSegment

---

## Neuen Step-Typ hinzufügen

### 1. Prisma Schema
```prisma
// In enum StepType hinzufügen
enum StepType {
  EMAIL
  DELAY
  TAG
  SEGMENT
  NEW_TYPE    // NEU
}

// Neue Felder in SequenceStep
model SequenceStep {
  // ... bestehende Felder
  newTypeField String?   // NEU
}
```

Dann: `npx prisma db push`

### 2. Step-Card UI
In `step-card.tsx`:
```tsx
// Icon hinzufügen
{step.type === 'NEW_TYPE' && (
  <div className="... bg-purple-100 text-purple-600">
    <IconName className="h-5 w-5" />
  </div>
)}

// Content-Anzeige
{step.type === 'NEW_TYPE' && (
  <div>
    <p className="font-medium">Beschreibung</p>
    <p className="text-sm text-muted-foreground">Details</p>
  </div>
)}
```

### 3. Sequence-Editor
In `sequence-editor.tsx`:
```tsx
// Button hinzufügen
<Button onClick={() => addStep('NEW_TYPE')}>
  <IconName className="mr-2 h-4 w-4" />
  New Type
</Button>

// addStep Funktion erweitern
const addStep = async (type: 'EMAIL' | 'DELAY' | 'TAG' | 'SEGMENT' | 'NEW_TYPE') => {
  const newStep: Step = {
    id: `temp-${Date.now()}`,
    type,
    order: steps.length,
    // Typ-spezifische Defaults
    newTypeField: type === 'NEW_TYPE' ? 'default' : null,
  }
  // ...
}
```

### 4. Validierung
In `sequence-validation.ts`:
```tsx
if (step.type === 'NEW_TYPE') {
  if (!step.newTypeField) {
    errors.push({
      stepIndex: i,
      stepId: step.id,
      message: `Step ${i + 1}: Feld fehlt`
    })
  }
}
```

### 5. Cron-Job
In `process-sequences/route.ts`:
```tsx
if (currentStep.type === 'NEW_TYPE') {
  // Aktion ausführen
  await doSomething(state.lead, currentStep.newTypeField)
  
  // Event loggen
  await db.event.create({
    data: {
      leadId: state.leadId,
      type: 'NEW_TYPE_EXECUTED',
      metadata: { ... }
    }
  })
}
```

---

## Warnungen auf Step-Cards

Step-Cards zeigen ⚠️ Icon mit Tooltip wenn:

| Bedingung | Warnung |
|-----------|---------|
| EMAIL ohne Content | "Kein Inhalt vorhanden" |
| EMAIL ohne {{firstName}} | "{{firstName}} fehlt" |
| EMAIL nach EMAIL | "Delay zwischen E-Mails fehlt" |
| DELAY am Ende | "Delay am Ende ist überflüssig" |
| TAG ohne tagValue | "Tag nicht gesetzt" |
| SEGMENT ohne targetSegmentId | "Segment nicht gewählt" |

---

## Validierung beim Aktivieren

Sequenz kann NICHT aktiviert werden wenn:

1. **Keine Steps** vorhanden
2. **Erster Step ist DELAY**
3. **Letzter Step ist DELAY**
4. **2 E-Mails hintereinander** (Delay fehlt)
5. **2 Delays hintereinander**
6. **E-Mail ohne Betreff**
7. **E-Mail ohne Inhalt**
8. **E-Mail ohne {{firstName}}**
9. **TAG ohne tagValue**
10. **SEGMENT ohne targetSegmentId**

Fehler werden als Toast angezeigt mit Liste aller Probleme.

---

## Tips

- Nach Schema-Änderungen: `npx prisma db push`
- Step-Interface in mehreren Dateien definiert - alle synchron halten!
- Neue Step-Typen brauchen auch Behandlung in AI-Generator (`/api/ai/generate-steps`)
