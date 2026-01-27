# EsySync Newsletter Tool

E-Mail-Marketing-Automation mit Lead-Management, Sequenz-Builder und Tracking.

## Tech Stack
- Next.js 14 (App Router) + React 18
- PostgreSQL (Neon) + Prisma ORM
- Resend (E-Mail), shadcn/ui, TipTap, @dnd-kit

## Befehle
- `npm run dev -- -p 3001` - Entwicklungsserver (immer Port 3001!)
- `npm run build` - Production Build
- `npx prisma studio` - DB GUI
- `npx prisma db push` - Schema synchronisieren

## Entwicklung
- **Server immer auf Port 3001 starten** (`npm run dev -- -p 3001`)
- Bei neuer Session: Server selbständig starten

## Projektstruktur
```
src/
├── app/              # Pages + API Routes
│   ├── api/          # 29 API Endpoints
│   ├── leads/        # Lead-Verwaltung
│   ├── sequences/    # Sequenz-Builder
│   ├── settings/     # Einstellungen
│   └── forms/        # Signup-Formulare
├── components/       # React Components
│   ├── ui/           # shadcn/ui
│   └── ...           # Feature-Components
└── lib/              # Utilities, DB
```

## Datenbank-Modelle (Prisma)
- **Lead** (email, firstName, status, score)
- **Sequence** (name, trigger, steps)
- **SequenceStep** (EMAIL oder DELAY)
- **SequenceState** (Lead-Progress in Sequenz)
- **Event** (Tracking: SENT, OPENED, CLICKED, BOUNCED)
- **Settings**, **SignupForm**, **EmailLog**

## API-Struktur
- `/api/leads/*` - Lead CRUD + Import
- `/api/sequences/*` - Sequenz CRUD + Steps
- `/api/track/*` - Open/Click Tracking
- `/api/v1/*` - Public API (mit API-Key)
- `/api/esysync/*` - Externe DB Integration

## Konventionen
- Sprache: Deutsch (UI + Kommentare)
- API responses: `{ success, data/error }`
- Components: shadcn/ui Patterns
