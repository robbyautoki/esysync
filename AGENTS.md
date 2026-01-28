# EsySync Newsletter Tool

E-Mail-Marketing-Automation mit Lead-Management, Sequenz-Builder und Tracking.

## Build & Test

- Dev Server: `npm run dev -- -p 3001` (IMMER Port 3001!)
- Production Build: `npm run build`
- Type Check: Build prüft automatisch
- Prisma Studio: `npx prisma studio`
- Schema Push: `npx prisma db push`

## Architecture Overview

Next.js 14 App Router mit Prisma ORM und PostgreSQL (Neon).

```
src/
├── app/           # Pages + API Routes (29 Endpoints)
│   ├── api/       # REST API
│   ├── leads/     # Lead-Verwaltung
│   ├── sequences/ # Sequenz-Builder
│   ├── settings/  # Einstellungen
│   └── forms/     # Signup-Formulare
├── components/    # React Components (shadcn/ui)
│   ├── ui/        # Base Components
│   └── */         # Feature Components
└── lib/           # Utilities, DB Connection
```

Haupt-Entitäten: Lead, Sequence, SequenceStep, SequenceState, Event, Settings

## Git Workflow

- Branch: `master` (Production)
- Nach Änderungen: Direkt committen und pushen
- Commit Messages: `feat:`, `fix:`, `refactor:`, `chore:`
- Build MUSS grün sein vor Push

## Conventions & Patterns

**Sprache:**
- UI & Kommentare: Deutsch
- Code & Variablen: Englisch

**API Responses:**
```typescript
// Erfolg
{ success: true, data: ... }

// Fehler
{ success: false, error: "..." }
```

**Components:**
- shadcn/ui für alle UI Components
- TipTap für Rich Text Editor
- @dnd-kit für Drag & Drop
- Recharts für Charts

**Datenbank:**
- Prisma ORM mit PostgreSQL (Neon)
- Schema in `prisma/schema.prisma`
- Cascade Delete für Relations

## API Struktur

- `/api/leads/*` - Lead CRUD + Import
- `/api/sequences/*` - Sequenz CRUD + Steps + Tracking
- `/api/track/*` - Open/Click Tracking (Pixel)
- `/api/v1/*` - Public API (mit API-Key)
- `/api/esysync/*` - Externe DB Integration

## Gotchas

- Server IMMER auf Port 3001 (nicht 3000!)
- Resend für E-Mail-Versand (API Key in .env)
- Clerk für Authentication
- Bei Prisma Schema Änderungen: `npx prisma db push`
- `force-dynamic` bei API Routes die PUT/DELETE brauchen

## Don'ts

- Keine neuen npm packages ohne Erwähnung im Plan
- Keine Änderungen an .env Files
- Keine console.log in Production Code
- Keine unbenutzten Imports
- Keine any Types (außer bei externen APIs)

## Wichtige Dateien

- `src/app/api/cron/process-sequences/route.ts` - Haupt-Email-Versand
- `src/lib/warmup.ts` - Warmup-Limits
- `src/lib/resend.ts` - Resend Integration
- `prisma/schema.prisma` - Datenbank-Schema

## Step-Editor (Sequenz-Steps)

**Dokumentation:** `.factory/docs/step-editor.md`

Step-Typen: EMAIL, DELAY, TAG, SEGMENT

Relevante Dateien:
- `src/components/sequences/sequence-editor.tsx` - Haupt-Editor
- `src/components/sequences/step-card.tsx` - Step-Anzeige + Warnungen
- `src/lib/sequence-validation.ts` - Validierung beim Aktivieren
- `src/app/api/cron/process-sequences/route.ts` - Step-Ausführung

Bei neuen Step-Typen: Siehe Dokumentation für Checkliste!

## Häufige Tasks

- Neuer API Endpoint: `force-dynamic` bei PUT/DELETE
- Neue Seite: (dashboard) oder (public) Route Group?
- Token in URLs: IMMER base64url, nie base64

## Projekt-Wissen

Siehe `.factory/memories.md` für Architektur-Entscheidungen und bekannte Issues.
