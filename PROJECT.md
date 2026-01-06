# EsySync - Newsletter Tool

## Projektübersicht

Ein modernes Newsletter-Tool zum Erstellen von E-Mail-Sequenzen, Lead-Management und Tracking. Minimalistisches Apple-Style Design.

---

## Tech Stack

| Komponente | Technologie |
|------------|-------------|
| Frontend | Next.js 14+ (App Router) + React |
| UI | shadcn/studio Pro (MCP Integration) |
| Database | Neon PostgreSQL + Prisma ORM |
| Hosting | Vercel |
| E-Mail | Resend API |
| Editor | TipTap (Rich Text) |
| Jobs | Vercel Cron + Edge Functions |

---

## Features

### 1. Lead Management
- CSV-Import mit Spalten-Mapping (E-Mail + Vorname = Pflicht)
- Custom Fields dynamisch auswählbar
- Duplikat-Check: Meldung mit Anzahl, doppelte werden nicht importiert
- REST API für Lead-Import (`POST /api/leads`)
- Lead-Status: ACTIVE, UNSUBSCRIBED, BOUNCED
- Per-Lead Event History (Timeline)

### 2. Sequenz-Builder
- Drag & Drop Sequenz-Editor
- TipTap Rich-Text-Editor für E-Mail-Inhalte
- Variablen-System: `{{firstName}}`, `{{email}}`, Custom Fields
- Delay-Steps (Stunden/Tage)
- E-Mail Vorschau + Test-Versand
- A/B Testing (optional)

### 3. Trigger (Top 3)
1. **ON_IMPORT** - Lead startet automatisch bei CSV/API Import
2. **MANUAL** - Leads manuell zur Sequenz hinzufügen
3. **API_WEBHOOK** - Externe Systeme triggern via API

### 4. Tracking & Analytics
- Open-Tracking (Tracking-Pixel)
- Click-Tracking (Link-Wrapping)
- Bounce-Handling via Resend Webhooks (automatisch markieren)
- Dashboard mit Metriken (Open Rate, Click Rate)
- Per-Lead History (alle Events chronologisch, permanent gespeichert)

### 5. Stopp-Bedingungen
- E-Mail bounced → Lead wird markiert, Sequenz stoppt
- Sequenz ist abgeschlossen
- Lead meldet sich ab (Unsubscribe)

---

## UI/UX Richtlinien

### shadcn/studio MCP
- **Ausschließliche Nutzung** des shadcn/studio MCP für alle UI-Komponenten
- **Application Shell** als Basis-Layout
- **CUI (Command UI)** für Navigation - das Beste vom Besten
- Apple-inspiriertes minimalistisches Design

### Layout & Navigation
- Sidebar-Navigation mit CUI
- **Breadcrumbs** auf allen Unterseiten (z.B. Dashboard > Sequenzen > Willkommens-Serie)
- Konsistentes Spacing und Typography

### Interaktionen & Feedback
- **Tooltips** überall bei komplexen Features und Icons
- **Toast-Benachrichtigungen** für Erfolg/Fehler-Meldungen
- **Bestätigungs-Dialoge** vor destruktiven Aktionen (Löschen)
- **Skeleton Loader** für alle Loading States

### Listen & Tabellen
- **Pagination** für alle Listen (Leads, Sequenzen)
- **Bulk-Aktionen** (Mehrfachauswahl für Löschen, Sequenz zuweisen)
- **Suche** mit Echtzeit-Filterung
- **Filter** nach Status, Datum, etc.
- **Sortierung** (auf-/absteigend) für alle Spalten

### Editor (Sequenz-Builder)
- **Autosave** - Änderungen werden automatisch gespeichert
- **Undo/Redo** - Rückgängig machen von Änderungen
- Visuelle Feedback bei Speicherung

### Empty States
- Hilfreiche Texte wenn keine Daten vorhanden
- Call-to-Action Buttons (z.B. "Ersten Lead importieren")
- Illustrationen oder Icons für bessere UX

### Komponenten-Übersicht (shadcn/studio)
```
Benötigte Komponenten:
- Application Shell (Basis-Layout)
- Data Table (mit Pagination, Sorting, Filtering)
- Modal / Dialog (Import, Bestätigungen)
- Toast / Sonner (Benachrichtigungen)
- Tooltip (Hilfe-Texte)
- Breadcrumb (Navigation)
- Skeleton (Loading States)
- Form Components (Input, Select, Checkbox)
- Button (mit Varianten)
- Card (für Dashboard Metriken)
- Tabs (für Lead-Detail Ansicht)
- Rich Text Editor Integration (TipTap)
```

---

## Datenbank Schema (Prisma)

```prisma
model Lead {
  id            String       @id @default(cuid())
  email         String       @unique
  firstName     String
  customFields  Json?
  status        LeadStatus   @default(ACTIVE)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  sequenceStates SequenceState[]
  events         Event[]
}

enum LeadStatus {
  ACTIVE
  UNSUBSCRIBED
  BOUNCED
}

model Sequence {
  id          String        @id @default(cuid())
  name        String
  trigger     TriggerType
  isActive    Boolean       @default(false)
  createdAt   DateTime      @default(now())
  
  steps       SequenceStep[]
  states      SequenceState[]
}

enum TriggerType {
  ON_IMPORT
  MANUAL
  API_WEBHOOK
}

model SequenceStep {
  id          String   @id @default(cuid())
  sequenceId  String
  sequence    Sequence @relation(fields: [sequenceId], references: [id], onDelete: Cascade)
  order       Int
  type        StepType
  
  // E-Mail Content
  subject     String?
  content     Json?
  
  // Delay
  delayValue  Int?
  delayUnit   String?
  
  // A/B Testing
  variants    Json?
}

enum StepType {
  EMAIL
  DELAY
}

model SequenceState {
  id               String              @id @default(cuid())
  leadId           String
  lead             Lead                @relation(fields: [leadId], references: [id], onDelete: Cascade)
  sequenceId       String
  sequence         Sequence            @relation(fields: [sequenceId], references: [id], onDelete: Cascade)
  currentStepIndex Int                 @default(0)
  status           SequenceStateStatus @default(ACTIVE)
  nextRunAt        DateTime?
  
  @@unique([leadId, sequenceId])
}

enum SequenceStateStatus {
  ACTIVE
  COMPLETED
  STOPPED_BOUNCE
  UNSUBSCRIBED
}

model Event {
  id        String    @id @default(cuid())
  leadId    String
  lead      Lead      @relation(fields: [leadId], references: [id], onDelete: Cascade)
  type      EventType
  metadata  Json?
  createdAt DateTime  @default(now())
}

enum EventType {
  EMAIL_SENT
  EMAIL_OPENED
  EMAIL_CLICKED
  EMAIL_BOUNCED
  UNSUBSCRIBED
}
```

---

## Projektstruktur

```
/app
  /page.tsx                    # Dashboard
  /leads
    /page.tsx                  # Lead-Liste
    /[id]/page.tsx            # Lead-Detail + History
  /sequences
    /page.tsx                  # Sequenz-Liste
    /new/page.tsx             # Neue Sequenz
    /[id]/page.tsx            # Sequenz-Editor
  /api
    /leads/route.ts           # CRUD + Import
    /sequences/route.ts       # CRUD
    /send/route.ts            # E-Mail Versand
    /track
      /open/route.ts          # Open Tracking
      /click/route.ts         # Click Tracking
    /webhooks
      /resend/route.ts        # Bounce Handler
    /unsubscribe/route.ts     # Unsubscribe Handler
  /unsubscribe/page.tsx       # Unsubscribe Landing

/components
  /ui                         # shadcn/studio Komponenten
  /leads
    /import-modal.tsx
    /lead-table.tsx
  /sequences
    /step-editor.tsx
    /email-preview.tsx
    /tiptap-editor.tsx

/lib
  /db.ts                      # Prisma Client
  /resend.ts                  # Resend Client
  /tracking.ts                # Tracking Utils

/prisma
  /schema.prisma              # Datenbank Schema
```

---

## API Endpoints

### Leads
```
GET    /api/leads              # Alle Leads
POST   /api/leads              # Lead erstellen
POST   /api/leads/import       # CSV Import
GET    /api/leads/[id]         # Lead Details
PUT    /api/leads/[id]         # Lead aktualisieren
DELETE /api/leads/[id]         # Lead löschen
```

### Sequenzen
```
GET    /api/sequences          # Alle Sequenzen
POST   /api/sequences          # Sequenz erstellen
GET    /api/sequences/[id]     # Sequenz Details
PUT    /api/sequences/[id]     # Sequenz aktualisieren
DELETE /api/sequences/[id]     # Sequenz löschen
POST   /api/sequences/[id]/start  # Leads zur Sequenz hinzufügen
```

### Tracking
```
GET    /api/track/open         # Open Pixel
GET    /api/track/click        # Click Redirect
POST   /api/webhooks/resend    # Resend Bounce Webhook
POST   /api/unsubscribe        # Unsubscribe Handler
```

---

## Implementierungsreihenfolge

### Phase 1: Foundation
1. Next.js Projekt Setup
2. shadcn/studio Integration
3. Neon DB + Prisma Schema
4. Basis-Layout (Apple Style)

### Phase 2: Lead Management
5. Lead-Liste UI
6. CSV Import mit Mapping
7. API Endpoint für Leads
8. Duplikat-Handling + Meldung

### Phase 3: Sequenz-Builder
9. Sequenz-Liste + CRUD
10. Step-Editor mit TipTap
11. Delay-Konfiguration
12. E-Mail Vorschau + Test

### Phase 4: Versand & Tracking
13. Resend Integration
14. Tracking Endpoints (Open, Click)
15. Cron Job für Scheduling
16. Bounce Webhook Handler

### Phase 5: Analytics & Polish
17. Dashboard mit Metriken
18. Per-Lead Event History
19. Unsubscribe Flow
20. A/B Testing (optional)

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Resend
RESEND_API_KEY="re_..."
RESEND_DOMAIN="mail.deinedomain.de"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# shadcn/studio
EMAIL="your-email@example.com"
LICENSE_KEY="your-license-key"
```

---

## Setup-Schritte

### 1. Resend Domain einrichten
- Login auf resend.com
- Domain hinzufügen
- DNS Records (SPF, DKIM, DMARC) einrichten
- Webhook URL konfigurieren: `https://deinedomain.de/api/webhooks/resend`

### 2. Neon Database
- Projekt erstellen auf neon.tech
- Connection String kopieren
- In `.env` einfügen

### 3. Vercel Deployment
- Repository verbinden
- Environment Variables setzen
- Cron Jobs aktivieren (vercel.json)

### 4. shadcn/studio
- License Key in `.env`
- components.json mit Registries konfigurieren
- Unsplash Images in next.config.js erlauben

---

## shadcn/studio Konfiguration

### components.json
```json
{
  "registries": {
    "@ss-components": {
      "url": "https://shadcnstudio.com/r/components/{name}.json",
      "params": {
        "email": "${EMAIL}",
        "license_key": "${LICENSE_KEY}"
      }
    },
    "@ss-themes": {
      "url": "https://shadcnstudio.com/r/themes/{name}.json",
      "params": {
        "email": "${EMAIL}",
        "license_key": "${LICENSE_KEY}"
      }
    },
    "@ss-blocks": {
      "url": "https://shadcnstudio.com/r/blocks/{name}.json",
      "params": {
        "email": "${EMAIL}",
        "license_key": "${LICENSE_KEY}"
      }
    }
  }
}
```

### next.config.js
```js
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ],
  },
}
```
